import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { SignJWT, importPKCS8 } from 'https://esm.sh/jose@5'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const EB_API_BASE = 'https://api.enablebanking.com'
const EB_APP_ID = Deno.env.get('EB_APP_ID')!
const EB_PRIVATE_KEY = Deno.env.get('EB_PRIVATE_KEY')!
const EB_REDIRECT_URL = Deno.env.get('EB_REDIRECT_URL')!

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

  const res = await fetch(url.toString(), fetchOptions)

  if (!res.ok) {
    const errorText = await res.text()
    console.error(`Enable Banking API error [${res.status}]: ${errorText}`)
    throw new Error(`Enable Banking API error: ${res.status} - ${errorText}`)
  }

  return res
}

// ── Azioni ──────────────────────────────────────────────────

// 1. Avvia il flusso OAuth — restituisce URL di redirect alla banca
async function startAuth(userId: string, body: {
  aspsp_name: string
  aspsp_country: string
}): Promise<Response> {
  const state = `${userId}:${crypto.randomUUID()}`

  const validUntil = new Date()
  validUntil.setDate(validUntil.getDate() + 90) // consenso 90 giorni

  const res = await ebFetch('/auth', {
    method: 'POST',
    body: {
      access: { valid_until: validUntil.toISOString() },
      aspsp: { name: body.aspsp_name, country: body.aspsp_country },
      state,
      redirect_url: EB_REDIRECT_URL,
      psu_type: 'personal',
    },
  })

  const data = await res.json()

  // Salva la connessione in stato pending
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  await supabase.from('bank_connections').insert({
    user_id: userId,
    institution_name: body.aspsp_name,
    institution_country: body.aspsp_country,
    status: 'pending',
  })

  return new Response(JSON.stringify({
    url: data.url,
    state,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// 2. Completa l'autenticazione — scambia code per sessione + account
async function completeAuth(userId: string, body: {
  code: string
  institution_name: string
}): Promise<Response> {
  const res = await ebFetch('/sessions', {
    method: 'POST',
    body: { code: body.code },
  })

  const data = await res.json()
  // data.accounts can be UIDs (strings) or full account objects with .uid field
  const accountUids: string[] = (data.accounts || []).map((a: any) =>
    typeof a === 'string' ? a : a.uid
  )

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Aggiorna la connessione pending → active
  const { error } = await supabase
    .from('bank_connections')
    .update({
      session_id: data.session_id,
      account_ids: accountUids,
      status: 'active',
      consent_expires_at: data.access?.valid_until,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', userId)
    .eq('institution_name', body.institution_name)
    .eq('status', 'pending')

  if (error) {
    console.error('Error updating bank connection:', error)
    throw new Error('Failed to update bank connection')
  }

  return new Response(JSON.stringify({
    session_id: data.session_id,
    accounts: accountUids,
    valid_until: data.access?.valid_until,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// 3. Recupera transazioni per un account
async function getTransactions(userId: string, body: {
  account_id: string
  date_from?: string
  date_to?: string
}): Promise<Response> {
  const params: Record<string, string> = {}
  if (body.date_from) params.date_from = body.date_from
  if (body.date_to) params.date_to = body.date_to

  let allTransactions: unknown[] = []
  let continuationKey: string | null = null

  // Pagina tutte le transazioni
  do {
    if (continuationKey) params.continuation_key = continuationKey

    const res = await ebFetch(`/accounts/${body.account_id}/transactions`, { params })
    const data = await res.json()

    if (data.transactions) {
      allTransactions = allTransactions.concat(data.transactions)
    }
    continuationKey = data.continuation_key || null
  } while (continuationKey)

  // Salva nel DB
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  )

  // Trova la connessione per questo account
  const { data: connections } = await supabase
    .from('bank_connections')
    .select('id')
    .eq('user_id', userId)
    .contains('account_ids', [body.account_id])
    .eq('status', 'active')
    .limit(1)
    .single()

  if (!connections) {
    throw new Error('No active connection found for this account')
  }

  const connectionId = connections.id

  // Trasforma e upsert transazioni
  const rows = allTransactions.map((tx: any) => ({
    user_id: userId,
    connection_id: connectionId,
    external_id: tx.entry_reference || tx.transaction_id || null,
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
    const { error } = await supabase
      .from('bank_transactions')
      .upsert(rows, {
        onConflict: 'connection_id,external_id',
        ignoreDuplicates: true,
      })

    if (error) {
      console.error('Error upserting transactions:', error)
      throw new Error('Failed to save transactions')
    }
  }

  // Aggiorna last_sync_at
  await supabase
    .from('bank_connections')
    .update({
      last_sync_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', connectionId)

  return new Response(JSON.stringify({
    imported: rows.length,
    total: allTransactions.length,
  }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
}

// 4. Recupera saldi per un account
async function getBalances(_userId: string, body: {
  account_id: string
}): Promise<Response> {
  const res = await ebFetch(`/accounts/${body.account_id}/balances`)
  const data = await res.json()

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// 5. Lista banche disponibili per paese
async function getAspsps(_userId: string, body: {
  country: string
}): Promise<Response> {
  const res = await ebFetch('/aspsps', {
    params: { country: body.country, psu_type: 'personal' },
  })
  const data = await res.json()

  return new Response(JSON.stringify(data), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

// ── Handler principale ──────────────────────────────────────

Deno.serve(async (req) => {
  // CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verifica autenticazione utente
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing authorization' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } },
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { action, ...body } = await req.json()

    let response: Response

    switch (action) {
      case 'start-auth':
        response = await startAuth(user.id, body)
        break
      case 'complete-auth':
        response = await completeAuth(user.id, body)
        break
      case 'get-transactions':
        response = await getTransactions(user.id, body)
        break
      case 'get-balances':
        response = await getBalances(user.id, body)
        break
      case 'get-aspsps':
        response = await getAspsps(user.id, body)
        break
      default:
        response = new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return response
  } catch (err) {
    console.error('Banking auth error:', err)
    return new Response(JSON.stringify({ error: err.message || 'Internal error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
