<template>
  <div class="px-4 py-6">
    <!-- Balance Hero -->
    <div class="text-center mb-8">
      <p class="text-4xl font-bold text-white mb-1">
        €{{ totalExpenses.toLocaleString('it-IT', { minimumFractionDigits: 2 }) }}
      </p>
      <p class="text-gray-400 text-sm">Spese totali di {{ displayMonth }}</p>
    </div>

    <!-- Empty State -->
    <div
      v-if="sortedExpenses.length === 0"
      class="text-center py-12"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-gray-400 mb-1">Nessuna spesa</p>
      <p class="text-gray-500 text-sm">Premi + per aggiungere una spesa</p>
    </div>

    <!-- Expense List -->
    <div v-else class="space-y-3">
      <button
        v-for="expense in sortedExpenses"
        :key="expense.id"
        @click="$emit('expense-click', expense)"
        class="w-full flex items-center gap-3 p-4 bg-gray-800 rounded-2xl active:bg-gray-700 transition-colors text-left"
      >
        <!-- Category Icon -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          :style="{ backgroundColor: expense.color }"
        >
          {{ expense.icon }}
        </div>

        <!-- Details -->
        <div class="flex-1 min-w-0">
          <p class="text-white font-medium truncate">{{ expense.description }}</p>
          <p class="text-gray-400 text-sm">{{ formatDate(expense.date) }}</p>
        </div>

        <!-- Amount -->
        <p class="text-white font-semibold whitespace-nowrap">
          -€{{ expense.amount.toFixed(2) }}
        </p>
      </button>
    </div>
  </div>
</template>

<script setup>
import { useSelectedMonth } from '../composables/useSelectedMonth'
import { useExpenses } from '../composables/useExpenses'

defineEmits(['expense-click'])

// Access shared month state - will be used for API filtering
const { displayMonth } = useSelectedMonth()

// Access shared expenses state
const { sortedExpenses, totalExpenses, formatDate } = useExpenses()
</script>
