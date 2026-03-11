import { ref, watch } from 'vue'
import { supabase, type DbRecurringExpense } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useExpenses, getCategoryConfig, type TransactionType } from './useExpenses'

export interface RecurringExpense {
  id: string
  description: string
  amount: number
  category: string
  categoryIcon: string
  categoryColor: string
  dayOfMonth: number
  enabled: boolean
  lastGeneratedDate: string | null
  type: TransactionType
}

// Singleton state
const recurringExpenses = ref<RecurringExpense[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

let watchersInitialized = false
let autoGenerationChecked = false

function transformRecurringExpense(db: DbRecurringExpense): RecurringExpense {
  const txType: TransactionType = db.transaction_type === 'income' ? 'income' : 'expense'
  const cat = getCategoryConfig(db.category_id)
  return {
    id:                db.id,
    description:       db.description,
    amount:            Number(db.amount),
    category:          db.category_id,
    categoryIcon:      cat.icon,
    categoryColor:     cat.color,
    dayOfMonth:        db.day_of_month,
    enabled:           db.enabled,
    lastGeneratedDate: db.last_generated_date,
    type:              txType,
  }
}

export function useRecurringExpenses() {
  const { user, isAuthenticated } = useAuth()
  const { addExpense, refresh: refreshExpenses } = useExpenses()

  async function fetchRecurringExpenses() {
    if (!isAuthenticated.value || !user.value) {
      recurringExpenses.value = []
      return
    }

    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .order('day_of_month', { ascending: true })

      if (fetchError) throw fetchError
      recurringExpenses.value = (data || []).map(transformRecurringExpense)
    } catch (e: any) {
      error.value = e.message || 'Failed to fetch recurring expenses'
      console.error('Fetch recurring expenses error:', e)
    } finally {
      loading.value = false
    }
  }

  async function addRecurringExpense(data: {
    description: string
    amount: number
    category: string
    dayOfMonth: number
    type?: TransactionType
  }) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const { data: newItem, error: insertError } = await supabase
        .from('recurring_expenses')
        .insert({
          user_id:          user.value.id,
          description:      data.description,
          amount:           data.amount,
          category_id:      data.category,
          day_of_month:     data.dayOfMonth,
          enabled:          true,
          transaction_type: data.type ?? 'expense',
        })
        .select()
        .single()

      if (insertError) throw insertError
      recurringExpenses.value.push(transformRecurringExpense(newItem))
      return newItem
    } catch (e: any) {
      error.value = e.message || 'Failed to add recurring expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updateRecurringExpense(
    id: string,
    data: Partial<{
      description: string
      amount: number
      category: string
      dayOfMonth: number
      enabled: boolean
      type: TransactionType
    }>
  ) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      type UpdatePayload = {
        description?:      string
        amount?:           number
        category_id?:      string
        day_of_month?:     number
        enabled?:          boolean
        transaction_type?: TransactionType
        updated_at:        string
      }

      const updateData: UpdatePayload = { updated_at: new Date().toISOString() }
      if (data.description !== undefined) updateData.description      = data.description
      if (data.amount      !== undefined) updateData.amount           = data.amount
      if (data.category    !== undefined) updateData.category_id      = data.category
      if (data.dayOfMonth  !== undefined) updateData.day_of_month     = data.dayOfMonth
      if (data.enabled     !== undefined) updateData.enabled          = data.enabled
      if (data.type        !== undefined) updateData.transaction_type = data.type

      const { data: updated, error: updateError } = await supabase
        .from('recurring_expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const index = recurringExpenses.value.findIndex(r => r.id === id)
      if (index !== -1) {
        recurringExpenses.value[index] = transformRecurringExpense(updated)
      }
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to update recurring expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteRecurringExpense(id: string) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const { error: deleteError } = await supabase
        .from('recurring_expenses')
        .delete()
        .eq('id', id)

      if (deleteError) throw deleteError
      recurringExpenses.value = recurringExpenses.value.filter(r => r.id !== id)
      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete recurring expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function toggleEnabled(id: string) {
    const item = recurringExpenses.value.find(r => r.id === id)
    if (!item) return
    return updateRecurringExpense(id, { enabled: !item.enabled })
  }

  async function processAutoGeneration() {
    if (autoGenerationChecked) return
    autoGenerationChecked = true

    if (!isAuthenticated.value || !user.value) return

    const today = new Date()
    const year  = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day   = String(today.getDate()).padStart(2, '0')
    const todayDateStr    = `${year}-${month}-${day}`
    const currentDay      = today.getDate()
    const currentMonthKey = `${year}-${month}`

    try {
      const { data: items, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('enabled', true)

      if (fetchError) throw fetchError
      if (!items || items.length === 0) return

      const itemsToGenerate = items.filter(item => {
        if (item.day_of_month !== currentDay) return false
        if (item.last_generated_date) {
          if (item.last_generated_date.substring(0, 7) === currentMonthKey) return false
        }
        return true
      })

      if (itemsToGenerate.length === 0) return

      const results = await Promise.allSettled(
        itemsToGenerate.map(async (item) => {
          const txType: TransactionType = item.transaction_type === 'income' ? 'income' : 'expense'

          await addExpense({
            description: item.description,
            date:        todayDateStr,
            amount:      Number(item.amount),
            category:    item.category_id,
            type:        txType,
          })

          await supabase
            .from('recurring_expenses')
            .update({ last_generated_date: todayDateStr })
            .eq('id', item.id)

          const localItem = recurringExpenses.value.find(r => r.id === item.id)
          if (localItem) {
            localItem.lastGeneratedDate = todayDateStr
          }
        })
      )

      const generatedCount = results.filter(r => r.status === 'fulfilled').length
      results.filter(r => r.status === 'rejected').forEach(r => {
        console.error('Failed to auto-generate recurring transaction:', (r as PromiseRejectedResult).reason)
      })

      if (generatedCount > 0) {
        await refreshExpenses()
      }
    } catch (e) {
      console.error('Auto-generation failed:', e)
    }
  }

  if (!watchersInitialized) {
    watchersInitialized = true

    watch(isAuthenticated, (authenticated) => {
      if (!authenticated) {
        recurringExpenses.value = []
        autoGenerationChecked = false
      }
    })
  }

  return {
    recurringExpenses,
    loading,
    error,
    fetchRecurringExpenses,
    addRecurringExpense,
    updateRecurringExpense,
    deleteRecurringExpense,
    toggleEnabled,
    processAutoGeneration,
  }
}
