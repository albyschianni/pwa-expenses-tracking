<template>
  <div class="px-4 py-6">
    <!-- Header with Add Button -->
    <div class="flex items-center justify-between mb-6">
      <div>
        <h1 class="text-xl font-bold text-white">Spese Ricorrenti</h1>
        <p class="text-gray-400 text-sm">
          {{ recurringExpenses.length }} {{ recurringExpenses.length === 1 ? 'spesa configurata' : 'spese configurate' }}
        </p>
      </div>
      <button
        @click="$emit('add-recurring')"
        class="flex items-center gap-2 px-4 py-2 bg-teal-400 text-gray-900 font-semibold rounded-xl active:bg-teal-500 transition-colors"
      >
        <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
        </svg>
        Aggiungi
      </button>
    </div>

    <!-- Empty State -->
    <div v-if="recurringExpenses.length === 0" class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
      </div>
      <p class="text-gray-400 mb-1">Nessuna spesa ricorrente</p>
      <p class="text-gray-500 text-sm">Configura spese che si ripetono ogni mese</p>
    </div>

    <!-- Recurring Expenses List -->
    <div v-else class="space-y-3">
      <div
        v-for="item in recurringExpenses"
        :key="item.id"
        class="flex items-center gap-3 p-4 bg-gray-800 rounded-2xl"
      >
        <!-- Category Icon -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
          :style="{ backgroundColor: item.categoryColor }"
        >
          {{ item.categoryIcon }}
        </div>

        <!-- Details (clickable for edit) -->
        <button
          @click="$emit('edit-recurring', item)"
          class="flex-1 min-w-0 text-left"
        >
          <p class="text-white font-medium truncate" :class="{ 'opacity-50': !item.enabled }">
            {{ item.description }}
          </p>
          <p class="text-gray-400 text-sm">
            Ogni {{ item.dayOfMonth }} del mese
          </p>
        </button>

        <!-- Amount -->
        <p class="text-white font-semibold whitespace-nowrap mr-2" :class="{ 'opacity-50': !item.enabled }">
          {{ formatAmount(item.amount) }}
        </p>

        <!-- Enable/Disable Toggle -->
        <button
          @click="handleToggle(item.id)"
          class="w-12 h-7 rounded-full transition-colors relative shrink-0"
          :class="item.enabled ? 'bg-teal-400' : 'bg-gray-600'"
        >
          <div
            class="absolute top-1 w-5 h-5 bg-white rounded-full transition-transform shadow"
            :class="item.enabled ? 'left-6' : 'left-1'"
          />
        </button>
      </div>
    </div>

    <!-- Info Card -->
    <div v-if="recurringExpenses.length > 0" class="mt-6 p-4 bg-gray-800/50 rounded-xl border border-gray-700">
      <div class="flex items-start gap-3">
        <svg class="w-5 h-5 text-teal-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <p class="text-gray-400 text-sm">
          Le spese ricorrenti vengono aggiunte automaticamente quando apri l'app nel giorno configurato.
        </p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRecurringExpenses, type RecurringExpense } from '../composables/useRecurringExpenses'
import { useCurrency } from '../composables/useCurrency'

defineEmits<{
  (e: 'add-recurring'): void
  (e: 'edit-recurring', item: RecurringExpense): void
}>()

const { recurringExpenses, toggleEnabled } = useRecurringExpenses()
const { formatAmount } = useCurrency()

async function handleToggle(id: string) {
  try {
    await toggleEnabled(id)
  } catch (e) {
    console.error('Failed to toggle recurring expense:', e)
  }
}
</script>
