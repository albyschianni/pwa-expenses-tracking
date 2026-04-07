import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!

// ══════════════════════════════════════════════════════════════
// LIMITI DI SICUREZZA — Protezione costi API Anthropic
// ══════════════════════════════════════════════════════════════

const LIMITS = {
  // Max chiamate AI per singolo utente al giorno
  // Primo sync (3 mesi storico) può generare ~300 tx = 15 batch
  // Uso normale: 1-3 chiamate/giorno. Margine largo per non bloccare mai.
  MAX_AI_CALLS_PER_USER_PER_DAY: 50,

  // Max chiamate AI globali (tutti gli utenti) al giorno
  // Con 50 utenti attivi = 50 sync/giorno in media → margine 10x
  MAX_AI_CALLS_GLOBAL_PER_DAY: 500,

  // Max transazioni processabili per singola invocazione della funzione
  MAX_TRANSACTIONS_PER_INVOCATION: 200,

  // Max transazioni per singolo batch AI (una chiamata Anthropic)
  MAX_BATCH_SIZE: 20,

  // Max tokens nella risposta AI (limita costo per chiamata)
  MAX_TOKENS_PER_AI_CALL: 1024,

  // Confidence minima per assegnare categoria specifica
  MIN_CONFIDENCE: 0.5,
  // Sotto questa soglia → "Altro" invece di lasciare null
  MIN_CONFIDENCE_FALLBACK: 0.35,

  // Confidence minima per creare regola automatica
  MIN_CONFIDENCE_FOR_RULE: 0.85,
}

// ── Rate limiting con tabella DB ─────────────────────────────

