<template>
  <!-- Loading State -->
  <div v-if="authLoading" class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <svg class="w-12 h-12 mx-auto text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p class="mt-4 text-gray-400">Caricamento...</p>
    </div>
  </div>

  <!-- Auth Page -->
  <AuthPage v-else-if="!isAuthenticated" />

  <!-- Main App -->
  <div v-else class="relative min-h-screen bg-gray-900">
    <!-- HEADER -->
    <AppHeader
      @open-month-picker="monthPickerOpen = true"
      @open-menu="menuOpen = true"
      @open-avatar="avatarViewerOpen = true"
    />

    <!-- MAIN CONTENT - Each tab has its own scroll container -->
    <div
      v-show="activeTab === 'home'"
      ref="homeScrollRef"
      class="fixed inset-0 top-16 bottom-16 overflow-y-auto bg-gray-900"
    >
      <HomePage @expense-click="openExpenseDetail" />
    </div>

    <div
      v-show="activeTab === 'graphic'"
      ref="graphicScrollRef"
      class="fixed inset-0 top-16 bottom-16 overflow-y-auto bg-gray-900"
    >
      <GraphicsPage />
    </div>

    <div
      v-show="activeTab === 'recurring'"
      ref="recurringScrollRef"
      class="fixed inset-0 top-16 bottom-16 overflow-y-auto bg-gray-900"
    >
      <RecurringPage
        @add-recurring="openCreateRecurring"
        @edit-recurring="openEditRecurring"
      />
    </div>

    <div
      v-show="activeTab === 'settings'"
      ref="settingsScrollRef"
      class="fixed inset-0 top-16 bottom-16 overflow-y-auto bg-gray-900"
    >
      <SettingsPage />
    </div>

    <!-- TAB BAR (includes centered FAB) -->
    <TabBar
      :active-tab="activeTab"
      @fab-click="openCreateExpense"
      @navigate="activeTab = $event"
    />

    <!-- MONTH PICKER -->
    <MonthPicker
      :open="monthPickerOpen"
      @close="monthPickerOpen = false"
    />

    <!-- EXPENSE DIALOG (Create / Edit) -->
    <ExpenseDialog
      :open="expenseDialogOpen"
      :expense="expenseToEdit"
      @close="closeExpenseDialog"
      @save="handleSaveExpense"
    />

    <!-- EXPENSE DETAIL DIALOG (View / Delete) -->
    <ExpenseDetailDialog
      :open="expenseDetailOpen"
      :expense="selectedExpense"
      @close="expenseDetailOpen = false"
      @edit="openEditExpense"
      @delete="handleDeleteExpense"
    />

    <!-- RECURRING EXPENSE DIALOG (Create / Edit) -->
    <RecurringExpenseDialog
      :open="recurringDialogOpen"
      :recurring-expense="recurringToEdit"
      @close="closeRecurringDialog"
      @save="handleSaveRecurring"
      @delete="handleDeleteRecurring"
    />

    <!-- SIDE DRAWER (Menu) -->
    <SideDrawer
      :open="menuOpen"
      @close="menuOpen = false"
    />

    <!-- AVATAR VIEWER -->
    <AvatarViewer
      :open="avatarViewerOpen"
      @close="avatarViewerOpen = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppHeader from "./components/AppHeader.vue"
import TabBar from "./components/TabBar.vue"
import MonthPicker from "./components/MonthPicker.vue"
import ExpenseDialog from "./components/ExpenseDialog.vue"
import ExpenseDetailDialog from "./components/ExpenseDetailDialog.vue"
import RecurringExpenseDialog from "./components/RecurringExpenseDialog.vue"
import SideDrawer from "./components/SideDrawer.vue"
import AvatarViewer from "./components/AvatarViewer.vue"
import HomePage from "./pages/HomePage.vue"
import GraphicsPage from "./pages/GraphicsPage.vue"
import AuthPage from "./pages/AuthPage.vue"
import SettingsPage from "./pages/SettingsPage.vue"
import RecurringPage from "./pages/RecurringPage.vue"
import { useExpenses, type Expense } from "./composables/useExpenses"
import { useAuth } from "./composables/useAuth"
import { useRecurringExpenses, type RecurringExpense } from "./composables/useRecurringExpenses"

const { addExpense, updateExpense, deleteExpense, fetchExpenses } = useExpenses()
const { isAuthenticated, loading: authLoading } = useAuth()
const {
  addRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  fetchRecurringExpenses,
  processAutoGeneration
} = useRecurringExpenses()

// Navigation state
const activeTab = ref('home')

// Scroll refs for each tab
const homeScrollRef = ref<HTMLElement | null>(null)
const graphicScrollRef = ref<HTMLElement | null>(null)
const recurringScrollRef = ref<HTMLElement | null>(null)
const settingsScrollRef = ref<HTMLElement | null>(null)

// Reset scroll to top when switching tabs
watch(activeTab, () => {
  const scrollRefs: Record<string, typeof homeScrollRef> = {
    home: homeScrollRef,
    graphic: graphicScrollRef,
    recurring: recurringScrollRef,
    settings: settingsScrollRef,
  }
  const ref = scrollRefs[activeTab.value]
  if (ref?.value) {
    ref.value.scrollTop = 0
  }
})

// Dialog states
const monthPickerOpen = ref(false)
const expenseDialogOpen = ref(false)
const expenseDetailOpen = ref(false)
const recurringDialogOpen = ref(false)
const menuOpen = ref(false)
const avatarViewerOpen = ref(false)

// Expense being edited (null = create mode)
const expenseToEdit = ref<Expense | null>(null)

// Selected expense for detail view
const selectedExpense = ref<Expense | null>(null)

// Recurring expense being edited (null = create mode)
const recurringToEdit = ref<RecurringExpense | null>(null)

// Fetch expenses and recurring expenses when authenticated
watch(isAuthenticated, async (authenticated) => {
  if (authenticated) {
    await fetchExpenses()
    await fetchRecurringExpenses()
    await processAutoGeneration()
  }
}, { immediate: true })

// ============================================================
// CREATE EXPENSE
// ============================================================
function openCreateExpense() {
  expenseToEdit.value = null
  expenseDialogOpen.value = true
}

// ============================================================
// VIEW EXPENSE DETAIL
// ============================================================
function openExpenseDetail(expense: Expense) {
  selectedExpense.value = expense
  expenseDetailOpen.value = true
}

// ============================================================
// EDIT EXPENSE
// ============================================================
function openEditExpense(expense: Expense) {
  expenseDetailOpen.value = false
  expenseToEdit.value = expense
  expenseDialogOpen.value = true
}

function closeExpenseDialog() {
  expenseDialogOpen.value = false
  expenseToEdit.value = null
}

// ============================================================
// SAVE EXPENSE (Create or Update)
// ============================================================
async function handleSaveExpense(data: { description: string; date: string; amount: number; category: string }) {
  try {
    if (expenseToEdit.value) {
      await updateExpense(expenseToEdit.value.id, data)
    } else {
      await addExpense(data)
    }
    closeExpenseDialog()
  } catch (e) {
    console.error('Failed to save expense:', e)
  }
}

// ============================================================
// DELETE EXPENSE
// ============================================================
async function handleDeleteExpense(expenseId: string) {
  try {
    await deleteExpense(expenseId)
  } catch (e) {
    console.error('Failed to delete expense:', e)
  }
}

// ============================================================
// RECURRING EXPENSES
// ============================================================
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

async function handleSaveRecurring(data: { description: string; amount: number; category: string; dayOfMonth: number }) {
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
</script>
