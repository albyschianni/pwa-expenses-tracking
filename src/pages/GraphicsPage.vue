<template>
  <div class="px-4 py-6">
    <!-- Empty State -->
    <div v-if="expenses.length === 0" class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p class="text-gray-400 mb-1">Nessuna spesa da visualizzare</p>
      <p class="text-gray-500 text-sm">Aggiungi una spesa per vedere i grafici</p>
    </div>

    <!-- Charts Content -->
    <div v-else class="space-y-6">
      <!-- Summary Card -->
      <div class="bg-gray-800 rounded-2xl p-4">
        <div class="text-center">
          <p class="text-3xl font-bold text-white mb-1">
            {{ formatCurrency(totalExpenses) }}
          </p>
          <p class="text-gray-400 text-sm">
            {{ expenses.length }} {{ expenses.length === 1 ? 'transazione' : 'transazioni' }}
            <span v-if="averageExpense > 0"> · {{ formatCurrency(averageExpense) }}/media</span>
          </p>
        </div>
      </div>

      <!-- Doughnut Chart -->
      <div class="bg-gray-800 rounded-2xl p-4">
        <h3 class="text-white font-semibold mb-4">Spese per categoria</h3>
        <div class="relative mx-auto" style="max-width: 280px;">
          <Doughnut :data="doughnutData" :options="doughnutOptions" />
          <!-- Center Text -->
          <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div class="text-center">
              <p class="text-2xl font-bold text-white">{{ formatCurrency(totalExpenses) }}</p>
              <p class="text-gray-400 text-xs">Totale</p>
            </div>
          </div>
        </div>
      </div>

      <!-- Category List -->
      <div class="bg-gray-800 rounded-2xl p-4">
        <h3 class="text-white font-semibold mb-4">Dettaglio categorie</h3>
        <div class="space-y-4">
          <div
            v-for="[categoryId, amount] in sortedCategories"
            :key="categoryId"
            class="space-y-2"
          >
            <div class="flex items-center justify-between">
              <div class="flex items-center gap-2">
                <span class="text-lg">{{ getCategoryConfig(categoryId).icon }}</span>
                <span class="text-white text-sm">{{ getCategoryConfig(categoryId).label }}</span>
              </div>
              <div class="flex items-center gap-2">
                <span class="text-white font-semibold text-sm">{{ formatCurrency(amount) }}</span>
                <span class="text-gray-400 text-xs w-10 text-right">{{ getPercentage(amount) }}%</span>
              </div>
            </div>
            <!-- Progress Bar -->
            <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
              <div
                class="h-full rounded-full transition-all duration-300"
                :style="{
                  width: getPercentage(amount) + '%',
                  backgroundColor: getCategoryConfig(categoryId).color
                }"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js'
import { useExpenses } from '../composables/useExpenses'

// Register Chart.js components
ChartJS.register(ArcElement, Tooltip)

// Get expenses data
const { expenses, totalExpenses, getCategoryConfig } = useExpenses()

// Average expense
const averageExpense = computed(() => {
  if (expenses.value.length === 0) return 0
  return totalExpenses.value / expenses.value.length
})

// Group expenses by category
const categoryTotals = computed(() => {
  const totals = new Map<string, number>()
  expenses.value.forEach(e => {
    totals.set(e.category, (totals.get(e.category) || 0) + e.amount)
  })
  return totals
})

// Sorted by amount (highest first)
const sortedCategories = computed(() => {
  return [...categoryTotals.value.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, amount]) => amount > 0)
})

// Get percentage of total
function getPercentage(amount: number): number {
  if (totalExpenses.value === 0) return 0
  return Math.round((amount / totalExpenses.value) * 100)
}

// Format currency
function formatCurrency(amount: number): string {
  return '€' + amount.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

// Doughnut chart data
const doughnutData = computed(() => ({
  labels: sortedCategories.value.map(([cat]) => getCategoryConfig(cat).label),
  datasets: [{
    data: sortedCategories.value.map(([, amount]) => amount),
    backgroundColor: sortedCategories.value.map(([cat]) => getCategoryConfig(cat).color),
    borderWidth: 0,
    hoverOffset: 4,
  }]
}))

// Doughnut chart options
const doughnutOptions = {
  responsive: true,
  maintainAspectRatio: true,
  cutout: '65%',
  plugins: {
    legend: {
      display: false,
    },
    tooltip: {
      backgroundColor: '#1F2937',
      titleColor: '#F9FAFB',
      bodyColor: '#D1D5DB',
      borderColor: '#374151',
      borderWidth: 1,
      padding: 12,
      cornerRadius: 8,
      callbacks: {
        label: function(context: any) {
          const value = context.raw
          const total = context.dataset.data.reduce((a: number, b: number) => a + b, 0)
          const percentage = Math.round((value / total) * 100)
          return `€${value.toFixed(2)} (${percentage}%)`
        }
      }
    }
  }
}
</script>
