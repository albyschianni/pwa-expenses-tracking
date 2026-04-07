import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5'
import { sendPushToUser } from '../_shared/push.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EB_API_BASE = 'https://api.enablebanking.com'
const EB_APP_ID = Deno.env.get('EB_APP_ID')!
const EB_PRIVATE_KEY = Deno.env.get('EB_PRIVATE_KEY')!

// ── JWT per Enable Banking API ──────────────────────────────

async function createEBJwt(): Promise<string> {
  const privateKey = await importPKCS8(EB_PRIVATE_KEY, 'RS256')

  return await new SignJWT({
    iss: 'enablebanking.com',
    aud: 'api.enablebanking.com',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT', kid: EB_APP_ID })
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey)
}

// ── Chiamata Enable Banking API ─────────────────────────────

async function ebFetch(
  path: string,
  options: { method?: string; body?: unknown; params?: Record<string, string> } = {},
): Promise<Response> {
  const jwt = await createEBJwt()
  const url = new URL(`${EB_API_BASE}${path}`)

  if (options.params) {
    for (const [k, v] of Object.entries(options.params)) {
      url.searchParams.set(k, v)
    }
  }

  const fetchOptions: RequestInit = {
    method: options.method || 'GET',
    headers: {
      'Authorization': `Bearer ${jwt}`,
      'Content-Type': 'application/json',
    },
  }

  if (options.body) {
    fetchOptions.body = JSON.stringify(options.body)
  }

  return await fetch(url.toString(), fetchOptions)
}

// ── Sync transazioni per una singola connessione ────────────

async function syncConnection(
  supabase: ReturnType<typeof createClient>,
  connection: {
    id: string
    user_id: string
    account_ids: string[]
    session_id: string
    last_sync_at: string | null
  },
): Promise<{ connectionId: string; imported: number; error?: string }> {
  let totalImported = 0

  for (const accountId of connection.account_ids) {
    const dateTo = new Date().toISOString().split('T')[0]

    // Finestre da provare in ordine: usa last_sync_at se disponibile,
    // altrimenti prova 11 mesi → 90 giorni → 30 giorni (fallback per banche
    // che limitano la finestra al periodo dalla data di consenso)
    const dateCandidates: string[] = connection.last_sync_at
      ? [new Date(connection.last_sync_at).toISOString().split('T')[0]]
      : (() => {
          const offsets = [11 * 30, 90, 30] // in giorni
          return offsets.map(days => {
            const d = new Date()
            d.setDate(d.getDate() - days)
            return d.toISOString().split('T')[0]
          })
        })()

    let allTransactions: any[] = []
    let fetchSucceeded = false
    let rateLimited = false

    for (const dateFrom of dateCandidates) {
      if (rateLimited) break

      let continuationKey: string | null = null
      let batchTransactions: any[] = []
      let accountError = false

      do {
        const params: Record<string, string> = {
          date_from: dateFrom,
          date_to: dateTo,
        }
        if (continuationKey) params.continuation_key = continuationKey

        const res = await ebFetch(`/accounts/${accountId}/transactions`, { params })

        if (!res.ok) {
          const errorText = await res.text()

          // Sessione scaduta → marca connessione come expired e interrompi tutto
          if (res.status === 401 || res.status === 403) {
            await supabase
              .from('bank_connections')
              .update({
                status: 'expired',
                updated_at: new Date().toISOString(),
              })
              .eq('id', connection.id)

            return {
              connectionId: connection.id,
              imported: totalImported,
              error: `Session expired (${res.status})`,
            }
          }

          // 429 = rate limit → non ha senso riprovare con finestra diversa
          if (res.status === 429) {
            console.log(`[account ${accountId}] rate limited by bank (429), skipping until tomorrow`)
            rateLimited = true
            accountError = true
            break
          }

          // 422 = periodo non supportato → prova finestra più corta
          if (res.status === 422 && !connection.last_sync_at) {
            console.log(`[account ${accountId}] 422 with dateFrom=${dateFrom}, trying shorter window...`)
            accountError = true
            break
          }

          // Altri errori: logga e passa al prossimo account
          console.error(`[account ${accountId}] API error ${res.status}: ${errorText}`)
          accountError = true
          break
        }

        const data = await res.json()
        const txBatch = data.transactions || []
        console.log(`[account ${accountId}] dateFrom=${dateFrom}: fetched ${txBatch.length} transactions (continuation: ${!!data.continuation_key})`)
        batchTransactions = batchTransactions.concat(txBatch)
        continuationKey = data.continuation_key || null
      } while (continuationKey)

      if (!accountError) {
        allTransactions = batchTransactions
        fetchSucceeded = true
        console.log(`[account ${accountId}] success with dateFrom=${dateFrom}, total: ${allTransactions.length}`)
        break
      }
    }

    if (!fetchSucceeded) {
      console.log(`[account ${accountId}] no transactions available (all date windows returned no data)`)
      continue
    }

    console.log(`[account ${accountId}] total fetched: ${allTransactions.length}`)

    // Per transazioni senza external_id (es. acquisti carta prepagata Fineco):
    // genera un ID sintetico stabile basato su data+importo+tipo+posizione nel giorno
    // In questo modo sono deduplicabili anche senza ID nativo dalla banca
    const syntheticCounters: Record<string, number> = {}
    const allTransactionsWithId = allTransactions.map((tx: any) => {
      if (tx.entry_reference || tx.transaction_id) return tx
      const base = `${tx.booking_date}_${tx.transaction_amount?.amount}_${tx.credit_debit_indicator}`
      const count = syntheticCounters[base] ?? 0
      syntheticCounters[base] = count + 1
      return { ...tx, _synthetic_id: `synthetic_${base}_${count}` }
    })

    // Trasforma e upsert
    const rows = allTransactionsWithId.map((tx: any) => ({
      user_id: connection.user_id,
      connection_id: connection.id,
      external_id: tx.entry_reference || tx.transaction_id || tx._synthetic_id || null,
      booking_date: tx.booking_date || null,
      value_date: tx.value_date || null,
      amount: Math.abs(parseFloat(tx.transaction_amount?.amount || '0')),
      currency: tx.transaction_amount?.currency || 'EUR',
      description: (tx.remittance_information || []).join(' ').trim() || null,
      counterpart_name: tx.credit_debit_indicator === 'DBIT'
        ? tx.creditor?.name || null
        : tx.debtor?.name || null,
      counterpart_iban: tx.credit_debit_indicator === 'DBIT'
        ? tx.creditor_account?.iban || null
        : tx.debtor_account?.iban || null,
      merchant_category_code: tx.merchant_category_code || null,
      bank_transaction_code: tx.bank_transaction_code || null,
      credit_debit_indicator: tx.credit_debit_indicator || null,
      status: tx.status || 'BOOK',
      raw_data: tx,
    }))

    if (rows.length > 0) {
      const { data: inserted, error } = await supabase
        .from('bank_transactions')
        .upsert(rows, {
          onConflict: 'connection_id,external_id',
          ignoreDuplicates: true,
        })
        .select('id')

      if (error) {
        console.error(`Error upserting transactions for connection ${connection.id}:`, error)
        return {
          connectionId: connection.id,
          imported: totalImported,
          error: `DB error: ${error.message}`,
        }
      }

      // Conta solo le righe effettivamente inserite (non i duplicati ignorati)
      totalImported += (inserted || []).length
    }
  }

  // Aggiorna last_sync_at solo se abbiamo effettivamente importato qualcosa
  // oppure se era già valorizzato (sync incrementale, non primo sync)
  // Così le connessioni nuove che ricevono 0 tx continuano a richiedere
  // la finestra completa (2 anni) finché l'EB non restituisce dati reali
  if (totalImported > 0 || connection.last_sync_at !== null) {
    await supabase
      .from('bank_connections')
      .update({
        last_sync_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', connection.id)
  } else {
    console.log(`Skipping last_sync_at update for connection ${connection.id} — no transactions received on first sync, will retry with full window`)
  }

  // Auto-categorizzazione a 2 fasi:
  // 1. Applica regole utente esistenti (istantaneo, gratis)
  // 2. Chiama classify-transactions per AI + smart detection (trasferimenti interni, etc.)
  let autoCategorized = 0
  let aiClassified = 0
  let internalTransfers = 0

  // Fase 1: Regole utente (sempre — anche se nessuna nuova tx, applica regole a quelle già in DB)
  const { data: rpcResult, error: rpcError } = await supabase
    .rpc('apply_categorization_rules', { p_user_id: connection.user_id })

  if (rpcError) {
    console.error(`Auto-categorization error for user ${connection.user_id}:`, rpcError)
  } else {
    autoCategorized = rpcResult || 0
    if (autoCategorized > 0) {
      console.log(`Rules-categorized ${autoCategorized} transactions for user ${connection.user_id}`)
    }
  }

  // Fase 2: AI classification + smart detection (sempre)
  try {
    const classifyRes = await fetch(
      `${Deno.env.get('SUPABASE_URL')!}/functions/v1/classify-transactions`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: connection.user_id }),
      },
    )

    if (classifyRes.ok) {
      const classifyData = await classifyRes.json()
      aiClassified = classifyData.ai_classified || 0
      internalTransfers = classifyData.internal_transfers || 0
      autoCategorized += classifyData.deterministic || 0
      console.log(`AI classified: ${aiClassified}, internal transfers: ${internalTransfers}, deterministic: ${classifyData.deterministic || 0}`)
    } else {
      console.error(`classify-transactions error: ${classifyRes.status} ${await classifyRes.text()}`)
    }
  } catch (classifyErr) {
    console.error('classify-transactions call failed:', classifyErr)
  }

  return {
    connectionId: connection.id,
    imported: totalImported,
    autoCategorized: autoCategorized + aiClassified,
    internalTransfers,
  }
}

