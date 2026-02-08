import { ref, computed, watch } from 'vue'
import { supabase, type DbExpense } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useSelectedMonth } from './useSelectedMonth'

export interface Expense {
  id: string
  description: string
  date: string // ISO format: YYYY-MM-DD
  amount: number
  category: string
  icon: string
  color: string
}

// Default categories (also stored in DB for consistency)
export const CATEGORIES = [
  { id: 'food', label: 'Food & Dining', icon: '🍽️', color: '#F59E0B' },
  { id: 'coffee', label: 'Coffee & Drinks', icon: '☕', color: '#8B5CF6' },
  { id: 'groceries', label: 'Groceries', icon: '🛒', color: '#10B981' },
  { id: 'housing', label: 'Housing & Rent', icon: '🏠', color: '#3B82F6' },
  { id: 'entertainment', label: 'Entertainment', icon: '🎵', color: '#1DB954' },
  { id: 'transport', label: 'Transport', icon: '🚗', color: '#374151' },
  { id: 'health', label: 'Health & Fitness', icon: '💪', color: '#EF4444' },
  { id: 'streaming', label: 'Streaming', icon: '🎬', color: '#E50914' },
  { id: 'utilities', label: 'Utilities', icon: '⚡', color: '#FBBF24' },
  { id: 'phone', label: 'Phone & Internet', icon: '📱', color: '#6366F1' },
  { id: 'other', label: 'Other', icon: '📦', color: '#6B7280' },
] as const

// Shared reactive state (singleton pattern)
const expenses = ref<Expense[]>([])
const loading = ref(false)
const error = ref<string | null>(null)

// Track current month for the loaded data
let currentLoadedMonth: string | null = null

// Prevent duplicate watchers
let watchersInitialized = false

// Default category fallback
const defaultCategory = { id: 'other', label: 'Other', icon: '📦', color: '#6B7280' }

// Get category config by id
function getCategoryConfig(categoryId: string) {
  const found = CATEGORIES.find(c => c.id === categoryId)
  return found ?? defaultCategory
}

// Transform DB expense to frontend expense
function transformExpense(dbExpense: DbExpense): Expense {
  const category = getCategoryConfig(dbExpense.category_id)
  return {
    id: dbExpense.id,
    description: dbExpense.description,
    date: dbExpense.date,
    amount: Number(dbExpense.amount),
    category: dbExpense.category_id,
    icon: category.icon as string,
    color: category.color as string,
  }
}

// Helper to get month key from a date string (YYYY-MM-DD -> YYYY-MM)
function getMonthFromDate(dateStr: string): string {
  return dateStr.substring(0, 7)
}

