<template>
  <div class="relative min-h-screen bg-gray-900">
    <!-- HEADER -->
    <AppHeader @open-month-picker="monthPickerOpen = true" />

    <!-- MAIN CONTENT -->
    <main class="pt-14 pb-20 overflow-y-auto">
      <HomePage />
    </main>

    <!-- TAB BAR (includes centered FAB) -->
    <TabBar @fab-click="sheetOpen = true" />

    <!-- ACTION SHEET -->
    <ActionSheet
      :open="sheetOpen"
      @close="sheetOpen = false"
      @select="handleSheetAction"
    />

    <!-- MONTH PICKER -->
    <MonthPicker
      :open="monthPickerOpen"
      @close="monthPickerOpen = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import AppHeader from "./components/AppHeader.vue"
import TabBar from "./components/TabBar.vue"
import ActionSheet from "./components/ActionSheet.vue"
import MonthPicker from "./components/MonthPicker.vue"
import HomePage from "./pages/HomePage.vue"

const sheetOpen = ref(false)
const monthPickerOpen = ref(false)

function handleSheetAction(actionId) {
  console.log('Selected action:', actionId)
  // TODO: navigate to expense/income/transfer form
}
</script>
