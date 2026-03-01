import { ref, computed } from 'vue'
import { CATEGORIES } from './useExpenses'

export interface CategoryPreference {
  id: string
  visible: boolean
  order: number
}

const STORAGE_KEY = 'expense-tracker-categories'

// Build default preferences from CATEGORIES
function getDefaults(): CategoryPreference[] {
  return CATEGORIES.map((cat, i) => ({
    id: cat.id,
    visible: true,
    order: i,
  }))
}

function loadPreferences(): CategoryPreference[] {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      const prefs: CategoryPreference[] = JSON.parse(stored)
      // Merge with defaults in case new categories were added
      const defaults = getDefaults()
      const prefMap = new Map(prefs.map(p => [p.id, p]))
      return defaults.map((d) => {
        const saved = prefMap.get(d.id)
        return saved ? { ...d, visible: saved.visible, order: saved.order } : d
      })
    }
  } catch (e) {
    // ignore
  }
  return getDefaults()
}

function savePreferences(prefs: CategoryPreference[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(prefs))
  } catch (e) {
    // ignore
  }
}

// Shared reactive state
const preferences = ref<CategoryPreference[]>(loadPreferences())

export function useCategories() {
  // All categories with their full config + visibility, sorted by user order
  const orderedCategories = computed(() => {
    return [...preferences.value]
      .sort((a, b) => a.order - b.order)
      .map(pref => {
        const cat = CATEGORIES.find(c => c.id === pref.id)
        return {
          ...cat!,
          visible: pref.visible,
          order: pref.order,
        }
      })
  })

  // Only visible categories, in user order — used by ExpenseDialog
  const visibleCategories = computed(() => {
    return orderedCategories.value.filter(c => c.visible)
  })

  function toggleCategory(id: string) {
    const pref = preferences.value.find(p => p.id === id)
    if (!pref) return
    // Don't allow hiding all categories — keep at least one visible
    const visibleCount = preferences.value.filter(p => p.visible).length
    if (pref.visible && visibleCount <= 1) return
    pref.visible = !pref.visible
    savePreferences(preferences.value)
  }

  function moveCategory(id: string, direction: 'up' | 'down') {
    const sorted = [...preferences.value].sort((a, b) => a.order - b.order)
    const index = sorted.findIndex(p => p.id === id)
    if (index === -1) return
    const swapIndex = direction === 'up' ? index - 1 : index + 1
    if (swapIndex < 0 || swapIndex >= sorted.length) return

    // Swap orders
    const tempOrder = sorted[index]!.order
    sorted[index]!.order = sorted[swapIndex]!.order
    sorted[swapIndex]!.order = tempOrder

    // Update the ref with the new orders
    preferences.value = sorted
    savePreferences(preferences.value)
  }

  function resetToDefaults() {
    preferences.value = getDefaults()
    savePreferences(preferences.value)
  }

  return {
    orderedCategories,
    visibleCategories,
    toggleCategory,
    moveCategory,
    resetToDefaults,
  }
}
