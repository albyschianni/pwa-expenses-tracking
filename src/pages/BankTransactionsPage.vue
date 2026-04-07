<template>
  <div class="px-4 py-6">

    <!-- ─── VISTA AGGREGATA ─────────────────────────────────── -->
    <template v-if="!selectedConnection">

      <!-- Header -->
      <div class="flex items-center justify-between mb-4">
        <div class="flex items-center gap-3">
          <button @click="$emit('back')" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 active:bg-gray-700">
            <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h2 class="text-xl font-bold text-white">Transazioni bancarie</h2>
            <p class="text-gray-400 text-sm mt-0.5">{{ filteredTransactions.length }} transazioni</p>
          </div>
        </div>
        <button
          @click="handleSync"
          :disabled="syncing"
          class="flex items-center gap-2 bg-gray-800 rounded-xl px-3 py-2 text-sm font-medium active:bg-gray-700 transition-colors disabled:opacity-50"
          :class="syncing ? 'text-gray-400' : 'text-teal-400'"
        >
          <svg class="w-4 h-4" :class="{ 'animate-spin': syncing }" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          {{ syncing ? 'Sync...' : 'Sincronizza' }}
        </button>
      </div>


      <!-- Date range chip + picker -->
      <DateRangeFilter v-model:start="dateStart" v-model:end="dateEnd" class="mb-4" />

      <!-- Filtri tipo -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button @click="filter = 'all'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="filter === 'all' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Tutte</button>
        <button @click="filter = 'uncategorized'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1.5" :class="filter === 'uncategorized' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">
          Da categorizzare
          <span v-if="pendingReviewCount > 0" class="w-5 h-5 rounded-full bg-amber-500 text-white text-xs flex items-center justify-center font-bold">{{ pendingReviewCount > 9 ? '9+' : pendingReviewCount }}</span>
        </button>
        <button @click="filter = 'income'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="filter === 'income' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Entrate</button>
        <button @click="filter = 'expense'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="filter === 'expense' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Uscite</button>
      </div>

      <!-- Sync toast -->
      <Transition name="fade">
        <div v-if="syncResult !== null" class="bg-teal-500/15 border border-teal-500/30 rounded-xl p-3 mb-4 text-center">
          <p class="text-teal-400 text-sm font-medium">{{ syncResult > 0 ? `${syncResult} nuove transazioni importate` : 'Nessuna nuova transazione' }}</p>
        </div>
      </Transition>

      <!-- Lista -->
      <TransactionList
        :transactions="filteredTransactions"
        :loading="loading"
        :filter="filter"
        @categorize="openCategorize"
      />

    </template>

    <!-- ─── VISTA SINGOLO CONTO ─────────────────────────────── -->
    <template v-else>

      <!-- Header singolo conto -->
      <div class="flex items-center gap-3 mb-4">
        <button @click="selectedConnection = null" class="w-8 h-8 flex items-center justify-center rounded-full bg-gray-800 active:bg-gray-700">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h2 class="text-xl font-bold text-white">{{ selectedConnection.institutionName }}</h2>
          <p class="text-gray-400 text-sm mt-0.5">{{ filteredSingleTransactions.length }} transazioni</p>
        </div>
      </div>

      <!-- Date range chip + picker (singolo conto) -->
      <DateRangeFilter v-model:start="singleDateStart" v-model:end="singleDateEnd" class="mb-4" />

      <!-- Filtri tipo (singolo conto) -->
      <div class="flex gap-2 mb-4 overflow-x-auto pb-1">
        <button @click="singleFilter = 'all'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="singleFilter === 'all' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Tutte</button>
        <button @click="singleFilter = 'uncategorized'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="singleFilter === 'uncategorized' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Da categorizzare</button>
        <button @click="singleFilter = 'income'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="singleFilter === 'income' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Entrate</button>
        <button @click="singleFilter = 'expense'" class="shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors" :class="singleFilter === 'expense' ? 'bg-teal-400/15 text-teal-400' : 'bg-gray-800 text-gray-400'">Uscite</button>
      </div>

      <!-- Lista singolo conto -->
      <TransactionList
        :transactions="filteredSingleTransactions"
        :loading="loading"
        :filter="singleFilter"
        @categorize="openCategorize"
      />

    </template>

    <!-- ─── SHEET CATEGORIZZAZIONE ──────────────────────────── -->
    <Transition name="slide-up">
      <div v-if="categorizeTarget" class="fixed inset-0 z-50">
        <div class="absolute inset-0 bg-black/60" @click="categorizeTarget = null" />
        <div class="absolute bottom-0 left-0 right-0 bg-gray-800 rounded-t-2xl p-4 max-h-[70vh] overflow-y-auto">
          <div class="mb-4 pb-4 border-b border-gray-700">
            <p class="text-white font-medium">{{ categorizeTarget.counterpartName || categorizeTarget.description || 'Transazione' }}</p>
            <p class="text-gray-400 text-sm mt-1">
              {{ categorizeTarget.creditDebitIndicator === 'CRDT' ? '+' : '-' }}€{{ categorizeTarget.amount.toFixed(2) }}
              · {{ formatDate(categorizeTarget.bookingDate) }}
            </p>
          </div>
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
          <button @click="handleIgnore" class="w-full py-3 text-gray-400 text-sm font-medium border-t border-gray-700">
            Ignora (non rilevante)
          </button>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBanking, type BankTransaction, type BankConnection } from '../composables/useBanking'
