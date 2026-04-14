import { ref, computed, watch } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useSelectedMonth } from './useSelectedMonth'
import { useExpenses } from './useExpenses'

export interface BudgetTemplate {
  id: string
  categoryId: string
  amount: number
}

export interface MonthlyBudget {
  id: string
  categoryId: string
  monthKey: string
  amount: number
}

export interface BudgetStatus {
  categoryId: string
  budgeted: number
  spent: number
  remaining: number
  percentage: number  // 0-100+
}

// Singleton state
const templates = ref<BudgetTemplate[]>([])
const monthlyBudgets = ref<MonthlyBudget[]>([])
const loading = ref(false)
let loadedMonth: string | null = null
let watcherInitialized = false

export function useBudgets() {
  const { user, isAuthenticated } = useAuth()
  const { monthKey } = useSelectedMonth()
  const { expenses } = useExpenses()

  async function fetchTemplates() {
    if (!user.value) return
    const { data, error } = await supabase
      .from('budget_templates')
      .select('id, category_id, amount')
      .eq('user_id', user.value.id)
      .order('created_at')

    if (error) { console.error('fetchTemplates:', error); return }
    templates.value = (data || []).map(r => ({
      id: r.id,
      categoryId: r.category_id,
      amount: Number(r.amount),
    }))
  }

  async function fetchMonthlyBudgets(month: string) {
    if (!user.value) return
    const { data, error } = await supabase
      .from('budgets')
      .select('id, category_id, month_key, amount')
      .eq('user_id', user.value.id)
      .eq('month_key', month)

    if (error) { console.error('fetchMonthlyBudgets:', error); return }
    monthlyBudgets.value = (data || []).map(r => ({
      id: r.id,
      categoryId: r.category_id,
      monthKey: r.month_key,
      amount: Number(r.amount),
    }))
    loadedMonth = month
  }

  // Genera istanze mensili dai template se non esistono ancora per quel mese
  async function ensureMonthlyBudgets(month: string) {
    if (!user.value || templates.value.length === 0) return
    const existingIds = new Set(monthlyBudgets.value.map(b => b.categoryId))
    const missing = templates.value.filter(t => !existingIds.has(t.categoryId))
    if (missing.length === 0) return

    const rows = missing.map(t => ({
      user_id: user.value!.id,
      category_id: t.categoryId,
      month_key: month,
      amount: t.amount,
    }))

    const { data, error } = await supabase
      .from('budgets')
      .upsert(rows, { onConflict: 'user_id,category_id,month_key' })
      .select('id, category_id, month_key, amount')

    if (error) { console.error('ensureMonthlyBudgets:', error); return }
    const newBudgets: MonthlyBudget[] = (data || []).map(r => ({
      id: r.id,
      categoryId: r.category_id,
      monthKey: r.month_key,
      amount: Number(r.amount),
    }))
    monthlyBudgets.value = [
      ...monthlyBudgets.value.filter(b => !newBudgets.find(n => n.categoryId === b.categoryId)),
      ...newBudgets,
    ]
  }

  async function init() {
    if (!user.value) return
    loading.value = true
    // Le prime due query sono indipendenti — parallelizzare
    await Promise.all([fetchTemplates(), fetchMonthlyBudgets(monthKey.value)])
    await ensureMonthlyBudgets(monthKey.value)
    loading.value = false
  }

  async function refreshForMonth(month: string) {
    if (loadedMonth === month) return
    loading.value = true
    await fetchMonthlyBudgets(month)
    await ensureMonthlyBudgets(month)
    loading.value = false
  }

  // Salva o aggiorna un template (e upsert il budget del mese corrente)
  async function setTemplate(categoryId: string, amount: number) {
    if (!user.value) return

    const { data, error } = await supabase
      .from('budget_templates')
      .upsert({
        user_id: user.value.id,
        category_id: categoryId,
        amount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,category_id' })
      .select('id, category_id, amount')
      .single()

    if (error) throw error

    const idx = templates.value.findIndex(t => t.categoryId === categoryId)
    const tpl: BudgetTemplate = { id: data.id, categoryId: data.category_id, amount: Number(data.amount) }
    if (idx !== -1) templates.value[idx] = tpl
    else templates.value.push(tpl)

    // Upsert budget mese corrente
    const { data: bd, error: be } = await supabase
      .from('budgets')
      .upsert({
        user_id: user.value.id,
        category_id: categoryId,
        month_key: monthKey.value,
        amount,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id,category_id,month_key' })
      .select('id, category_id, month_key, amount')
      .single()

    if (!be && bd) {
      const mb: MonthlyBudget = { id: bd.id, categoryId: bd.category_id, monthKey: bd.month_key, amount: Number(bd.amount) }
      const mi = monthlyBudgets.value.findIndex(b => b.categoryId === categoryId)
      if (mi !== -1) monthlyBudgets.value[mi] = mb
      else monthlyBudgets.value.push(mb)
    }
  }

  async function deleteTemplate(categoryId: string) {
    if (!user.value) return
    await supabase.from('budget_templates').delete()
      .eq('user_id', user.value.id).eq('category_id', categoryId)
    templates.value = templates.value.filter(t => t.categoryId !== categoryId)
    monthlyBudgets.value = monthlyBudgets.value.filter(b => b.categoryId !== categoryId)
  }

  // Budget per il mese corrente: usa monthly se esiste, fallback su template
  const activeBudgets = computed(() => {
    const map = new Map<string, number>()
    templates.value.forEach(t => map.set(t.categoryId, t.amount))
    monthlyBudgets.value
      .filter(b => b.monthKey === monthKey.value)
      .forEach(b => map.set(b.categoryId, b.amount))
    return map  // categoryId → budgeted amount
  })

  function getBudgetStatus(categoryId: string): BudgetStatus | null {
    const budgeted = activeBudgets.value.get(categoryId)
    if (!budgeted) return null

    const spent = expenses.value
      .filter(e => e.category === categoryId && e.type === 'expense')
      .reduce((sum, e) => sum + e.amount, 0)

    return {
      categoryId,
      budgeted,
      spent,
      remaining: budgeted - spent,
      percentage: budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0,
    }
  }

  // Tutte le categorie con budget configurato e il loro stato
  // Pre-aggrega le spese per categoria in un singolo pass O(n) invece di O(n×m)
  const allBudgetStatuses = computed(() => {
    const spentByCategory = new Map<string, number>()
    for (const e of expenses.value) {
      if (e.type === 'expense') {
        spentByCategory.set(e.category, (spentByCategory.get(e.category) ?? 0) + e.amount)
      }
    }
    return [...activeBudgets.value.entries()]
      .map(([categoryId, budgeted]) => {
        const spent = spentByCategory.get(categoryId) ?? 0
        return {
          categoryId,
          budgeted,
          spent,
          remaining: budgeted - spent,
          percentage: budgeted > 0 ? Math.round((spent / budgeted) * 100) : 0,
        }
      })
  })

  const hasBudgets = computed(() => activeBudgets.value.size > 0)

  if (!watcherInitialized) {
    watcherInitialized = true
    watch(monthKey, (newMonth) => refreshForMonth(newMonth))

    watch(isAuthenticated, (authenticated) => {
      if (!authenticated) {
        templates.value = []
        monthlyBudgets.value = []
        loadedMonth = null
      }
    })
  }

  return {
    templates,
    monthlyBudgets,
    activeBudgets,
    loading,
    hasBudgets,
    init,
    refreshForMonth,
    setTemplate,
    deleteTemplate,
    getBudgetStatus,
    allBudgetStatuses,
  }
}
