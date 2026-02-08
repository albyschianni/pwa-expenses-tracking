import { ref, watch } from 'vue'
import { supabase, type DbRecurringExpense } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useExpenses, CATEGORIES } from './useExpenses'

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
}

// Singleton state
const recurringExpenses = ref<RecurringExpense[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Prevent duplicate watchers
let watchersInitialized = false

// Track if auto-generation has been checked this session
let autoGenerationChecked = false

// Default category fallback
const defaultCategory = { id: 'other', icon: '📦', color: '#6B7280' }

function getCategoryConfig(categoryId: string) {
  const found = CATEGORIES.find(c => c.id === categoryId)
  return found ?? defaultCategory
}

function transformRecurringExpense(db: DbRecurringExpense): RecurringExpense {
  const cat = getCategoryConfig(db.category_id)
  return {
    id: db.id,
    description: db.description,
    amount: Number(db.amount),
    category: db.category_id,
    categoryIcon: cat.icon as string,
    categoryColor: cat.color as string,
    dayOfMonth: db.day_of_month,
    enabled: db.enabled,
    lastGeneratedDate: db.last_generated_date,
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
  }) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const { data: newItem, error: insertError } = await supabase
        .from('recurring_expenses')
        .insert({
          user_id: user.value.id,
          description: data.description,
          amount: data.amount,
          category_id: data.category,
          day_of_month: data.dayOfMonth,
          enabled: true,
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
    }>
  ) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const updateData: Record<string, unknown> = {}
      if (data.description !== undefined) updateData.description = data.description
      if (data.amount !== undefined) updateData.amount = data.amount
      if (data.category !== undefined) updateData.category_id = data.category
      if (data.dayOfMonth !== undefined) updateData.day_of_month = data.dayOfMonth
      if (data.enabled !== undefined) updateData.enabled = data.enabled
      updateData.updated_at = new Date().toISOString()

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

  // Toggle enabled state (convenience method)
  async function toggleEnabled(id: string) {
    const item = recurringExpenses.value.find(r => r.id === id)
    if (!item) return
    return updateRecurringExpense(id, { enabled: !item.enabled })
  }

  // Auto-generation logic - runs when app opens
  async function processAutoGeneration() {
    // Only run once per session
    if (autoGenerationChecked) return
    autoGenerationChecked = true

    if (!isAuthenticated.value || !user.value) return

    const today = new Date()
    const year = today.getFullYear()
    const month = String(today.getMonth() + 1).padStart(2, '0')
    const day = String(today.getDate()).padStart(2, '0')
    const todayDateStr = `${year}-${month}-${day}`
    const currentDay = today.getDate()
    const currentMonthKey = `${year}-${month}`

    try {
      // Fetch all enabled recurring expenses for this user
      const { data: items, error: fetchError } = await supabase
        .from('recurring_expenses')
        .select('*')
        .eq('enabled', true)

      if (fetchError) throw fetchError
      if (!items || items.length === 0) return

      let generatedCount = 0

      // Process each recurring expense
      for (const item of items) {
        // Check if today is the day to generate
        if (item.day_of_month !== currentDay) continue

        // Check if already generated this month
        if (item.last_generated_date) {
          const lastGenMonth = item.last_generated_date.substring(0, 7)
          if (lastGenMonth === currentMonthKey) continue
        }

        // Generate the expense
        try {
          await addExpense({
            description: item.description,
            date: todayDateStr,
            amount: Number(item.amount),
            category: item.category_id,
          })

          // Update last_generated_date
          await supabase
            .from('recurring_expenses')
            .update({ last_generated_date: todayDateStr })
            .eq('id', item.id)

          // Update local state
          const localItem = recurringExpenses.value.find(r => r.id === item.id)
          if (localItem) {
            localItem.lastGeneratedDate = todayDateStr
          }

          generatedCount++
        } catch (e) {
          console.error('Failed to auto-generate expense:', e)
        }
      }

      // Refresh expenses list to show newly added items
      if (generatedCount > 0) {
        await refreshExpenses()
      }
    } catch (e) {
      console.error('Auto-generation failed:', e)
    }
  }

  // Initialize watchers only once
  if (!watchersInitialized) {
    watchersInitialized = true

    watch(isAuthenticated, (authenticated) => {
      if (authenticated) {
        fetchRecurringExpenses()
      } else {
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