// Get month range for queries
function getMonthRange(monthKey: string): { startDate: string; endDate: string } {
  const parts = monthKey.split('-').map(Number)
  const year = parts[0] ?? new Date().getFullYear()
  const month = parts[1] ?? (new Date().getMonth() + 1)
  const startDate = `${year}-${String(month).padStart(2, '0')}-01`
  // Get last day of month: month is 1-indexed here, so new Date(year, month, 0) gives last day
  const lastDay = new Date(year, month, 0)
  const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`
  return { startDate, endDate }
}

export function useExpenses() {
  const { user, isAuthenticated } = useAuth()
  const { monthKey } = useSelectedMonth()

  // Fetch expenses for the selected month
  async function fetchExpenses(forceRefresh = false) {
    if (!isAuthenticated.value || !user.value) {
      expenses.value = []
      currentLoadedMonth = null
      return
    }

    const targetMonth = monthKey.value

    // Skip if already loaded this month (unless forced)
    if (!forceRefresh && currentLoadedMonth === targetMonth) {
      return
    }

    // Clear expenses immediately when switching months
    if (currentLoadedMonth !== targetMonth) {
      expenses.value = []
    }

    loading.value = true
    error.value = null

    try {
      const { startDate, endDate } = getMonthRange(targetMonth)

      const { data, error: fetchError } = await supabase
        .from('expenses')
        .select('*')
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (fetchError) throw fetchError

      // Only update if we're still on the same month (user didn't switch during fetch)
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

  // Initialize watchers only once (singleton pattern)
  if (!watchersInitialized) {
    watchersInitialized = true

    // Watch for month changes and refetch
    watch(monthKey, (newMonth, oldMonth) => {
      if (newMonth !== oldMonth) {
        fetchExpenses()
      }
    })

    // Watch for auth changes
    watch(isAuthenticated, (authenticated) => {
      if (authenticated) {
        currentLoadedMonth = null
        fetchExpenses()
      } else {
        expenses.value = []
        currentLoadedMonth = null
      }
    })
  }

  // Total expenses
  const totalExpenses = computed(() => {
    return expenses.value.reduce((sum, e) => sum + e.amount, 0)
  })

  // Expenses sorted by date (newest first)
  const sortedExpenses = computed(() => {
    return [...expenses.value].sort((a, b) =>
      new Date(b.date).getTime() - new Date(a.date).getTime()
    )
  })

  // Format date for display
  function formatDate(dateStr: string): string {
    const date = new Date(dateStr)
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    if (date.toDateString() === today.toDateString()) {
      return 'Oggi'
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Ieri'
    }
    return date.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
  }

  // Create expense
  async function addExpense(data: { description: string; date: string; amount: number; category: string }) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const { data: newExpense, error: insertError } = await supabase
        .from('expenses')
        .insert({
          user_id: user.value.id,
          description: data.description,
          date: data.date,
          amount: data.amount,
          category_id: data.category,
        })
        .select()
        .single()

      if (insertError) throw insertError

      const expense = transformExpense(newExpense)

      // Only add to local state if expense is in the currently viewed month
      const expenseMonth = getMonthFromDate(expense.date)
      if (expenseMonth === monthKey.value) {
        expenses.value.push(expense)
      }

      return expense
    } catch (e: any) {
      error.value = e.message || 'Failed to add expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Update expense
  async function updateExpense(id: string, data: Partial<{ description: string; date: string; amount: number; category: string }>) {
    if (!user.value) throw new Error('Not authenticated')

    loading.value = true
    error.value = null

    try {
      const updateData: Record<string, unknown> = {}
      if (data.description !== undefined) updateData.description = data.description
      if (data.date !== undefined) updateData.date = data.date
      if (data.amount !== undefined) updateData.amount = data.amount
      if (data.category !== undefined) updateData.category_id = data.category
      updateData.updated_at = new Date().toISOString()

      const { data: updatedExpense, error: updateError } = await supabase
        .from('expenses')
        .update(updateData)
        .eq('id', id)
        .select()
        .single()

      if (updateError) throw updateError

      const expense = transformExpense(updatedExpense)
      const expenseMonth = getMonthFromDate(expense.date)

      // Check if expense still belongs in current month view
      if (expenseMonth === monthKey.value) {
        // Update in local state
        const index = expenses.value.findIndex(e => e.id === id)
        if (index !== -1) {
          expenses.value[index] = expense
        } else {
          // Date changed TO current month - add it
          expenses.value.push(expense)
        }
      } else {
        // Date changed AWAY from current month - remove it
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

  // Delete expense
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

      // Remove from local state
      expenses.value = expenses.value.filter(e => e.id !== id)

      return true
    } catch (e: any) {
      error.value = e.message || 'Failed to delete expense'
      throw e
    } finally {
      loading.value = false
    }
  }

  // Get single expense by id
  function getExpense(id: string) {
    return expenses.value.find(e => e.id === id)
  }

  // Force refresh current month
  function refresh() {
    return fetchExpenses(true)
  }

  return {
    expenses,
    sortedExpenses,
    totalExpenses,
    loading,
    error,
    CATEGORIES,
    getCategoryConfig,
    formatDate,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpense,
    fetchExpenses,
    refresh,
  }
}
