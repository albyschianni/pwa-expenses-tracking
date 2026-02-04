<template>
  <div class="relative min-h-screen bg-gray-900">
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
      <div v-else-if="activeTab === 'settings'" class="p-4 text-gray-400 text-center">
        <p class="text-lg">Settings page coming soon</p>
      </div>
    </main>

    <!-- TAB BAR (includes centered FAB) -->
    <TabBar
      :active-tab="activeTab"
      @fab-click="openCreateExpense"
      @navigate="activeTab = $event"
    />

    <!--
      ============================================================
      ACTION SHEET - Commented out for future use
      This menu logic can be re-enabled when we want to offer
      multiple options (expense, income, transfer) from the FAB.
      ============================================================
    -->
    <!--
    <ActionSheet
      :open="sheetOpen"
      @close="sheetOpen = false"
      @select="handleSheetAction"
    />
    -->

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

<script setup>
import { ref } from 'vue'
import AppHeader from "./components/AppHeader.vue"
import TabBar from "./components/TabBar.vue"
// import ActionSheet from "./components/ActionSheet.vue" // Commented out - kept for future use
import MonthPicker from "./components/MonthPicker.vue"
import ExpenseDialog from "./components/ExpenseDialog.vue"
import ExpenseDetailDialog from "./components/ExpenseDetailDialog.vue"
import HomePage from "./pages/HomePage.vue"
import { useExpenses } from "./composables/useExpenses"

const { addExpense, updateExpense, deleteExpense, getExpense } = useExpenses()

// Navigation state
const activeTab = ref('home')

// Dialog states
const monthPickerOpen = ref(false)
const expenseDialogOpen = ref(false)
const expenseDetailOpen = ref(false)

// Expense being edited (null = create mode)
const expenseToEdit = ref(null)

// Selected expense for detail view
const selectedExpense = ref(null)

/*
  ============================================================
  ACTION SHEET LOGIC - Commented out for future use
  ============================================================

  const sheetOpen = ref(false)

  function handleSheetAction(actionId) {
    console.log('Selected action:', actionId)
    switch (actionId) {
      case 'expense':
        openCreateExpense()
        break
      case 'income':
        // TODO: Open income dialog
        break
      case 'transfer':
        // TODO: Open transfer dialog
        break
    }
  }
*/

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
function openExpenseDetail(expense) {
  selectedExpense.value = expense
  expenseDetailOpen.value = true
}

// ============================================================
// EDIT EXPENSE
// ============================================================
function openEditExpense(expense) {
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
function handleSaveExpense(data) {
  if (expenseToEdit.value) {
    // Update existing expense
    updateExpense(expenseToEdit.value.id, data)
  } else {
    // Create new expense
    addExpense(data)
  }
}

// ============================================================
// DELETE EXPENSE
// ============================================================
function handleDeleteExpense(expenseId) {
  deleteExpense(expenseId)
}
</script>
