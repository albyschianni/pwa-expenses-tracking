import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useExpenses } from './useExpenses'

// ── Types ───────────────────────────────────────────────────

export interface BankConnection {
  id: string
  institutionName: string
  institutionCountry: string
  sessionId: string | null
  accountIds: string[] | null
  status: 'pending' | 'active' | 'expired' | 'error'
  consentExpiresAt: string | null
  lastSyncAt: string | null
  createdAt: string
}

export interface BankTransaction {
  id: string
  connectionId: string
  externalId: string | null
  bookingDate: string | null
  valueDate: string | null
  amount: number
  currency: string
  description: string | null
  counterpartName: string | null
  counterpartIban: string | null
  merchantCategoryCode: string | null
  creditDebitIndicator: 'CRDT' | 'DBIT' | null
  status: string
  categoryId: string | null
  categorizationSource: string | null
  reviewed: boolean
  createdAt: string
}

export interface Aspsp {
  name: string
  country: string
  logo?: string
}

// ── State (singleton) ───────────────────────────────────────

const connections = ref<BankConnection[]>([])
const bankTransactions = ref<BankTransaction[]>([])
const loading = ref(false)
const syncing = ref(false)
const error = ref<string | null>(null)

// ── Helpers ─────────────────────────────────────────────────

function transformConnection(row: any): BankConnection {
  return {
    id: row.id,
    institutionName: row.institution_name,
    institutionCountry: row.institution_country,
    sessionId: row.session_id,
    accountIds: row.account_ids,
    status: row.status,
    consentExpiresAt: row.consent_expires_at,
    lastSyncAt: row.last_sync_at,
    createdAt: row.created_at,
  }
}

function transformTransaction(row: any): BankTransaction {
  return {
    id: row.id,
    connectionId: row.connection_id,
    externalId: row.external_id,
    bookingDate: row.booking_date,
    valueDate: row.value_date,
    amount: parseFloat(row.amount),
    currency: row.currency,
    description: row.description,
    counterpartName: row.counterpart_name,
    counterpartIban: row.counterpart_iban,
    merchantCategoryCode: row.merchant_category_code,
    creditDebitIndicator: row.credit_debit_indicator,
    status: row.status,
    categoryId: row.category_id,
    categorizationSource: row.categorization_source,
    reviewed: row.reviewed,
    createdAt: row.created_at,
  }
}

async function callBankingAuth(action: string, body: Record<string, any> = {}) {
  const { data, error } = await supabase.functions.invoke('banking-auth', {
    body: { action, ...body },
  })

  if (error) throw new Error(error.message || 'Errore chiamata banking')
  return data
}

// ── Composable ──────────────────────────────────────────────

