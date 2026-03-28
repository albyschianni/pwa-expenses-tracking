<template>
  <div class="px-4 py-6">
    <!-- Header with back + sync -->
    <div class="flex items-center justify-between mb-4">
      <div class="flex items-center gap-3">
        <button @click="$emit('back')" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 active:bg-gray-700">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white">Transazioni bancarie</h2>
          <p class="text-gray-400 text-sm mt-0.5">
            {{ bankTransactions.length }} transazioni importate
          </p>
        </div>
      </div>
      <button
        @click="handleSync"
        :disabled="syncing"
        class="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 text-sm font-medium active:bg-gray-700 transition-colors disabled:opacity-50"
        :class="syncing ? 'text-gray-400' : 'text-teal-400'"
      >
        <svg
          class="w-4 h-4"
          :class="{ 'animate-spin': syncing }"
          fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
        >
          <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
        </svg>
        {{ syncing ? 'Sync...' : 'Sincronizza' }}
      </button>
    </div>

    <!-- Filters -->
    <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
      <button
        @click="filter = 'all'"
        class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="filter === 'all' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'"
      >
        Tutte
      </button>
      <button
        @click="filter = 'uncategorized'"
        class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5"
        :class="filter === 'uncategorized' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'"
      >
        Da categorizzare
        <span
          v-if="pendingReviewCount > 0"
          class="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold"
        >{{ pendingReviewCount > 9 ? '9+' : pendingReviewCount }}</span>
      </button>
      <button
        @click="filter = 'income'"
        class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="filter === 'income' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'"
      >
        Entrate
      </button>
      <button
        @click="filter = 'expense'"
        class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
        :class="filter === 'expense' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'"
      >
        Uscite
      </button>
    </div>

    <!-- Sync success toast -->
    <Transition name="fade">
      <div v-if="syncResult !== null" class="bg-teal-500/15 border border-teal-500/30 rounded-xl p-3 mb-4 text-center">
        <p class="text-teal-400 text-sm font-medium">
          {{ syncResult > 0 ? `${syncResult} nuove transazioni importate` : 'Nessuna nuova transazione' }}
        </p>
      </div>
    </Transition>

    <!-- Empty state -->
    <div v-if="!loading && filteredTransactions.length === 0" class="text-center py-12">
      <div class="w-16 h-16 mx-auto bg-gray-800 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <p class="text-gray-500 text-sm">
        {{ filter === 'uncategorized' ? 'Nessuna transazione da categorizzare' : 'Nessuna transazione trovata' }}
      </p>
    </div>

    <!-- Transaction list -->
    <div v-else class="space-y-2">
      <button
        v-for="tx in filteredTransactions"
        :key="tx.id"
        @click="openCategorize(tx)"
        class="w-full bg-gray-800 rounded-xl p-4 flex items-center gap-3 active:bg-gray-700 transition-colors text-left"
      >
        <!-- Category icon or pending indicator -->
        <div
          class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
          :class="tx.categoryId ? 'bg-gray-700' : 'bg-amber-500/15'"
        >
          <span v-if="tx.categoryId && getCategoryIcon(tx.categoryId)" class="text-lg">
            {{ getCategoryIcon(tx.categoryId) }}
          </span>
          <div v-else class="w-2.5 h-2.5 rounded-full bg-amber-500" />
        </div>

        <!-- Info -->
        <div class="flex-1 min-w-0">
          <p class="text-white text-sm font-medium truncate">
            {{ tx.counterpartName || tx.description || 'Transazione' }}
          </p>
          <p class="text-gray-500 text-xs mt-0.5">
            {{ formatDate(tx.bookingDate) }}
            <span v-if="tx.categoryId" class="text-gray-600"> · {{ getCategoryLabel(tx.categoryId) }}</span>
          </p>
        </div>

        <!-- Amount -->
        <div class="text-right shrink-0">
          <p
            class="font-semibold text-sm"
            :class="tx.creditDebitIndicator === 'CRDT' ? 'text-green-400' : 'text-white'"
          >
            {{ tx.creditDebitIndicator === 'CRDT' ? '+' : '-' }}€{{ tx.amount.toFixed(2) }}
          </p>
          <p v-if="!tx.reviewed && !tx.categoryId" class="text-amber-400 text-xs mt-0.5">Da revisionare</p>
        </div>
      </button>
    </div>

    <!-- Categorize sheet -->
    <Transition name="slide-up">
      <div v-if="categorizeTarget" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/60" @click="categorizeTarget = null" />
        <div class="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
          <!-- Transaction info -->
          <div class="mb-4 pb-4 border-b border-gray-700">
            <p class="text-white font-medium">
              {{ categorizeTarget.counterpartName || categorizeTarget.description }}
            </p>
            <p class="text-gray-400 text-sm mt-1">
              {{ categorizeTarget.creditDebitIndicator === 'CRDT' ? '+' : '-' }}€{{ categorizeTarget.amount.toFixed(2) }}
              · {{ formatDate(categorizeTarget.bookingDate) }}
            </p>
          </div>

          <!-- Category grid -->
          <p class="text-gray-400 text-xs uppercase font-medium mb-3">Seleziona categoria</p>
          <div class="grid grid-cols-4 gap-2 mb-4">
            <button
              v-for="cat in availableCategories"
              :key="cat.id"
              @click="handleCategorize(cat.id)"
              class="flex flex-col items-center gap-1 p-3 rounded-xl bg-gray-700 active:bg-gray-600 transition-colors"
            >
              <span class="text-xl">{{ cat.icon }}</span>
              <span class="text-gray-300 text-[10px] text-center leading-tight truncate w-full">{{ cat.label }}</span>
            </button>
          </div>

          <!-- Ignore button -->
          <button
            @click="handleIgnore"
            class="w-full py-3 text-gray-400 text-sm font-medium border-t border-gray-700"
          >
            Ignora (non rilevante)
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBanking, type BankTransaction } from '../composables/useBanking'
import { useCategories } from '../composables/useCategories'

