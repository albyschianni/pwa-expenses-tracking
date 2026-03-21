import { ref, computed, watch } from 'vue'
import { supabase, type DbCategory } from '../lib/supabase'
import { useAuth } from './useAuth'
import type { TransactionType } from './useExpenses'

export interface CategoryItem {
  id: string
  label: string
  icon: string
  color: string
  type: TransactionType
  userId: string | null
  isDefault: boolean
  sortOrder: number
  isActive: boolean
  isSystem: boolean
}

// Shared reactive state (singleton)
const categories = ref<CategoryItem[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let initialized = false

// Hardcoded fallback categories (used when DB is unavailable)
const FALLBACK_CATEGORIES: CategoryItem[] = [
  { id: 'Ristoranti',      label: 'Ristoranti e Bar',   icon: '🍽️', color: '#F59E0B', type: 'expense', userId: null, isDefault: true, sortOrder: 0,  isActive: true, isSystem: true },
  { id: 'Spesa',           label: 'Spesa Alimentare',   icon: '🛒', color: '#10B981', type: 'expense', userId: null, isDefault: true, sortOrder: 1,  isActive: true, isSystem: true },
  { id: 'Casa',            label: 'Casa e Affitto',     icon: '🏠', color: '#3B82F6', type: 'expense', userId: null, isDefault: true, sortOrder: 2,  isActive: true, isSystem: true },
  { id: 'Bollette',        label: 'Bollette e Utenze',  icon: '⚡', color: '#FBBF24', type: 'expense', userId: null, isDefault: true, sortOrder: 3,  isActive: true, isSystem: true },
  { id: 'Trasporti',       label: 'Trasporti',          icon: '🚗', color: '#374151', type: 'expense', userId: null, isDefault: true, sortOrder: 4,  isActive: true, isSystem: true },
  { id: 'Salute',          label: 'Salute e Benessere', icon: '💪', color: '#EF4444', type: 'expense', userId: null, isDefault: true, sortOrder: 5,  isActive: true, isSystem: true },
  { id: 'Intrattenimento', label: 'Intrattenimento',    icon: '🎬', color: '#8B5CF6', type: 'expense', userId: null, isDefault: true, sortOrder: 6,  isActive: true, isSystem: true },
  { id: 'Abbonamenti',     label: 'Abbonamenti',        icon: '📱', color: '#6366F1', type: 'expense', userId: null, isDefault: true, sortOrder: 7,  isActive: true, isSystem: true },
  { id: 'Shopping',        label: 'Shopping',           icon: '🛍️', color: '#EC4899', type: 'expense', userId: null, isDefault: true, sortOrder: 8,  isActive: true, isSystem: true },
  { id: 'Altro',           label: 'Altro',              icon: '📦', color: '#6B7280', type: 'expense', userId: null, isDefault: true, sortOrder: 9,  isActive: true, isSystem: true },
  { id: 'Stipendio',       label: 'Stipendio',          icon: '💼', color: '#10B981', type: 'income',  userId: null, isDefault: true, sortOrder: 10, isActive: true, isSystem: true },
  { id: 'Regalo',          label: 'Regalo',             icon: '🎁', color: '#F59E0B', type: 'income',  userId: null, isDefault: true, sortOrder: 11, isActive: true, isSystem: true },
  { id: 'Donazione',       label: 'Donazione',          icon: '🤝', color: '#8B5CF6', type: 'income',  userId: null, isDefault: true, sortOrder: 12, isActive: true, isSystem: true },
  { id: 'Freelance',       label: 'Freelance',          icon: '💻', color: '#3B82F6', type: 'income',  userId: null, isDefault: true, sortOrder: 13, isActive: true, isSystem: true },
  { id: 'Investimento',    label: 'Investimento',       icon: '📈', color: '#06B6D4', type: 'income',  userId: null, isDefault: true, sortOrder: 14, isActive: true, isSystem: true },
  { id: 'AltroEntrata',    label: 'Altro',              icon: '💰', color: '#6B7280', type: 'income',  userId: null, isDefault: true, sortOrder: 15, isActive: true, isSystem: true },
]

function transformCategory(db: DbCategory): CategoryItem {
  return {
    id: db.id,
    label: db.label,
    icon: db.icon,
    color: db.color,
    type: db.transaction_type as TransactionType,
    userId: db.user_id,
    isDefault: db.is_default,
    sortOrder: db.sort_order,
    isActive: db.is_active,
    isSystem: db.user_id === null,
  }
}

export function useCategories() {
  const { user, isAuthenticated } = useAuth()

  // All categories sorted by sort_order
  const allCategories = computed(() =>
    [...categories.value].sort((a, b) => a.sortOrder - b.sortOrder)
  )

  // Active expense categories for forms
  const expenseCategories = computed(() =>
    allCategories.value.filter(c => c.type === 'expense' && c.isActive)
  )

  // Active income categories for forms
  const incomeCategories = computed(() =>
    allCategories.value.filter(c => c.type === 'income' && c.isActive)
  )

  // All active categories (for forms — system first, then custom, by sort_order)
  const activeCategories = computed(() =>
    allCategories.value.filter(c => c.isActive)
  )

  // Only expense categories (active + inactive) for management UI
  const managedExpenseCategories = computed(() =>
    allCategories.value.filter(c => c.type === 'expense')
  )

  // Only income categories (active + inactive) for management UI
  const managedIncomeCategories = computed(() =>
    allCategories.value.filter(c => c.type === 'income')
  )

  // Custom (user-created) categories
  const customCategories = computed(() =>
    allCategories.value.filter(c => !c.isSystem)
  )

  async function fetchCategories() {
    loading.value = true
    error.value = null

    try {
      const { data, error: fetchError } = await supabase
        .from('categories')
        .select('*')
        .order('sort_order', { ascending: true })

      if (fetchError) throw fetchError

      if (data && data.length > 0) {
        categories.value = data.map(transformCategory)
      } else {
        // Fallback to hardcoded if DB returns nothing
        categories.value = [...FALLBACK_CATEGORIES]
      }
    } catch (e: any) {
      console.error('Failed to fetch categories:', e)
      error.value = e.message
      // Use fallback categories on error
      if (categories.value.length === 0) {
        categories.value = [...FALLBACK_CATEGORIES]
      }
    } finally {
      loading.value = false
    }
  }

  async function addCategory(data: {
    label: string
    icon: string
    color: string
    type: TransactionType
  }) {
    if (!user.value) throw new Error('Non autenticato')

    const maxOrder = categories.value
      .filter(c => c.type === data.type)
      .reduce((max, c) => Math.max(max, c.sortOrder), -1)

    const newId = `custom_${Date.now()}`

    const { data: newRow, error: insertError } = await supabase
      .from('categories')
      .insert({
        id: newId,
        label: data.label,
        icon: data.icon,
        color: data.color,
        user_id: user.value.id,
        is_default: false,
        sort_order: maxOrder + 1,
        is_active: true,
        transaction_type: data.type,
      })
      .select()
      .single()

    if (insertError) throw insertError

    categories.value.push(transformCategory(newRow))
    return newRow
  }

  async function updateCategory(id: string, data: Partial<{
    label: string
    icon: string
    color: string
    sortOrder: number
    isActive: boolean
  }>) {
    const updateData: Record<string, any> = {}
    if (data.label !== undefined) updateData.label = data.label
    if (data.icon !== undefined) updateData.icon = data.icon
    if (data.color !== undefined) updateData.color = data.color
    if (data.sortOrder !== undefined) updateData.sort_order = data.sortOrder
    if (data.isActive !== undefined) updateData.is_active = data.isActive

    const { error: updateError } = await supabase
      .from('categories')
      .update(updateData)
      .eq('id', id)

    if (updateError) throw updateError

    const idx = categories.value.findIndex(c => c.id === id)
    if (idx !== -1) {
      const cat = categories.value[idx]!
      if (data.label !== undefined) cat.label = data.label
      if (data.icon !== undefined) cat.icon = data.icon
      if (data.color !== undefined) cat.color = data.color
      if (data.sortOrder !== undefined) cat.sortOrder = data.sortOrder
      if (data.isActive !== undefined) cat.isActive = data.isActive
    }
  }

  async function archiveCategory(id: string) {
    return updateCategory(id, { isActive: false })
  }

  async function restoreCategory(id: string) {
    return updateCategory(id, { isActive: true })
  }

  async function deleteCategory(id: string) {
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)

    if (deleteError) throw deleteError

    categories.value = categories.value.filter(c => c.id !== id)
  }

  async function reorderCategory(id: string, direction: 'up' | 'down') {
    const cat = categories.value.find(c => c.id === id)
    if (!cat) return

    const sameType = categories.value
      .filter(c => c.type === cat.type)
      .sort((a, b) => a.sortOrder - b.sortOrder)

    const idx = sameType.findIndex(c => c.id === id)
    const swapIdx = direction === 'up' ? idx - 1 : idx + 1
    if (swapIdx < 0 || swapIdx >= sameType.length) return

    const other = sameType[swapIdx]!
    const tempOrder = cat.sortOrder
    cat.sortOrder = other.sortOrder
    other.sortOrder = tempOrder

    // Update both in DB
    await Promise.all([
      supabase.from('categories').update({ sort_order: cat.sortOrder }).eq('id', cat.id),
      supabase.from('categories').update({ sort_order: other.sortOrder }).eq('id', other.id),
    ])
  }

  // O(1) lookup
  function getCategoryById(id: string): CategoryItem | undefined {
    return categories.value.find(c => c.id === id)
  }

  // Initialize watchers once
  if (!initialized) {
    initialized = true

    watch(isAuthenticated, (authenticated) => {
      if (authenticated) {
        fetchCategories()
      } else {
        categories.value = []
      }
    }, { immediate: true })
  }

  return {
    categories: allCategories,
    expenseCategories,
    incomeCategories,
    activeCategories,
    managedExpenseCategories,
    managedIncomeCategories,
    customCategories,
    loading,
    error,
    fetchCategories,
    addCategory,
    updateCategory,
    archiveCategory,
    restoreCategory,
    deleteCategory,
    reorderCategory,
    getCategoryById,
  }
}