export function useBanking() {
  const { user } = useAuth()

  // Computed
  const activeConnections = computed(() =>
    connections.value.filter(c => c.status === 'active')
  )

  const pendingReviewCount = computed(() =>
    bankTransactions.value.filter(t => !t.reviewed && !t.categoryId).length
  )

  const hasConnections = computed(() => connections.value.length > 0)

  // ── Fetch connessioni ───────────────────────────────────

  async function fetchConnections() {
    if (!user.value) return

    const { data, error: err } = await supabase
      .from('bank_connections')
      .select('*')
      .order('created_at', { ascending: false })

    if (err) {
      console.error('Error fetching connections:', err)
      return
    }

    connections.value = (data || []).map(transformConnection)
  }

  // ── Fetch transazioni bancarie ──────────────────────────

  async function fetchBankTransactions(filters?: {
    month?: string // 'YYYY-MM'
    connectionId?: string
    uncategorizedOnly?: boolean
  }) {
    if (!user.value) return

    let query = supabase
      .from('bank_transactions')
      .select('*')
      .order('booking_date', { ascending: false })

    if (filters?.connectionId) {
      query = query.eq('connection_id', filters.connectionId)
    }

    if (filters?.uncategorizedOnly) {
      query = query.is('category_id', null)
    }

    if (filters?.month) {
      const parts = filters.month.split('-')
      const year = parts[0]!
      const month = parts[1]!
      const startDate = `${year}-${month}-01`
      const endDate = new Date(parseInt(year), parseInt(month), 0)
        .toISOString().split('T')[0]
      query = query.gte('booking_date', startDate).lte('booking_date', endDate)
    }

    const { data, error: err } = await query

    if (err) {
      console.error('Error fetching bank transactions:', err)
      return
    }

    bankTransactions.value = (data || []).map(transformTransaction)
  }

  // ── Lista banche disponibili ────────────────────────────

  async function getAspsps(country: string = 'IT'): Promise<Aspsp[]> {
    const data = await callBankingAuth('get-aspsps', { country })
    return data.aspsps || data || []
  }

  // ── Avvia connessione banca ─────────────────────────────

  async function startBankConnection(aspspName: string, aspspCountry: string = 'IT') {
    loading.value = true
    error.value = null

    try {
      const data = await callBankingAuth('start-auth', {
        aspsp_name: aspspName,
        aspsp_country: aspspCountry,
      })

      // Salva state in sessionStorage per il callback
      sessionStorage.setItem('banking_state', data.state)
      sessionStorage.setItem('banking_institution', aspspName)

      // Redirect alla banca
      window.location.href = data.url
    } catch (err: any) {
      error.value = err.message
      console.error('Error starting bank connection:', err)
    } finally {
      loading.value = false
    }
  }

  // ── Completa connessione (dopo callback) ────────────────

  async function completeBankConnection(code: string) {
    loading.value = true
    error.value = null

    try {
      const institutionName = sessionStorage.getItem('banking_institution') || ''

      const data = await callBankingAuth('complete-auth', {
        code,
        institution_name: institutionName,
      })

      // Cleanup
      sessionStorage.removeItem('banking_state')
      sessionStorage.removeItem('banking_institution')

      // Aggiorna connessioni
      await fetchConnections()

      // Primo sync — ultimi 3 mesi
      if (data.accounts && data.accounts.length > 0) {
        await syncTransactions(data.accounts)
      }

      return data
    } catch (err: any) {
      error.value = err.message
      console.error('Error completing bank connection:', err)
      throw err
    } finally {
      loading.value = false
    }
  }

  // ── Sync transazioni ───────────────────────────────────

  async function syncTransactions(accountIds?: string[]) {
    syncing.value = true
    error.value = null

    try {
      const accounts = accountIds ||
        activeConnections.value.flatMap(c => c.accountIds || [])

      const dateFrom = new Date()
      dateFrom.setMonth(dateFrom.getMonth() - 3)

      let totalImported = 0

      for (const accountId of accounts) {
        const data = await callBankingAuth('get-transactions', {
          account_id: accountId,
          date_from: dateFrom.toISOString().split('T')[0],
          date_to: new Date().toISOString().split('T')[0],
        })
        totalImported += data.imported || 0
      }

      // Ricarica transazioni e connessioni
      await Promise.all([fetchBankTransactions(), fetchConnections()])

      return totalImported
    } catch (err: any) {
      error.value = err.message
      console.error('Error syncing transactions:', err)
      throw err
    } finally {
      syncing.value = false
    }
  }

  // ── Sync manuale per singolo utente (via banking-sync) ──

  async function syncManual() {
    syncing.value = true
    error.value = null

    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) throw new Error('Non autenticato')

      const { data, error: fnError } = await supabase.functions.invoke('banking-sync', {
        body: { user_id: session.user.id },
      })

      if (fnError) throw new Error(fnError.message || 'Errore sync')

      await Promise.all([fetchBankTransactions(), fetchConnections()])

      return data?.total_imported || 0
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      syncing.value = false
    }
  }

  // ── Disconnetti banca ───────────────────────────────────

  async function disconnectBank(connectionId: string) {
    const { error: err } = await supabase
      .from('bank_connections')
      .update({
        status: 'expired',
        updated_at: new Date().toISOString(),
      })
      .eq('id', connectionId)

    if (err) {
      console.error('Error disconnecting bank:', err)
      throw err
    }

    await fetchConnections()
  }

  // ── Elimina connessione (e relative transazioni) ──────

  async function deleteConnection(connectionId: string) {
    // Prima elimina le transazioni associate
    await supabase
      .from('bank_transactions')
      .delete()
      .eq('connection_id', connectionId)

    const { error: err } = await supabase
      .from('bank_connections')
      .delete()
      .eq('id', connectionId)

    if (err) {
      console.error('Error deleting connection:', err)
      throw err
    }

    await fetchConnections()
  }

  // ── Categorizza transazione bancaria ─────────────────��──

  async function categorizeTransaction(transactionId: string, categoryId: string) {
    const { error: err } = await supabase
      .from('bank_transactions')
      .update({
        category_id: categoryId,
        categorization_source: 'manual',
        reviewed: true,
      })
      .eq('id', transactionId)

    if (err) {
      console.error('Error categorizing transaction:', err)
      throw err
    }

    // Aggiorna locale
    const tx = bankTransactions.value.find(t => t.id === transactionId)
    if (tx) {
      const idx = bankTransactions.value.indexOf(tx)
      bankTransactions.value[idx] = {
        ...tx,
        categoryId,
        categorizationSource: 'manual',
        reviewed: true,
      }

      // Salva regola auto-categorizzazione per future transazioni
      const matchValue = tx.counterpartName?.trim()
      if (matchValue && user.value) {
        supabase
          .from('categorization_rules')
          .upsert({
            user_id: user.value.id,
            match_field: 'counterpart_name',
            match_value: matchValue,
            match_type: 'exact',
            category_id: categoryId,
            usage_count: 1,
            updated_at: new Date().toISOString(),
          }, { onConflict: 'user_id,match_field,match_value' })
          .then(({ error: ruleErr }) => {
            if (ruleErr) console.error('Error saving categorization rule:', ruleErr)
          })
      }
    }

    // Refresh dashboard: la view all_expenses ora include questa transazione
    await useExpenses().refresh()
  }

  // ── Ignora transazione (reviewed senza categoria) ──────

  async function ignoreTransaction(transactionId: string) {
    const { error: err } = await supabase
      .from('bank_transactions')
      .update({ reviewed: true })
      .eq('id', transactionId)

    if (err) throw err

    const idx = bankTransactions.value.findIndex(t => t.id === transactionId)
    if (idx !== -1) {
      const existing = bankTransactions.value[idx]!
      bankTransactions.value[idx] = {
        ...existing,
        reviewed: true,
      }
    }
  }

  return {
    // State
    connections,
    bankTransactions,
    loading,
    syncing,
    error,

    // Computed
    activeConnections,
    pendingReviewCount,
    hasConnections,

    // Actions
    fetchConnections,
    fetchBankTransactions,
    getAspsps,
    startBankConnection,
    completeBankConnection,
    syncTransactions,
    syncManual,
    disconnectBank,
    deleteConnection,
    categorizeTransaction,
    ignoreTransaction,
  }
}