const emit = defineEmits<{
  back: []
}>()

const {
  bankTransactions,
  loading,
  syncing,
  pendingReviewCount,
  fetchBankTransactions,
  syncManual,
  categorizeTransaction,
  ignoreTransaction,
} = useBanking()

const { activeCategories, getCategoryById } = useCategories()

const filter = ref<'all' | 'uncategorized' | 'income' | 'expense'>('all')
const categorizeTarget = ref<BankTransaction | null>(null)
const syncResult = ref<number | null>(null)

const availableCategories = computed(() => {
  if (!categorizeTarget.value) return activeCategories.value
  const type = categorizeTarget.value.creditDebitIndicator === 'CRDT' ? 'income' : 'expense'
  return activeCategories.value.filter(c => c.type === type)
})

const filteredTransactions = computed(() => {
  let txs = bankTransactions.value

  switch (filter.value) {
    case 'uncategorized':
      return txs.filter(t => !t.categoryId && !t.reviewed)
    case 'income':
      return txs.filter(t => t.creditDebitIndicator === 'CRDT')
    case 'expense':
      return txs.filter(t => t.creditDebitIndicator === 'DBIT')
    default:
      return txs
  }
})

function getCategoryIcon(categoryId: string): string {
  const cat = getCategoryById(categoryId)
  return cat?.icon || ''
}

function getCategoryLabel(categoryId: string): string {
  const cat = getCategoryById(categoryId)
  return cat?.label || categoryId
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return d.toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}

function openCategorize(tx: BankTransaction) {
  categorizeTarget.value = tx
}

async function handleCategorize(categoryId: string) {
  if (!categorizeTarget.value) return
  try {
    await categorizeTransaction(categorizeTarget.value.id, categoryId)
    categorizeTarget.value = null
  } catch (e) {
    console.error('Error categorizing:', e)
  }
}

async function handleIgnore() {
  if (!categorizeTarget.value) return
  try {
    await ignoreTransaction(categorizeTarget.value.id)
    categorizeTarget.value = null
  } catch (e) {
    console.error('Error ignoring:', e)
  }
}

async function handleSync() {
  try {
    const count = await syncManual()
    syncResult.value = count
    setTimeout(() => { syncResult.value = null }, 3000)
  } catch (e) {
    console.error('Sync error:', e)
  }
}

onMounted(() => fetchBankTransactions())
</script>

<style scoped>
.slide-up-enter-active,
.slide-up-leave-active {
  transition: all 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  opacity: 0;
}
.slide-up-enter-from > div:last-child,
.slide-up-leave-to > div:last-child {
  transform: translateY(100%);
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
