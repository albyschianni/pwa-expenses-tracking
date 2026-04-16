import { ref } from 'vue'
import { useExpenses, type Expense, type TransactionType } from './useExpenses'
import { useRecurringExpenses, type RecurringExpense } from './useRecurringExpenses'
import { useSharedWallets } from './useSharedWallets'

export function useAppDialogs() {
  const { addExpense, updateExpense, deleteExpense, markBankTransactionReviewed } = useExpenses()
  const { addRecurringExpense, updateRecurringExpense, deleteRecurringExpense } = useRecurringExpenses()
  const { activeWallet, addWalletTransaction } = useSharedWallets()

  // Dialog visibility
  const monthPickerOpen = ref(false)
  const expenseDialogOpen = ref(false)
  const expenseDetailOpen = ref(false)
  const recurringDialogOpen = ref(false)
  const menuOpen = ref(false)
  const avatarViewerOpen = ref(false)
  const showPushPrompt = ref(false)

  // Dialog data
  const expenseToEdit = ref<Expense | null>(null)
  const selectedExpense = ref<Expense | null>(null)
  const recurringToEdit = ref<RecurringExpense | null>(null)

  // ── Expense handlers ──────────────────────────────────────

  function openCreateExpense() {
    expenseToEdit.value = null
    expenseDialogOpen.value = true
  }

  function openExpenseDetail(expense: Expense) {
    selectedExpense.value = expense
    expenseDetailOpen.value = true
    markBankTransactionReviewed(expense.id)
  }

  function openEditExpense(expense: Expense) {
    expenseDetailOpen.value = false
    expenseToEdit.value = expense
    expenseDialogOpen.value = true
  }

  function closeExpenseDialog() {
    expenseDialogOpen.value = false
    expenseToEdit.value = null
  }

  async function handleSaveExpense(data: {
    description: string
    date: string
    amount: number
    category: string
    type: TransactionType
  }) {
    try {
      if (expenseToEdit.value) {
        await updateExpense(expenseToEdit.value.id, data)
      } else if (activeWallet.value) {
        await addWalletTransaction(activeWallet.value.id, data)
      } else {
        await addExpense(data)
      }
      closeExpenseDialog()
    } catch (e) {
      console.error('Failed to save expense:', e)
    }
  }

  async function handleDeleteExpense(expenseId: string) {
    try {
      await deleteExpense(expenseId)
    } catch (e) {
      console.error('Failed to delete expense:', e)
    }
  }

  // ── Recurring handlers ────────────────────────────────────

  function openCreateRecurring() {
    recurringToEdit.value = null
    recurringDialogOpen.value = true
  }

  function openEditRecurring(item: RecurringExpense) {
    recurringToEdit.value = item
    recurringDialogOpen.value = true
  }

  function closeRecurringDialog() {
    recurringDialogOpen.value = false
    recurringToEdit.value = null
  }

  async function handleSaveRecurring(data: {
    description: string
    amount: number
    category: string
    dayOfMonth: number
    type: TransactionType
  }) {
    try {
      if (recurringToEdit.value) {
        await updateRecurringExpense(recurringToEdit.value.id, data)
      } else {
        await addRecurringExpense(data)
      }
      closeRecurringDialog()
    } catch (e) {
      console.error('Failed to save recurring expense:', e)
    }
  }

  async function handleDeleteRecurring(id: string) {
    try {
      await deleteRecurringExpense(id)
      closeRecurringDialog()
    } catch (e) {
      console.error('Failed to delete recurring expense:', e)
    }
  }

  return {
    // Dialog visibility
    monthPickerOpen,
    expenseDialogOpen,
    expenseDetailOpen,
    recurringDialogOpen,
    menuOpen,
    avatarViewerOpen,
    showPushPrompt,

    // Dialog data
    expenseToEdit,
    selectedExpense,
    recurringToEdit,

    // Expense handlers
    openCreateExpense,
    openExpenseDetail,
    openEditExpense,
    closeExpenseDialog,
    handleSaveExpense,
    handleDeleteExpense,

    // Recurring handlers
    openCreateRecurring,
    openEditRecurring,
    closeRecurringDialog,
    handleSaveRecurring,
    handleDeleteRecurring,
  }
}
