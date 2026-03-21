<template>
  <div class="px-4 py-6">
    <!-- Empty State -->
    <div v-if="displayExpenses.length === 0" class="text-center py-12">
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
        </svg>
      </div>
      <p class="text-gray-400 mb-1">Nessuna transazione da visualizzare</p>
      <p class="text-gray-500 text-sm">Aggiungi una transazione per vedere i grafici</p>
    </div>

    <!-- Charts Content -->
    <div v-else class="space-y-5">

      <!-- Balance Summary Row -->
      <div class="grid grid-cols-3 gap-2">
        <div class="bg-gray-800 rounded-2xl p-3 text-center">
          <p class="text-emerald-400 font-bold text-base">+{{ formatCurrency(displayTotalIncome) }}</p>
          <p class="text-gray-500 text-xs mt-0.5">Entrate</p>
        </div>
        <div class="bg-gray-800 rounded-2xl p-3 text-center">
          <p
            class="font-bold text-base"
            :class="displayBalance >= 0 ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ displayBalance >= 0 ? '+' : '' }}{{ formatCurrency(displayBalance) }}
          </p>
          <p class="text-gray-500 text-xs mt-0.5">Saldo</p>
        </div>
        <div class="bg-gray-800 rounded-2xl p-3 text-center">
          <p class="text-red-400 font-bold text-base">-{{ formatCurrency(displayTotalExpenses) }}</p>
          <p class="text-gray-500 text-xs mt-0.5">Uscite</p>
        </div>
      </div>

      <!-- User Filter (shared wallet only) -->
      <div v-if="activeWallet && walletMembers.length > 0" class="flex items-center gap-1.5 overflow-x-auto pb-1">
        <button
          @click="graphUserFilter = null"
          class="text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap shrink-0"
          :class="graphUserFilter === null ? 'bg-teal-400/20 text-teal-400' : 'bg-gray-800 text-gray-400 active:bg-gray-700'"
        >Tutti</button>
        <button
          v-for="m in walletMembers"
          :key="m.userId"
          @click="graphUserFilter = m.userId"
          class="text-xs px-3 py-1.5 rounded-full font-medium transition-colors whitespace-nowrap shrink-0"
          :class="graphUserFilter === m.userId ? 'bg-teal-400/20 text-teal-400' : 'bg-gray-800 text-gray-400 active:bg-gray-700'"
        >{{ m.displayName || m.email || 'Utente' }}</button>
      </div>

      <!-- Type Toggle -->
      <div class="flex bg-gray-800 rounded-xl p-1">
        <button
          @click="chartType = 'expense'"
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          :class="chartType === 'expense'
            ? 'bg-gray-700 text-red-400 shadow'
            : 'text-gray-400'"
        >
          Spese
        </button>
        <button
          @click="chartType = 'income'"
          class="flex-1 py-2 rounded-lg text-sm font-semibold transition-all"
          :class="chartType === 'income'
            ? 'bg-gray-700 text-emerald-400 shadow'
            : 'text-gray-400'"
        >
          Entrate
        </button>
      </div>

      <!-- No data for selected type -->
      <div v-if="filteredExpenses.length === 0" class="bg-gray-800 rounded-2xl p-8 text-center">
        <p class="text-gray-400 text-sm">
          Nessuna {{ chartType === 'income' ? 'entrata' : 'spesa' }} questo mese
        </p>
      </div>

      <template v-else>
        <!-- Summary Card for selected type -->
        <div class="bg-gray-800 rounded-2xl p-4">
          <div class="text-center">
            <p
              class="text-3xl font-bold mb-1"
              :class="chartType === 'income' ? 'text-emerald-400' : 'text-white'"
            >
              {{ chartType === 'income' ? '+' : '' }}{{ formatCurrency(filteredTotal) }}
            </p>
            <p class="text-gray-400 text-sm">
              {{ filteredExpenses.length }} {{ filteredExpenses.length === 1 ? 'transazione' : 'transazioni' }}
              <span v-if="filteredAverage > 0"> · {{ formatCurrency(filteredAverage) }}/media</span>
            </p>
          </div>
        </div>

        <!-- Doughnut Chart -->
        <div class="bg-gray-800 rounded-2xl p-4">
          <h3 class="text-white font-semibold mb-4">
            {{ chartType === 'income' ? 'Entrate per categoria' : 'Spese per categoria' }}
          </h3>
          <div class="relative mx-auto" style="max-width: 280px;">
            <Doughnut :data="doughnutData" :options="doughnutOptions" :key="chartType" />
            <!-- Center Text -->
            <div class="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div class="text-center">
                <p class="text-2xl font-bold text-white">{{ formatCurrency(filteredTotal) }}</p>
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
              v-for="cat in sortedCategories"
              :key="cat.categoryId"
              class="space-y-2"
            >
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-2">
                  <span class="text-lg">{{ cat.config.icon }}</span>
                  <span class="text-white text-sm">{{ cat.config.label }}</span>
                </div>
                <div class="flex items-center gap-2">
                  <span
                    class="font-semibold text-sm"
                    :class="chartType === 'income' ? 'text-emerald-400' : 'text-white'"
                  >
                    {{ chartType === 'income' ? '+' : '' }}{{ formatCurrency(cat.amount) }}
                  </span>
                  <span class="text-gray-400 text-xs w-10 text-right">{{ getPercentage(cat.amount) }}%</span>
                </div>
              </div>
              <!-- Progress Bar -->
              <div class="h-2 bg-gray-700 rounded-full overflow-hidden">
                <div
                  class="h-full rounded-full transition-all duration-300"
                  :style="{
                    width: getPercentage(cat.amount) + '%',
                    backgroundColor: cat.config.color
                  }"
                />
              </div>
            </div>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { Doughnut } from 'vue-chartjs'
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
} from 'chart.js'
import { useExpenses } from '../composables/useExpenses'
import { useCurrency } from '../composables/useCurrency'
import { useSharedWallets } from '../composables/useSharedWallets'

