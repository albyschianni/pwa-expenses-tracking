import { ref, computed, watch } from 'vue'
import { supabase, type DbExpense } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useSelectedMonth } from './useSelectedMonth'
import { useCategories } from './useCategories'

export type TransactionType = 'expense' | 'income'
export type ExpenseSource = 'manual' | 'bank'

export interface Expense {
  id: string
  description: string
  date: string // ISO format: YYYY-MM-DD
  amount: number
  category: string
  icon: string
  color: string
  type: TransactionType
  source: ExpenseSource
  reviewed: boolean
  connectionId?: string | null
}

export interface Category {
  id: string
  label: string
  icon: string
  color: string
  type: TransactionType
}

// Default fallback category
const defaultCategory: Category = { id: 'Altro', label: 'Altro', icon: '📦', color: '#6B7280', type: 'expense' }

// Dynamic getCategoryConfig that uses DB categories
export function getCategoryConfig(id: string): Category {
  const { getCategoryById } = useCategories()
  const cat = getCategoryById(id)
  if (cat) return { id: cat.id, label: cat.label, icon: cat.icon, color: cat.color, type: cat.type }
  return defaultCategory
}

// Shared reactive state (singleton pattern)
const expenses = ref<Expense[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let currentLoadedMonth: string | null = null
let watchersInitialized = false

function transformExpense(db: DbExpense & { source?: string; reviewed?: boolean; connection_id?: string | null }): Expense {
  const txType: TransactionType = db.transaction_type === 'income' ? 'income' : 'expense'
  const cat = getCategoryConfig(db.category_id)
  return {
    id:           db.id,
    description:  db.description,
    date:         db.date,
    amount:       Number(db.amount),
    category:     db.category_id,
    icon:         cat.icon,
    color:        cat.color,
    type:         txType,
    source:       (db.source as ExpenseSource) || 'manual',
    reviewed:     db.reviewed !== false,
    connectionId: db.connection_id ?? null,
  }
}

function getMonthFromDate(dateStr: string): string {
  return dateStr.substring(0, 7)
}

function getMonthRange(monthKey: string): { startDate: string; endDate: string } {
  const parts = monthKey.split('-').map(Number)
  const year  = parts[0] ?? new Date().getFullYear()
  const month = parts[1] ?? (new Date().getMonth() + 1)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  const lastDay   = new Date(year, month, 0)
  const endDate   = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  return { startDate, endDate }
}

export function useExpenses() {
  const { user, isAuthenticated } = useAuth()
  const { monthKey } = useSelectedMonth()

  async function fetchExpenses(forceRefresh = false) {
    if (!isAuthenticated.value || !user.value) {
      expenses.value = []
      currentLoadedMonth = null
      return
    }

    const targetMonth = monthKey.value

    if (!forceRefresh && currentLoadedMonth === targetMonth) return

    if (currentLoadedMonth !== targetMonth) expenses.value = []

    loading.value = true
    error.value = null

    try {
      const { startDate, endDate } = getMonthRange(targetMonth)

      const { data, error: fetchError } = await supabase
        .from('all_expenses')
        .select('*')
        .eq('user_id', user.value.id)
        .is('shared_wallet_id', null)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      if (monthKey.value === targetMonth) {
        expenses.value = (data || []).map(transformExpense)
        currentLoadedMonth = targetMonth
      }
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch expenses'
      console.error('Fetch expenses error:', e)
    } finally {
      loading.value = false
    }
  }

  if (!watchersInitialized) {
    watchersInitialized = true

    watch(monthKey, () => fetchExpenses())

    watch(isAuthenticated, (authenticated) => {
      if (!authenticated) {
        expenses.value = []
        currentLoadedMonth = null
      }
    })
  }

  const balance = computed(() =>
    expenses.value.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0)
  )

  const totalExpenses = computed(() =>
    expenses.value.reduce((sum, e) => e.type === 'expense' ? sum + e.amount : sum, 0)
  )

  const totalIncome = computed(() =>
    expenses.value.reduce((sum, e) => e.type === 'income' ? sum + e.amount : sum, 0)
  )

  // Supabase returns date-desc; re-sort after local inserts to stay consistent
  const sortedExpenses = computed(() =>
    [...expenses.value].sort((a, b) => b.date.localeCompare(a.date))
  )

  function formatDate(dateStr: string): string {
    const date      = new Date(dateStr)
    const today     = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString())     return 'Oggi'
    if (date.toDateString() === yesterday.toDateString()) return 'Ieri'
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  async function addExpense(data: {
    description: string
    date: string
    amount: number
    category: string
    type?: TransactionType
  }) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const { data: newRow, error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id:          user.value.id,
          description:      data.description,
          date:             data.date,
          amount:           data.amount,
          category_id:      data.category,
          transaction_type: data.type ?? 'expense',
        })
        .select()
        .single()

      if (insertError) throw insertError

      const expense = transformExpense(newRow)

      if (getMonthFromDate(expense.date) === monthKey.value) {
        // Prepend to preserve descending date order
        expenses.value = [expense, ...expenses.value]
      }

      return expense
    } catch (e: any) {
      error.value = e.message || 'Failed to add expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateExpense(
    id: string,
    data: Partial<{
      description: string
      date: string
      amount: number
      category: string
      type: TransactionType
    }>
  ) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      // Determina se è una transazione bancaria
      const existing = expenses.value.find(e => e.id === id)
      const isBankTx = existing?.source === 'bank'

      if (isBankTx) {
        // Aggiorna bank_transactions
        const bankUpdateData: Record<string, any> = { reviewed: true }
        if (data.category !== undefined) bankUpdateData.category_id = data.category

        const { error: updateError } = await supabase
          .from('bank_transactions')
          .update(bankUpdateData)
          .eq('id', id)

        if (updateError) throw updateError

        // Apprendi la correzione manuale: crea regola per la prossima volta
        if (data.category !== undefined && existing?.description) {
          // Rimuove parti variabili (data operazione, numero carta) per estrarre solo il merchant
          let merchantKey = existing.description
          merchantKey = merchantKey.replace(/Carta\s*N\.\s*[\*\d\s]+/gi, '')
          merchantKey = merchantKey.replace(/Data\s*operazione\s*\d{2}\/\d{2}\/\d{2,4}/gi, '')
          merchantKey = merchantKey.replace(/Data\s*accredito:\s*\d{2}\/\d{2}\/\d{4}/gi, '')
          merchantKey = merchantKey.replace(/\*\d+/g, '')
          merchantKey = merchantKey.trim().replace(/\s+/g, ' ').toUpperCase()

          if (merchantKey.length >= 3) {
            await supabase
              .from('categorization_rules')
              .upsert({
                user_id: user.value.id,
                match_field: 'description',
                match_value: merchantKey,
                match_type: 'contains',
                category_id: data.category,
                priority: 20,
                usage_count: 1,
              }, { onConflict: 'user_id,match_value,match_field' })
          }
        }

        // Aggiorna lo stato locale
        if (existing) {
          const updatedExpense: Expense = {
            ...existing,
            category: data.category ?? existing.category,
            ...getCategoryConfig(data.category ?? existing.category),
            reviewed: true,
          }
          const index = expenses.value.findIndex(e => e.id === id)
          if (index !== -1) expenses.value[index] = updatedExpense
        }

        return true
      }

      // Aggiorna expenses (manuale)
      type UpdatePayload = {
        description?:      string
        date?:             string
        amount?:           number
        category_id?:      string
        transaction_type?: TransactionType
        updated_at:        string
      }

      const updateData: UpdatePayload = { updated_at: new Date().toISOString() }
      if (data.description !== undefined) updateData.description      = data.description
      if (data.date        !== undefined) updateData.date             = data.date
      if (data.amount      !== undefined) updateData.amount           = data.amount
      if (data.category    !== undefined) updateData.category_id      = data.category
      if (data.type        !== undefined) updateData.transaction_type = data.type

      const { data: updatedRow, error: updateError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const expense = transformExpense(updatedRow)
      const expenseMonth = getMonthFromDate(expense.date)

      if (expenseMonth === monthKey.value) {
        const index = expenses.value.findIndex(e => e.id === id)
        if (index !== -1) {
          expenses.value[index] = expense
        } else {
          expenses.value = [expense, ...expenses.value]
        }
      } else {
        expenses.value = expenses.value.filter(e => e.id !== id)
      }

      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to update expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function markBankTransactionReviewed(id: string) {
    const expense = expenses.value.find(e => e.id === id)
    if (!expense || expense.source !== 'bank' || expense.reviewed) return

    await supabase
      .from('bank_transactions')
      .update({ reviewed: true })
      .eq('id', id)

    const index = expenses.value.findIndex(e => e.id === id)
    if (index !== -1) {
      expenses.value[index] = { ...expenses.value[index]!, reviewed: true }
    }
  }

  // Marca tutte le transazioni bancarie non revisionate come "viste" nel DB
  // ma senza toccare lo stato locale — così i badge restano visibili questa sessione
  // e spariscono alla prossima apertura dell'app
  function scheduleMarkAllReviewed() {
    const unreviewedIds = expenses.value
      .filter(e => e.source === 'bank' && !e.reviewed)
      .map(e => e.id)

    if (unreviewedIds.length === 0) return

    setTimeout(async () => {
      await supabase
        .from('bank_transactions')
        .update({ reviewed: true })
        .in('id', unreviewedIds)
    }, 5000)
  }

  async function deleteExpense(id: string) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError

      expenses.value = expenses.value.filter(e => e.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  function getExpense(id: string) {
    return expenses.value.find(e => e.id === id)
  }

  function refresh() {
    return fetchExpenses(true)
  }

  return {
    expenses,
    sortedExpenses,
    balance,
    totalExpenses,
    totalIncome,
    loading,
    error,
    getCategoryConfig,
    formatDate,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpense,
    fetchExpenses,
    refresh,
    markBankTransactionReviewed,
    scheduleMarkAllReviewed,
  }
}
