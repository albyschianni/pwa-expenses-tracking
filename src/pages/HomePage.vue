<template>
  <div class="px-4 pt-1 pb-3">
    <!-- Balance Hero -->
    <div class="text-center mb-4">
      <p class="text-4xl font-bold text-white mb-1">
        {{ formatAmount(totalExpenses) }}
      </p>
      <p class="text-gray-400 text-sm">Spese totali di {{ displayMonth }}</p>
    </div>

    <!-- Empty State -->
    <div
      v-if="expenses.length === 0"
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

    <!-- Sort Control -->
    <div v-if="expenses.length > 0" class="flex items-center justify-end mb-2 relative">
      <button
        @click="sortDropdownOpen = !sortDropdownOpen"
        class="flex items-center gap-1.5 text-gray-400 text-xs px-2 py-1 rounded-lg active:bg-gray-800 transition-colors"
      >
        <svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12" />
        </svg>
        {{ sortLabel }}
        <svg class="w-3 h-3 transition-transform" :class="sortDropdownOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      <!-- Dropdown -->
      <Transition name="dropdown">
        <div
          v-if="sortDropdownOpen"
          class="absolute right-0 top-full mt-1 bg-gray-800 rounded-xl shadow-lg shadow-black/40 border border-gray-700 overflow-hidden z-10 min-w-[160px]"
        >
          <button
            v-for="mode in sortOrder"
            :key="mode"
            @click="selectSortMode(mode)"
            class="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
            :class="sortMode === mode ? 'text-teal-400 bg-teal-400/10' : 'text-gray-300 active:bg-gray-700'"
          >
            <svg v-if="sortMode === mode" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
            </svg>
            <span v-else class="w-3.5 shrink-0" />
            {{ sortLabels[mode] }}
          </button>
        </div>
      </Transition>
    </div>

    <!-- Dropdown backdrop -->
    <div v-if="sortDropdownOpen" class="fixed inset-0 z-0" @click="sortDropdownOpen = false" />

    <!-- Expense List -->
    <div v-if="localSorted.length > 0" class="space-y-3">
      <button
        v-for="expense in localSorted"
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
          -{{ formatAmount(expense.amount) }}
        </p>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSelectedMonth } from '../composables/useSelectedMonth'
import { useExpenses } from '../composables/useExpenses'
import { useCurrency } from '../composables/useCurrency'

defineEmits(['expense-click'])

// Access shared month state - will be used for API filtering
const { displayMonth } = useSelectedMonth()

// Access shared expenses state — use raw expenses, not pre-sorted (we sort locally)
const { expenses, totalExpenses, formatDate } = useExpenses()

// Currency formatting
const { formatAmount } = useCurrency()

// Sorting
type SortMode = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc'
const sortMode = ref<SortMode>('date-desc')

const sortLabels: Record<SortMode, string> = {
  'date-desc': 'Pi\u00f9 recenti',
  'date-asc': 'Meno recenti',
  'price-desc': 'Pi\u00f9 costose',
  'price-asc': 'Meno costose',
}

const sortLabel = computed(() => sortLabels[sortMode.value])
const sortDropdownOpen = ref(false)

const sortOrder: SortMode[] = ['date-desc', 'date-asc', 'price-desc', 'price-asc']

function selectSortMode(mode: SortMode) {
  sortMode.value = mode
  sortDropdownOpen.value = false
}

// Single sort pass from raw expenses — uses string comparison for dates (ISO YYYY-MM-DD)
const localSorted = computed(() => {
  const list = [...expenses.value]
  switch (sortMode.value) {
    case 'date-desc':
      return list.sort((a, b) => b.date.localeCompare(a.date))
    case 'date-asc':
      return list.sort((a, b) => a.date.localeCompare(b.date))
    case 'price-desc':
      return list.sort((a, b) => b.amount - a.amount)
    case 'price-asc':
      return list.sort((a, b) => a.amount - b.amount)
    default:
      return list
  }
})
</script>

<style scoped>
.dropdown-enter-active,
.dropdown-leave-active {
  transition: opacity 0.15s ease, transform 0.15s ease;
}
.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