import { useCategories } from '../composables/useCategories'
import DateRangeFilter from '../components/DateRangeFilter.vue'
import TransactionList from '../components/TransactionList.vue'

const props = defineProps<{ initialConnectionId?: string }>()
const emit = defineEmits<{ back: [] }>()

const {
  connections,
  bankTransactions,
  loading,
  syncing,
  pendingReviewCount,
  fetchBankTransactions,
  fetchConnections,
  syncManual,
  categorizeTransaction,
  ignoreTransaction,
} = useBanking()

const { activeCategories } = useCategories()

// ── Navigazione singolo conto ────────────────────────────────
// Inizializzazione sincrona da singleton se connectionId è già noto
const selectedConnection = ref<BankConnection | null>(
  props.initialConnectionId
    ? (connections.value.find(c => c.id === props.initialConnectionId) ?? null)
    : null
)

// ── Filtri vista aggregata ───────────────────────────────────
const filter = ref<'all' | 'uncategorized' | 'income' | 'expense'>('uncategorized')

const currentYear = new Date().getFullYear()
const dateStart = ref(`${currentYear}-01-01`)
const dateEnd   = ref(`${currentYear}-12-31`)

// ── Filtri vista singolo conto ───────────────────────────────
const singleFilter    = ref<'all' | 'uncategorized' | 'income' | 'expense'>('uncategorized')
const singleDateStart = ref(`${currentYear}-01-01`)
const singleDateEnd   = ref(`${currentYear}-12-31`)

// ── Categorizzazione ─────────────────────────────────────────
const categorizeTarget = ref<BankTransaction | null>(null)
const syncResult       = ref<number | null>(null)

const availableCategories = computed(() => {
  if (!categorizeTarget.value) return activeCategories.value
  const type = categorizeTarget.value.creditDebitIndicator === 'CRDT' ? 'income' : 'expense'
  return activeCategories.value.filter(c => c.type === type)
})

// ── Helper: transazione senza dati (prepagata/unknown) ───────
function isEmptyCardTx(tx: BankTransaction): boolean {
  const noDescription = !tx.description || tx.description.toLowerCase().trim() === 'transazione'
  const noCounterpart = !tx.counterpartName && !tx.counterpartIban
  const noExternalId  = !tx.externalId || tx.externalId.startsWith('synthetic_')
  return noDescription && noCounterpart && noExternalId
}

// ── Filtraggio condiviso ─────────────────────────────────────
function applyDateRange(txs: BankTransaction[], start: string, end: string) {
  return txs.filter(t => {
    if (!t.bookingDate) return false
    return t.bookingDate >= start && t.bookingDate <= end
  })
}

function applyTypeFilter(
  txs: BankTransaction[],
  f: 'all' | 'uncategorized' | 'income' | 'expense'
) {
  switch (f) {
    case 'uncategorized':
      return txs.filter(t => !t.categoryId && !t.reviewed && !t.isInternalTransfer && !isEmptyCardTx(t))
    case 'income':
      return txs.filter(t => t.creditDebitIndicator === 'CRDT')
    case 'expense':
      return txs.filter(t => t.creditDebitIndicator === 'DBIT')
    default:
      return txs
  }
}

// ── Lista aggregata filtrata ─────────────────────────────────
const filteredTransactions = computed(() => {
  const inRange = applyDateRange(bankTransactions.value, dateStart.value, dateEnd.value)
  return applyTypeFilter(inRange, filter.value)
})

// ── Lista singolo conto filtrata ─────────────────────────────
const singleConnectionTransactions = computed(() =>
  selectedConnection.value
    ? bankTransactions.value.filter(t => t.connectionId === selectedConnection.value!.id)
    : []
)

const filteredSingleTransactions = computed(() => {
  const inRange = applyDateRange(singleConnectionTransactions.value, singleDateStart.value, singleDateEnd.value)
  return applyTypeFilter(inRange, singleFilter.value)
})

// ── Utils ────────────────────────────────────────────────────
function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
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

onMounted(async () => {
  await fetchConnections()
  // Se manca ancora la connessione (prima apertura, singleton vuoto), cercala adesso
  if (props.initialConnectionId && !selectedConnection.value) {
    selectedConnection.value = connections.value.find(c => c.id === props.initialConnectionId) ?? null
  }
  // Fetch transazioni: se siamo in vista singolo conto, filtra già server-side
  await fetchBankTransactions(
    selectedConnection.value ? { connectionId: selectedConnection.value.id } : undefined
  )
})
</script>

<style scoped>
.slide-up-enter-active, .slide-up-leave-active { transition: all 0.3s ease; }
.slide-up-enter-from, .slide-up-leave-to { opacity: 0; }
.slide-up-enter-from > div:last-child, .slide-up-leave-to > div:last-child { transform: translateY(100%); }
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
