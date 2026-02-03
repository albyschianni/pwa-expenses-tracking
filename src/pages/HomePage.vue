<template>
  <div class="px-4 py-6">
    <!-- Balance Hero -->
    <div class="text-center mb-8">
      <p class="text-4xl font-bold text-white mb-1">
        ${{ totalExpenses.toLocaleString('en-US', { minimumFractionDigits: 2 }) }}
      </p>
      <p class="text-gray-400 text-sm">Total Expenses this Month</p>
    </div>

    <!-- Expense List -->
    <div class="space-y-3">
      <div
        v-for="expense in expenses"
        :key="expense.id"
        class="flex items-center gap-3 p-4 bg-gray-800 rounded-2xl"
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
          <p class="text-white font-medium truncate">{{ expense.title }}</p>
          <p class="text-gray-400 text-sm">{{ expense.date }}</p>
        </div>

        <!-- Amount -->
        <p class="text-white font-semibold whitespace-nowrap">
          -${{ expense.amount.toFixed(2) }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useSelectedMonth } from '../composables/useSelectedMonth'

// Access shared month state - will be used for API filtering
const { monthKey, displayMonth } = useSelectedMonth()

// TODO: Replace with API call filtered by monthKey.value (e.g., "2024-01")
const expenses = [
  { id: 1, title: 'Dinner with friends', date: 'Jan 18, 2024', amount: 45.50, icon: '🍽️', color: '#F59E0B' },
  { id: 2, title: 'Morning Coffee', date: 'Jan 18, 2024', amount: 5.50, icon: '☕', color: '#8B5CF6' },
  { id: 3, title: 'Groceries & Pastry', date: 'Jan 17, 2024', amount: 78.30, icon: '🛒', color: '#10B981' },
  { id: 4, title: 'Monthly Rent', date: 'Jan 15, 2024', amount: 1200.00, icon: '🏠', color: '#3B82F6' },
  { id: 5, title: 'Spotify Premium', date: 'Jan 15, 2024', amount: 9.99, icon: '🎵', color: '#1DB954' },
  { id: 6, title: 'Uber Ride', date: 'Jan 14, 2024', amount: 18.75, icon: '🚗', color: '#000000' },
  { id: 7, title: 'Gym Membership', date: 'Jan 12, 2024', amount: 49.00, icon: '💪', color: '#EF4444' },
  { id: 8, title: 'Netflix', date: 'Jan 10, 2024', amount: 15.99, icon: '🎬', color: '#E50914' },
  { id: 9, title: 'Electric Bill', date: 'Jan 8, 2024', amount: 85.00, icon: '⚡', color: '#FBBF24' },
  { id: 10, title: 'Phone Bill', date: 'Jan 5, 2024', amount: 65.00, icon: '📱', color: '#6366F1' },
]

const totalExpenses = computed(() => {
  return expenses.reduce((sum, e) => sum + e.amount, 0)
})
</script>