// ── Handler principale ──────────────────────────────────────
// Chiamato da pg_cron o manualmente con service_role_key

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Questa funzione usa service_role_key (chiamata da pg_cron o admin)
    // oppure il token utente per sync manuale di un singolo utente
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    // Determina se è un sync globale (pg_cron) o per singolo utente
    let userId: string | null = null
    try {
      const body = await req.json()
      userId = body.user_id || null
    } catch {
      // No body = sync globale (tutte le connessioni attive)
    }

    // Query connessioni attive
    let query = supabase
      .from('bank_connections')
      .select('id, user_id, account_ids, session_id, last_sync_at')
      .eq('status', 'active')
      .not('session_id', 'is', null)
      .not('account_ids', 'is', null)

    if (userId) {
      query = query.eq('user_id', userId)
    }

    const { data: connections, error: queryError } = await query

    if (queryError) {
      throw new Error(`Failed to fetch connections: ${queryError.message}`)
    }

    if (!connections || connections.length === 0) {
      return new Response(JSON.stringify({
        message: 'No active connections to sync',
        synced: 0,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Sync sequenziale per ogni connessione
    const results = []
    for (const conn of connections) {
      const result = await syncConnection(supabase, conn)
      results.push(result)
      console.log(`Synced connection ${conn.id}: ${result.imported} transactions${result.error ? ` (error: ${result.error})` : ''}`)
    }

    const totalImported = results.reduce((sum, r) => sum + r.imported, 0)
    const totalAutoCategorized = results.reduce((sum, r) => sum + (r.autoCategorized || 0), 0)
    const errors = results.filter(r => r.error)

    // Push notification per ogni utente con nuove transazioni
    if (totalImported > 0) {
      const userIds = [...new Set(connections.map(c => c.user_id))]
      for (const uid of userIds) {
        const userImported = results
          .filter(r => connections.find(c => c.id === r.connectionId)?.user_id === uid)
          .reduce((sum, r) => sum + r.imported, 0)

        if (userImported > 0) {
          const userAutoCat = results
            .filter(r => connections.find(c => c.id === r.connectionId)?.user_id === uid)
            .reduce((sum, r) => sum + (r.autoCategorized || 0), 0)

          const body = userAutoCat > 0
            ? `${userImported} nuove transazioni (${userAutoCat} categorizzate automaticamente)`
            : `${userImported} nuove transazioni dalla banca`

          try {
            await sendPushToUser(supabase, uid, {
              title: 'Sync bancario',
              body,
              data: { type: 'bank_sync', tab: 'home' },
            })
          } catch (pushErr) {
            console.warn(`Push notification error for user ${uid}:`, pushErr)
          }
        }
      }
    }

    return new Response(JSON.stringify({
      synced: connections.length,
      total_imported: totalImported,
      total_auto_categorized: totalAutoCategorized,
      errors: errors.length > 0 ? errors : undefined,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

  } catch (err) {
    console.error('Banking sync error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