ChartJS.register(ArcElement, Tooltip)

const { expenses, balance, totalExpenses, totalIncome, getCategoryConfig } = useExpenses()
const { formatAmount } = useCurrency()
const { activeWallet, walletMembers, walletTransactions, walletBalance, walletTotalExpenses, walletTotalIncome } = useSharedWallets()

// User filter for shared wallet charts
const graphUserFilter = ref<string | null>(null)

// Data source: personal or shared wallet
const displayExpenses = computed(() =>
  activeWallet.value ? walletTransactions.value : expenses.value
)
const displayBalance = computed(() =>
  activeWallet.value ? walletBalance.value : balance.value
)
const displayTotalExpenses = computed(() =>
  activeWallet.value ? walletTotalExpenses.value : totalExpenses.value
)
const displayTotalIncome = computed(() =>
  activeWallet.value ? walletTotalIncome.value : totalIncome.value
)

// Toggle: which type to chart
const chartType = ref<'expense' | 'income'>('expense')

// Transactions filtered by selected type (and user if shared wallet)
const filteredExpenses = computed(() => {
  let source = displayExpenses.value
  if (activeWallet.value && graphUserFilter.value) {
    source = source.filter((e: any) => e.userId === graphUserFilter.value)
  }
  return source.filter(e => e.type === chartType.value)
})

const filteredTotal = computed(() =>
  filteredExpenses.value.reduce((sum, e) => sum + e.amount, 0)
)

const filteredAverage = computed(() => {
  if (filteredExpenses.value.length === 0) return 0
  return filteredTotal.value / filteredExpenses.value.length
})

// Group by category for selected type
const categoryTotals = computed(() => {
  const totals = new Map<string, number>()
  filteredExpenses.value.forEach((e: any) => {
    const catId = e.category || e.category_id
    totals.set(catId, (totals.get(catId) || 0) + e.amount)
  })
  return totals
})

const sortedCategories = computed(() => {
  return [...categoryTotals.value.entries()]
    .sort((a, b) => b[1] - a[1])
    .filter(([, amount]) => amount > 0)
    .map(([categoryId, amount]) => ({
      categoryId,
      amount,
      config: getCategoryConfig(categoryId),
    }))
})

function getPercentage(amount: number): number {
  if (filteredTotal.value === 0) return 0
  return Math.round((amount / filteredTotal.value) * 100)
}

const formatCurrency = (amount: number) => formatAmount(amount)

const doughnutData = computed(() => ({
  labels: sortedCategories.value.map(cat => cat.config.label),
  datasets: [{
    data: sortedCategories.value.map(cat => cat.amount),
    backgroundColor: sortedCategories.value.map(cat => cat.config.color),
    borderWidth: 0,
    hoverOffset: 4,
  }]
}))

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
          return `${formatAmount(value)} (${percentage}%)`
        }
      }
    }
  }
}
</script>
