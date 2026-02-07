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
    <AppHeader @open-month-picker="monthPickerOpen = true" />

    <!-- MAIN CONTENT -->
    <main class="pt-14 pb-20 overflow-y-auto">
      <HomePage
        v-if="activeTab === 'home'"
        @expense-click="openExpenseDetail"
      />
      <div v-else-if="activeTab === 'graphic'" class="p-4 text-gray-400 text-center">
        <p class="text-lg">Graphics page coming soon</p>
      </div>
      <div v-else-if="activeTab === 'todo'" class="p-4 text-gray-400 text-center">
        <p class="text-lg">TODO page coming soon</p>
      </div>
      <SettingsPage v-else-if="activeTab === 'settings'" />
    </main>

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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import AppHeader from "./components/AppHeader.vue"
import TabBar from "./components/TabBar.vue"
import MonthPicker from "./components/MonthPicker.vue"
import ExpenseDialog from "./components/ExpenseDialog.vue"
import ExpenseDetailDialog from "./components/ExpenseDetailDialog.vue"
import HomePage from "./pages/HomePage.vue"
import AuthPage from "./pages/AuthPage.vue"
import SettingsPage from "./pages/SettingsPage.vue"
import { useExpenses, type Expense } from "./composables/useExpenses"
import { useAuth } from "./composables/useAuth"

const { addExpense, updateExpense, deleteExpense, fetchExpenses } = useExpenses()
const { isAuthenticated, loading: authLoading } = useAuth()

// Navigation state
const activeTab = ref('home')

// Dialog states
const monthPickerOpen = ref(false)
const expenseDialogOpen = ref(false)
const expenseDetailOpen = ref(false)

// Expense being edited (null = create mode)
const expenseToEdit = ref<Expense | null>(null)

// Selected expense for detail view
const selectedExpense = ref<Expense | null>(null)

// Fetch expenses when authenticated
onMounted(() => {
  if (isAuthenticated.value) {
    fetchExpenses()
  }
})

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
</script>