async function checkAndIncrementRateLimit(
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<{ allowed: boolean; reason?: string }> {
  const today = new Date().toISOString().split('T')[0]

  // Check limite per utente
  const { data: userUsage } = await supabase
    .from('ai_usage_log')
    .select('ai_calls')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  const userCalls = userUsage?.ai_calls || 0

  if (userCalls >= LIMITS.MAX_AI_CALLS_PER_USER_PER_DAY) {
    console.log(`AI rate limit reached for user ${userId}: ${userCalls}/${LIMITS.MAX_AI_CALLS_PER_USER_PER_DAY} calls today`)
    return {
      allowed: false,
      reason: `Limite giornaliero AI raggiunto (${LIMITS.MAX_AI_CALLS_PER_USER_PER_DAY} chiamate/giorno). Le transazioni verranno classificate domani.`,
    }
  }

  // Check limite globale
  const { data: globalUsage } = await supabase
    .from('ai_usage_log')
    .select('ai_calls')
    .eq('date', today)

  const globalCalls = (globalUsage || []).reduce((sum: number, row: any) => sum + (row.ai_calls || 0), 0)

  if (globalCalls >= LIMITS.MAX_AI_CALLS_GLOBAL_PER_DAY) {
    console.log(`AI global rate limit reached: ${globalCalls}/${LIMITS.MAX_AI_CALLS_GLOBAL_PER_DAY} calls today`)
    return {
      allowed: false,
      reason: 'Limite giornaliero globale AI raggiunto. Riprovare domani.',
    }
  }

  return { allowed: true }
}

async function logAIUsage(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  inputTokens: number,
  outputTokens: number,
  transactionsClassified: number,
): Promise<void> {
  const today = new Date().toISOString().split('T')[0]

  // Upsert: incrementa contatori se riga esiste, altrimenti crea
  const { data: existing } = await supabase
    .from('ai_usage_log')
    .select('id, ai_calls, total_input_tokens, total_output_tokens, transactions_classified')
    .eq('user_id', userId)
    .eq('date', today)
    .single()

  if (existing) {
    await supabase
      .from('ai_usage_log')
      .update({
        ai_calls: (existing.ai_calls || 0) + 1,
        total_input_tokens: (existing.total_input_tokens || 0) + inputTokens,
        total_output_tokens: (existing.total_output_tokens || 0) + outputTokens,
        transactions_classified: (existing.transactions_classified || 0) + transactionsClassified,
        updated_at: new Date().toISOString(),
      })
      .eq('id', existing.id)
  } else {
    await supabase
      .from('ai_usage_log')
      .insert({
        user_id: userId,
        date: today,
        ai_calls: 1,
        total_input_tokens: inputTokens,
        total_output_tokens: outputTokens,
        transactions_classified: transactionsClassified,
      })
  }
}

// ══════════════════════════════════════════════════════════════
// RILEVAMENTO TRASFERIMENTI INTERNI (deterministico, no AI)
// ══════════════════════════════════════════════════════════════

interface BankTransaction {
  id: string
  user_id: string
  description: string | null
  counterpart_name: string | null
  counterpart_iban: string | null
  amount: number
  credit_debit_indicator: string | null
  bank_transaction_code: { code?: string; sub_code?: string } | null
  merchant_category_code: string | null
  category_id: string | null
  raw_data: any
}

const INTERNAL_TRANSFER_PATTERNS = {
  bankCodes: [
    /giroconto/i,
    /trasferimento/i,
    /ricarica\s*carta/i,
    /ricarica\s*prepagata/i,
    /ricarica\s*conto/i,
    /internal\s*transfer/i,
    /own\s*account/i,
  ],
  descriptions: [
    /giroconto/i,
    /ricarica\s*(carta|prepagata|conto)/i,
    /trasferimento\s*(tra|interno|su)\s*(conti|conto)/i,
    /vers\.\s*su\s*carta/i,
    /accredito\s*da\s*conto/i,
    /bonifico\s*a\s*favore\s*proprio/i,
    /revolut\*+\d+\*\s*(dublin|ireland|ie)/i,                          // Visa Debit Fineco → Revolut card
    /revolut\s+(payments\s+uab|bank\s+uab|ltd|limited).*\b(vilnius|lt|london|gb|uk|dublin|ie)\b/i, // bonifico diretto a Revolut entity
    /n26\s*(gmbh|bank|se)/i,                                            // bonifico verso proprio conto N26
    /wise\s*(europe|payments|asia|ltd)/i,                               // bonifico verso proprio conto Wise
    /hype\s*(s\.?p\.?a\.?|srl|ricarica)/i,                             // ricarica HYPE da altro conto
    /flowe\s*(s\.?p\.?a\.?|ricarica)/i,                                 // ricarica Flowe
    /tinaba/i,                                                          // trasferimento Tinaba
    /buddybank/i,                                                       // trasferimento BuddyBank
    /PMNT-ICDT-BOOK/i,                                                  // N26 ISO 20022: internal book transfer
  ],
}

const BANK_FEE_PATTERNS = {
  bankCodes: [
    /commissione/i,
    /canone/i,
    /imposta\s*di\s*bollo/i,
    /spese\s*di\s*tenuta/i,
  ],
  descriptions: [
    /commissione/i,
    /canone\s*(mensile|trimestrale|annuo)/i,
    /imposta\s*di\s*bollo/i,
    /spese\s*(tenuta|gestione)\s*conto/i,
    /interessi\s*(passivi|debitori)/i,
  ],
}

function detectInternalTransfer(tx: BankTransaction, userIbans: string[]): boolean {
  const bankCode = tx.bank_transaction_code?.code || ''
  const desc = tx.description || ''

  if (INTERNAL_TRANSFER_PATTERNS.bankCodes.some(p => p.test(bankCode))) return true
  if (INTERNAL_TRANSFER_PATTERNS.descriptions.some(p => p.test(desc))) return true

  if (tx.counterpart_iban && userIbans.length > 0) {
    if (userIbans.includes(tx.counterpart_iban.toUpperCase())) return true
  }

  if (tx.raw_data?.creditor?.name && tx.raw_data?.debtor?.name) {
    const creditor = tx.raw_data.creditor.name.toLowerCase().trim()
    const debtor = tx.raw_data.debtor.name.toLowerCase().trim()
    if (creditor === debtor) return true
  }

  return false
}

// Transazioni carta prepagata: raw_data senza entry_reference, transaction_id, remittance vuota o solo 'transazione'
// Fineco non manda dati utili per questi acquisti → non ha senso chiamare l'AI
function isEmptyCardTransaction(tx: BankTransaction): boolean {
  const raw = tx.raw_data
  if (!raw) return false
  const noRef = !raw.entry_reference && !raw.transaction_id
  // Remittance è vuota O contiene solo la parola 'transazione' (non informativa)
  const remittanceText = Array.isArray(raw.remittance_information)
    ? raw.remittance_information.join(' ').trim().toLowerCase()
    : ''
  const noRemittance = remittanceText === '' || remittanceText === 'transazione'
  const noCounterpart = !tx.counterpart_name && !tx.counterpart_iban
  const noDescription = !tx.description || tx.description.toLowerCase().trim() === 'transazione'
  return noRef && noRemittance && noCounterpart && noDescription
}

function detectBankFee(tx: BankTransaction): boolean {
  const bankCode = tx.bank_transaction_code?.code || ''
  const desc = tx.description || ''

  if (BANK_FEE_PATTERNS.bankCodes.some(p => p.test(bankCode))) return true
  if (BANK_FEE_PATTERNS.descriptions.some(p => p.test(desc))) return true

  return false
}

// ══════════════════════════════════════════════════════════════
// MCC MAPPING (Layer 0 — se presente, gratis e affidabile)
// ══════════════════════════════════════════════════════════════

const MCC_CATEGORY_MAP: Record<string, string> = {
  // Supermercati / alimentari
  '5411': 'Spesa', '5412': 'Spesa', '5422': 'Spesa', '5441': 'Spesa',
  '5451': 'Spesa', '5462': 'Spesa', '5499': 'Spesa',
  // Ristoranti / bar / fast food
  '5812': 'Ristoranti', '5813': 'Ristoranti', '5814': 'Ristoranti',
  // Carburante
  '5541': 'Trasporti', '5542': 'Trasporti',
  // Trasporti pubblici / taxi / parcheggio / pedaggi
  '4111': 'Trasporti', '4121': 'Trasporti', '4131': 'Trasporti',
  '4784': 'Trasporti', '7521': 'Trasporti', '7523': 'Trasporti',
  // Farmacie / salute
  '5912': 'Salute', '5975': 'Salute',
  '8011': 'Salute', '8021': 'Salute', '8049': 'Salute', '8099': 'Salute',
  // Abbonamenti / digitale / telecom
  '5815': 'Abbonamenti', '5816': 'Abbonamenti', '5817': 'Abbonamenti', '5818': 'Abbonamenti',
  '4814': 'Abbonamenti', '4899': 'Abbonamenti',
  // Elettronica
  '5734': 'Elettronica', '5045': 'Elettronica', '5065': 'Elettronica',
  // Shopping / abbigliamento / varie
  '5310': 'Shopping', '5311': 'Shopping', '5331': 'Shopping',
  '5651': 'Shopping', '5661': 'Shopping', '5691': 'Shopping', '5699': 'Shopping',
  '5621': 'Shopping', '5945': 'Shopping', '5999': 'Shopping',
  // Casa / fai da te
  '5200': 'Casa', '5251': 'Casa', '5712': 'Casa', '5719': 'Casa',
  // Viaggi / hotel / voli
  '7011': 'Viaggi', '4722': 'Viaggi', '4112': 'Viaggi',
  '3000': 'Viaggi', '3001': 'Viaggi', '3002': 'Viaggi', // airline MCCs
}

function mccCategory(tx: BankTransaction): string | null {
  if (!tx.merchant_category_code) return null
  return MCC_CATEGORY_MAP[tx.merchant_category_code] || null
}

// ══════════════════════════════════════════════════════════════
// CATEGORIZZAZIONE DETERMINISTICA (Layer 0)
// ══════════════════════════════════════════════════════════════

function deterministicCategory(tx: BankTransaction): string | null {
  const bankCode = (tx.bank_transaction_code?.code || '').toLowerCase()
  // Controlla sia description che counterpart_name (es. Revolut manda il merchant in creditor.name)
  const desc = tx.description || ''
  const counterpart = tx.counterpart_name || ''
  const text = [desc, counterpart].filter(Boolean).join(' ')

  // Stipendio (bankCode o testo)
  if (/stipendio|cedolino|salary|payroll/.test(bankCode)) return 'Stipendio'
  if (/stipendio|cedolino/i.test(text)) return 'Stipendio'

  // Supermercati italiani noti
  if (/esselunga|il\s*mio\s*gigante|migross|coop\b|conad|lidl|aldi|eurospin|penny\s*market|pam\b|carrefour|iper\b|simply\b|dok\b|bennet\b|famila|despar|interspar|a&o\b|galassia|in's\s*mercato|tigre\b|md\s*discount|vegé\b|sisa\b/i.test(text)) return 'Spesa'

  // Farmacie
  if (/\bfarmacia\b|\bfarmacie\b/i.test(text)) return 'Salute'

  // Carburante / stazioni di servizio
  if (/\beni\b|agip\b|\bq8\b|tamoil|totalerg|\bapi\b|\bip\b\s|carburante|stazione\s*(di\s*servizio)|distributore|benzina|diesel/i.test(text)) return 'Trasporti'

  // Pedaggi / parcheggi
  if (/autostrade\s*(per|d'italia)?|telepass|\bparcheggio\b|\bparking\b/i.test(text)) return 'Trasporti'

  // Trasporti pubblici italiani + ride sharing internazionali
  if (/trenitalia|italotreno|\batm\s*milano\b|\batac\b|trenord|frecciarossa|frecciargento|\buber\b|\bfree\s*now\b|\bblablacar\b/i.test(text)) return 'Trasporti'

  // Fast food / ristoranti noti
  if (/mc\s*donald|burger\s*king|\bkfc\b|\bsubway\b|pizza\s*hut|domino'?s|\bjust\s*eat\b|\bdeliveroo\b|\buber\s*eats\b|glovo/i.test(text)) return 'Ristoranti'

  // Abbonamenti digitali noti (inclusi servizi AI e cloud)
  if (/netflix|spotify|amazon\s*prime|disney\s*\+|apple\.com\/bill|google\s*(play|storage|one)|youtube\s*premium|dazn\b|anthropic|openai|chatgpt|microsoft\s*365|adobe/i.test(text)) return 'Abbonamenti'

  // Telecom italiani
  if (/wind\s*tre|tim\s*(s\.?p\.?a\.?)?|vodafone|iliad|fastweb|tiscali|sky\s*(italia)?/i.test(text)) return 'Abbonamenti'

  // E-commerce noti
  if (/\bamazon\b(?!\s*prime)|\bzalando\b|\bshein\b|\basos\b|\bzara\b/i.test(text)) return 'Shopping'

  return null
}

// ══════════════════════════════════════════════════════════════
// CLASSIFICAZIONE AI (Claude Haiku) — con tracking token
// ══════════════════════════════════════════════════════════════

interface AICallResult {
  classifications: Map<string, { categoryId: string; confidence: number }>
  inputTokens: number
  outputTokens: number
}

async function classifyWithAI(
  transactions: BankTransaction[],
  categories: { id: string; label: string; type: string }[],
): Promise<AICallResult> {
  const result: AICallResult = {
    classifications: new Map(),
    inputTokens: 0,
    outputTokens: 0,
  }

  if (transactions.length === 0) return result

  const expenseCategories = categories.filter(c => c.type === 'expense')
  const incomeCategories = categories.filter(c => c.type === 'income')

  const categoryList = [
    '## Categorie Spesa:',
    ...expenseCategories.map(c => `- "${c.id}" (${c.label})`),
    '',
    '## Categorie Entrata:',
    ...incomeCategories.map(c => `- "${c.id}" (${c.label})`),
  ].join('\n')

  const txList = transactions.map((tx, i) => {
    // counterpart_name è il merchant pulito (es. Revolut → "Anthropic")
    // description è il testo grezzo remittance (es. HYPE → "PAGAMENTO PRESSO APPLE.COM/BILL CORK")
    const merchant = tx.counterpart_name?.trim()
      || extractMerchantName(tx.description || '')
      || tx.description
      || 'N/A'
    const parts = [
      `${i + 1}.`,
      `Tipo: ${tx.credit_debit_indicator === 'CRDT' ? 'ENTRATA' : 'SPESA'}`,
      `Importo: €${tx.amount}`,
      `Merchant: "${merchant}"`,
    ]
    if (tx.merchant_category_code) parts.push(`MCC: ${tx.merchant_category_code}`)
    return parts.join(' | ')
  }).join('\n')

  const prompt = `Sei un classificatore di transazioni bancarie per un'app italiana di gestione spese personali.

Per ogni transazione, assegna la categoria più appropriata dalla lista fornita.

${categoryList}

REGOLE:
- Se la transazione è un'ENTRATA usa solo categorie Entrata
- Se la transazione è una SPESA usa solo categorie Spesa
- Analizza la descrizione per riconoscere merchant italiani e internazionali
- "confidence" va da 0.0 a 1.0 — se non sei sicuro metti sotto 0.5
- Rispondi SOLO con un array JSON, niente altro testo

Transazioni da classificare:
${txList}

Rispondi con JSON array:
[{"index": 1, "category_id": "...", "confidence": 0.95}, ...]`

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: LIMITS.MAX_TOKENS_PER_AI_CALL,
        messages: [{
          role: 'user',
          content: prompt,
        }],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error(`Anthropic API error: ${response.status} ${errText}`)
      return result
    }

    const data = await response.json()

    // Traccia token usati dalla risposta Anthropic
    result.inputTokens = data.usage?.input_tokens || 0
    result.outputTokens = data.usage?.output_tokens || 0

    const text = data.content?.[0]?.text || ''

    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) {
      console.error('No JSON array found in AI response:', text)
      return result
    }

    const parsed = JSON.parse(jsonMatch[0])
    const validCategoryIds = new Set(categories.map(c => c.id))

    for (const item of parsed) {
      const idx = item.index - 1
      if (idx >= 0 && idx < transactions.length && validCategoryIds.has(item.category_id)) {
        result.classifications.set(transactions[idx].id, {
          categoryId: item.category_id,
          confidence: item.confidence || 0,
        })
      }
    }
  } catch (err) {
    console.error('AI classification error:', err)
  }

  return result
}

// ══════════════════════════════════════════════════════════════
// HANDLER PRINCIPALE
// ══════════════════════════════════════════════════════════════

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    let userId: string
    let transactionIds: string[] | null = null

    try {
      const body = await req.json()
      userId = body.user_id
      transactionIds = body.transaction_ids || null
    } catch {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!userId) {
      return new Response(JSON.stringify({ error: 'user_id required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // 1. Recupera categorie utente
    const { data: categoriesData } = await supabase
      .from('categories')
      .select('id, label, transaction_type')
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .eq('is_active', true)

    const categories = (categoriesData || []).map(c => ({
      id: c.id,
      label: c.label,
      type: c.transaction_type,
    }))

    // 2. Recupera transazioni non categorizzate (con cap di sicurezza)
    let txQuery = supabase
      .from('bank_transactions')
      .select('id, user_id, description, counterpart_name, counterpart_iban, amount, credit_debit_indicator, bank_transaction_code, merchant_category_code, category_id, raw_data')
      .eq('user_id', userId)
      .is('category_id', null)
      .eq('is_internal_transfer', false)
      .limit(LIMITS.MAX_TRANSACTIONS_PER_INVOCATION)

    if (transactionIds) {
      txQuery = txQuery.in('id', transactionIds)
    }

    const { data: transactions, error: txError } = await txQuery

    if (txError) {
      throw new Error(`Failed to fetch transactions: ${txError.message}`)
    }

    if (!transactions || transactions.length === 0) {
      return new Response(JSON.stringify({
        classified: 0,
        internal_transfers: 0,
        message: 'No uncategorized transactions',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // 3. Recupera IBAN utente per detect trasferimenti interni
    // Fonte 1: account_ids delle connessioni bancarie attive → leggi IBAN da tutte le tx storiche
    const userIbans: string[] = []

    // Fonte 2: IBAN dai debtor_account/creditor_account nelle transazioni del batch
    for (const tx of transactions) {
      if (tx.credit_debit_indicator === 'CRDT' && tx.raw_data?.creditor_account?.iban) {
        const normalized = tx.raw_data.creditor_account.iban.toUpperCase()
        if (!userIbans.includes(normalized)) userIbans.push(normalized)
      }
      if (tx.raw_data?.debtor_account?.iban) {
        const normalized = tx.raw_data.debtor_account.iban.toUpperCase()
        if (!userIbans.includes(normalized)) userIbans.push(normalized)
      }
    }

    // Fonte 3: IBAN da tutte le transazioni storiche dell'utente (copre conti aggiunti in passato)
    const { data: historicalIbans } = await supabase
      .from('bank_transactions')
      .select('raw_data')
      .eq('user_id', userId)
      .not('raw_data->debtor_account->iban', 'is', null)
      .limit(100)

    for (const row of historicalIbans || []) {
      const iban = row.raw_data?.debtor_account?.iban
      if (iban) {
        const normalized = iban.toUpperCase()
        if (!userIbans.includes(normalized)) userIbans.push(normalized)
      }
    }

    // 4. Fase deterministica (GRATIS — nessun limite)
    const toClassifyWithAI: BankTransaction[] = []
    let internalTransfers = 0
    let deterministicClassified = 0
    const updates: { id: string; data: Record<string, any> }[] = []

    for (const tx of transactions) {
      if (detectInternalTransfer(tx, userIbans)) {
        updates.push({
          id: tx.id,
          data: { is_internal_transfer: true, reviewed: true },
        })
        internalTransfers++
        continue
      }

      if (detectBankFee(tx)) {
        updates.push({
          id: tx.id,
          data: {
            category_id: 'Bollette',
            categorization_source: 'system',
            reviewed: false,
          },
        })
        deterministicClassified++
        continue
      }

      // MCC lookup (se disponibile, più affidabile del testo)
      const mccCat = mccCategory(tx)
      if (mccCat) {
        updates.push({
          id: tx.id,
          data: {
            category_id: mccCat,
            categorization_source: 'system',
            reviewed: false,
          },
        })
        deterministicClassified++
        continue
      }

      const detCategory = deterministicCategory(tx)
      if (detCategory) {
        updates.push({
          id: tx.id,
          data: {
            category_id: detCategory,
            categorization_source: 'system',
            reviewed: false,
          },
        })
        deterministicClassified++
        continue
      }

      // Transazioni carta prepagata senza dati utili → "Altro" (non vale la pena chiamare AI)
      if (isEmptyCardTransaction(tx)) {
        updates.push({
          id: tx.id,
          data: {
            category_id: 'Altro',
            categorization_source: 'system',
            reviewed: false,
          },
        })
        deterministicClassified++
        continue
      }

      toClassifyWithAI.push(tx)
    }

    // 5. Fase AI (CON LIMITI)
    let aiClassified = 0
    let totalInputTokens = 0
    let totalOutputTokens = 0
    let rateLimitHit = false

    if (toClassifyWithAI.length > 0) {
      // ── CHECK RATE LIMIT prima di chiamare AI ──
      const rateCheck = await checkAndIncrementRateLimit(supabase, userId)

      if (!rateCheck.allowed) {
        rateLimitHit = true
        console.log(`AI skipped for user ${userId}: ${rateCheck.reason}`)
      } else {
        // Procedi con AI — batch di max BATCH_SIZE
        for (let i = 0; i < toClassifyWithAI.length; i += LIMITS.MAX_BATCH_SIZE) {
          const batch = toClassifyWithAI.slice(i, i + LIMITS.MAX_BATCH_SIZE)
          const aiResult = await classifyWithAI(batch, categories)

          totalInputTokens += aiResult.inputTokens
          totalOutputTokens += aiResult.outputTokens

          // Transazioni per cui l'AI non ha dato nessun risultato → fallback "Altro"
          const classifiedIds = new Set(aiResult.classifications.keys())
          for (const tx of batch) {
            if (!classifiedIds.has(tx.id)) {
              updates.push({
                id: tx.id,
                data: { category_id: 'Altro', categorization_source: 'ai_fallback', reviewed: false },
              })
              aiClassified++
            }
          }

          for (const [txId, classification] of aiResult.classifications) {
            if (classification.confidence >= LIMITS.MIN_CONFIDENCE) {
              updates.push({
                id: txId,
                data: {
                  category_id: classification.categoryId,
                  categorization_source: 'ai',
                  reviewed: false,
                },
              })
              aiClassified++

              // Auto-crea regola se confidence alta
              if (classification.confidence >= LIMITS.MIN_CONFIDENCE_FOR_RULE) {
                const tx = toClassifyWithAI.find(t => t.id === txId)
                if (tx) {
                  const merchantName = bestMerchantKey(tx)
                  if (merchantName && merchantName.length >= 3) {
                    await supabase
                      .from('categorization_rules')
                      .upsert({
                        user_id: userId,
                        match_field: 'description',
                        match_value: merchantName.toUpperCase(),
                        match_type: 'contains',
                        category_id: classification.categoryId,
                        priority: 10,
                        usage_count: 1,
                      }, {
                        onConflict: 'user_id,match_value,match_field',
                      })
                  }
                }
              }
            } else if (classification.confidence >= LIMITS.MIN_CONFIDENCE_FALLBACK) {
              // Confidence bassa → assegna comunque ma segnala come low_confidence
              updates.push({
                id: txId,
                data: { category_id: classification.categoryId, categorization_source: 'ai_low_confidence', reviewed: false },
              })
              aiClassified++
            }
          }
        }

        // ── LOG UTILIZZO AI ──
        await logAIUsage(supabase, userId, totalInputTokens, totalOutputTokens, aiClassified)
      }
    }

    // 6. Applica tutti gli update al DB
    for (const update of updates) {
      await supabase
        .from('bank_transactions')
        .update(update.data)
        .eq('id', update.id)
    }

    const totalClassified = deterministicClassified + aiClassified

    return new Response(JSON.stringify({
      total_processed: transactions.length,
      classified: totalClassified,
      deterministic: deterministicClassified,
      ai_classified: aiClassified,
      internal_transfers: internalTransfers,
      remaining: toClassifyWithAI.length - aiClassified,
      rate_limit_hit: rateLimitHit,
      tokens_used: { input: totalInputTokens, output: totalOutputTokens },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Classification error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

// ══════════════════════════════════════════════════════════════
// UTILITY
// ══════════════════════════════════════════════════════════════

function extractMerchantName(description: string): string | null {
  if (!description) return null

  let cleaned = description

  // Fineco: boilerplate specifico
  cleaned = cleaned.replace(/Carta\s*N\.\s*\*+\s*\d+/gi, '')
  cleaned = cleaned.replace(/Data\s*operazione\s*\d{2}\/\d{2}\/\d{2,4}/gi, '')
  cleaned = cleaned.replace(/Data\s*accredito:\s*\d{2}\/\d{2}\/\d{4}/gi, '')
  cleaned = cleaned.replace(/Dt-ord:\s*\d{2}\/\d{2}\/\d{4}/gi, '')
  cleaned = cleaned.replace(/Banca\s*(ordinante|Ord):\s*[A-Z\s.]+/gi, '')
  cleaned = cleaned.replace(/Causale:\s*/gi, '')
  cleaned = cleaned.replace(/Info-Cli:\s*/gi, '')
  cleaned = cleaned.replace(/Ord:\s*[A-Z\s.]+\s*Ben:\s*/gi, '')

  // HYPE: prefisso generico su acquisti carta
  cleaned = cleaned.replace(/^PAGAMENTO\s+PRESSO\s+/i, '')

  // CBI Globe (Intesa, BNL, Mediolanum, Widiba, Postepay): prefissi POS standard
  cleaned = cleaned.replace(/^PAGAMENTO\s+POS\s*[-–]\s*/i, '')
  cleaned = cleaned.replace(/^ACQUISTO\s+POS\s+(MASTERCARD|VISA|MAESTRO)\s*/i, '')
  cleaned = cleaned.replace(/^PAGAMENTO\s+CON\s+CARTA\s+PRESSO\s+/i, '')
  cleaned = cleaned.replace(/^ACQUISTO\s+CARTA\s+/i, '')
  cleaned = cleaned.replace(/^POS\s+/i, '')

  // UniCredit: data operazione in coda (es. "MERCHANT 07/04/26")
  cleaned = cleaned.replace(/\s+\d{2}\/\d{2}\/\d{2,4}\s*$/, '')

  // Generico: rimuove numeri carta, IBAN, sequenze numeriche lunghe
  cleaned = cleaned.replace(/\*\d+/g, '')
  cleaned = cleaned.replace(/\\\s*\\/g, ' ')
  cleaned = cleaned.replace(/\b[A-Z]{2}\d{2}[A-Z\d]{10,30}\b/g, '')
  cleaned = cleaned.replace(/\b\d{10,}\b/g, '')

  cleaned = cleaned.trim()

  // Rimuove codice paese finale (es. "Merchant Name IE" → "Merchant Name")
  const countryMatch = cleaned.match(/^(.+?)\s+[A-Z]{2}\s*$/)
  if (countryMatch) {
    cleaned = countryMatch[1].trim()
  }

  cleaned = cleaned.replace(/\s+/g, ' ').trim()

  if (cleaned.length < 3 || cleaned.length > 100) return null

  return cleaned
}

// Restituisce il miglior identificatore merchant per regole/AI:
// preferisce counterpart_name (pulito, strutturato) su description estratta
function bestMerchantKey(tx: BankTransaction): string | null {
  if (tx.counterpart_name && tx.counterpart_name.trim().length >= 3) {
    return tx.counterpart_name.trim()
  }
  return extractMerchantName(tx.description || '')
}
