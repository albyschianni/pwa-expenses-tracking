import { ref, computed } from 'vue'

export interface Expense {
  id: number
  description: string
  date: string // ISO format: YYYY-MM-DD
  amount: number
  category: string
  icon: string
  color: string
}

// Category configuration with icons and colors
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
const expenses = ref<Expense[]>([
  { id: 1, description: 'Dinner with friends', date: '2024-01-18', amount: 45.50, category: 'food', icon: '🍽️', color: '#F59E0B' },
  { id: 2, description: 'Morning Coffee', date: '2024-01-18', amount: 5.50, category: 'coffee', icon: '☕', color: '#8B5CF6' },
  { id: 3, description: 'Groceries & Pastry', date: '2024-01-17', amount: 78.30, category: 'groceries', icon: '🛒', color: '#10B981' },
  { id: 4, description: 'Monthly Rent', date: '2024-01-15', amount: 1200.00, category: 'housing', icon: '🏠', color: '#3B82F6' },
  { id: 5, description: 'Spotify Premium', date: '2024-01-15', amount: 9.99, category: 'entertainment', icon: '🎵', color: '#1DB954' },
  { id: 6, description: 'Uber Ride', date: '2024-01-14', amount: 18.75, category: 'transport', icon: '🚗', color: '#374151' },
  { id: 7, description: 'Gym Membership', date: '2024-01-12', amount: 49.00, category: 'health', icon: '💪', color: '#EF4444' },
  { id: 8, description: 'Netflix', date: '2024-01-10', amount: 15.99, category: 'streaming', icon: '🎬', color: '#E50914' },
  { id: 9, description: 'Electric Bill', date: '2024-01-08', amount: 85.00, category: 'utilities', icon: '⚡', color: '#FBBF24' },
  { id: 10, description: 'Phone Bill', date: '2024-01-05', amount: 65.00, category: 'phone', icon: '📱', color: '#6366F1' },
])

let nextId = 11

export function useExpenses() {
  // Get category config by id
  function getCategoryConfig(categoryId: string) {
    return CATEGORIES.find(c => c.id === categoryId) || CATEGORIES[CATEGORIES.length - 1]
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
      return 'Today'
    }
    if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday'
    }
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  // Create expense
  function addExpense(data: Omit<Expense, 'id' | 'icon' | 'color'>) {
    const category = getCategoryConfig(data.category)
    const newExpense: Expense = {
      ...data,
      id: nextId++,
      icon: category.icon,
      color: category.color,
    }
    expenses.value.push(newExpense)
    return newExpense
  }

  // Update expense
  function updateExpense(id: number, data: Partial<Omit<Expense, 'id'>>) {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index === -1) return false

    const expense = expenses.value[index]

    // If category changed, update icon and color
    if (data.category && data.category !== expense.category) {
      const category = getCategoryConfig(data.category)
      data.icon = category.icon
      data.color = category.color
    }

    expenses.value[index] = { ...expense, ...data }
    return true
  }

  // Delete expense
  function deleteExpense(id: number) {
    const index = expenses.value.findIndex(e => e.id === id)
    if (index === -1) return false
    expenses.value.splice(index, 1)
    return true
  }

  // Get single expense by id
  function getExpense(id: number) {
    return expenses.value.find(e => e.id === id)
  }

  return {
    expenses,
    sortedExpenses,
    totalExpenses,
    CATEGORIES,
    getCategoryConfig,
    formatDate,
    addExpense,
    updateExpense,
    deleteExpense,
    getExpense,
  }
}
