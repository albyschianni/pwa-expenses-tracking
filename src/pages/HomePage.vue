<template>
  <div class="px-4 pt-1 pb-3">
    <!-- Wallet Switcher -->
    <div v-if="availableWallets.length > 0" class="flex justify-center mb-3">
      <button
        @click="walletSwitcherOpen = !walletSwitcherOpen"
        class="flex items-center gap-2 px-4 py-1.5 rounded-full text-sm font-medium transition-colors"
        :class="activeWalletId ? 'bg-teal-400/15 text-teal-400 border border-teal-400/30' : 'bg-gray-700/60 text-gray-300 border border-gray-600'"
      >
        <svg v-if="!activeWalletId" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
        <svg v-else class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {{ activeWalletId ? activeWalletName : 'Personale' }}
        <svg class="w-3.5 h-3.5 transition-transform" :class="walletSwitcherOpen ? 'rotate-180' : ''" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
    </div>

    <!-- Wallet Switcher Dropdown -->
    <div v-if="walletSwitcherOpen" class="fixed inset-0 z-0" @click="walletSwitcherOpen = false" />
    <Transition name="dropdown">
      <div
        v-if="walletSwitcherOpen"
        class="relative z-10 mx-auto max-w-xs bg-gray-800 rounded-xl shadow-lg shadow-black/40 border border-gray-700 overflow-hidden mb-3"
      >
        <button
          @click="switchWallet(null)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors"
          :class="!activeWalletId ? 'text-teal-400 bg-teal-400/10' : 'text-gray-300 active:bg-gray-700'"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Personale
          <svg v-if="!activeWalletId" class="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
        <button
          v-for="w in availableWallets"
          :key="w.id"
          @click="switchWallet(w)"
          class="w-full flex items-center gap-3 px-4 py-3 text-left text-sm border-t border-gray-700/50 transition-colors"
          :class="activeWalletId === w.id ? 'text-teal-400 bg-teal-400/10' : 'text-gray-300 active:bg-gray-700'"
        >
          <svg class="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {{ w.name }}
          <svg v-if="activeWalletId === w.id" class="w-4 h-4 ml-auto shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        </button>
      </div>
    </Transition>

    <!-- Balance Hero -->
    <div class="text-center mb-4">
      <p
        class="text-4xl font-bold mb-1 transition-colors"
        :class="displayBalance > 0 ? 'text-emerald-400' : displayBalance < 0 ? 'text-red-400' : 'text-white'"
      >
        {{ displayBalance >= 0 ? '+' : '' }}{{ formatAmount(displayBalance) }}
      </p>
      <p class="text-gray-400 text-sm">{{ activeWalletId ? activeWalletName : `Saldo di ${displayMonth}` }}</p>

      <!-- Income / Expense breakdown -->
      <div v-if="displayTransactions.length > 0" class="flex justify-center items-stretch mt-3 gap-0">
        <div class="flex-1 flex flex-col items-center gap-0.5">
          <span class="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">Spese</span>
          <span class="text-base font-semibold text-red-400">-{{ formatAmount(displayTotalExpenses) }}</span>
        </div>
        <div class="w-px bg-gray-700 mx-4 self-stretch" />
        <div class="flex-1 flex flex-col items-center gap-0.5">
          <span class="text-[10px] font-semibold tracking-widest text-gray-500 uppercase">Entrate</span>
          <span class="text-base font-semibold text-emerald-400">+{{ formatAmount(displayTotalIncome) }}</span>
        </div>
      </div>
    </div>

    <!-- Empty State -->
    <div
      v-if="displayTransactions.length === 0"
      class="text-center py-12"
    >
      <div class="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <p class="text-gray-400 mb-1">Nessuna transazione</p>
      <p class="text-gray-500 text-sm">Premi + per aggiungere una transazione</p>
    </div>

    <!-- Sort + Filter Controls -->
    <div v-if="displayTransactions.length > 0" class="flex items-center justify-between mb-2 relative">
      <!-- Type Filter Pills -->
      <div class="flex items-center gap-1">
        <button
          @click="typeFilter = 'all'"
          class="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
          :class="typeFilter === 'all' ? 'bg-gray-600 text-white' : 'text-gray-500 active:bg-gray-800'"
        >Tutti</button>
        <button
          @click="typeFilter = 'expense'"
          class="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
          :class="typeFilter === 'expense' ? 'bg-red-400/20 text-red-400' : 'text-gray-500 active:bg-gray-800'"
        >Spese</button>
        <button
          @click="typeFilter = 'income'"
          class="text-xs px-2.5 py-1 rounded-full font-medium transition-colors"
          :class="typeFilter === 'income' ? 'bg-emerald-400/20 text-emerald-400' : 'text-gray-500 active:bg-gray-800'"
        >Entrate</button>
      </div>

      <!-- Sort Button -->
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
          class="absolute right-0 top-full mt-1 bg-gray-800 rounded-xl shadow-lg shadow-black/40 border border-gray-700 overflow-hidden z-10 min-w-[180px]"
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

          <!-- User filter (shared wallet only) -->
          <template v-if="activeWalletId && walletMembers.length > 0">
            <div class="border-t border-gray-700 mx-3 my-1" />
            <p class="px-4 pt-1.5 pb-1 text-[10px] font-semibold tracking-widest text-gray-500 uppercase">Utente</p>
            <button
              @click="userFilter = null; sortDropdownOpen = false"
              class="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
              :class="userFilter === null ? 'text-teal-400 bg-teal-400/10' : 'text-gray-300 active:bg-gray-700'"
            >
              <svg v-if="userFilter === null" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else class="w-3.5 shrink-0" />
              Tutti
            </button>
            <button
              v-for="m in walletMembers"
              :key="m.userId"
              @click="userFilter = m.userId; sortDropdownOpen = false"
              class="w-full flex items-center gap-2 px-4 py-2.5 text-left text-sm transition-colors"
              :class="userFilter === m.userId ? 'text-teal-400 bg-teal-400/10' : 'text-gray-300 active:bg-gray-700'"
            >
              <svg v-if="userFilter === m.userId" class="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
              <span v-else class="w-3.5 shrink-0" />
              {{ m.displayName || m.email || 'Utente' }}
            </button>
          </template>
        </div>
      </Transition>
    </div>

    <!-- Dropdown backdrop -->
    <div v-if="sortDropdownOpen" class="fixed inset-0 z-0" @click="sortDropdownOpen = false" />

    <!-- No results for active filter -->
    <p v-if="displayTransactions.length > 0 && localSorted.length === 0" class="text-center text-gray-500 text-sm py-8">
      Nessuna {{ typeFilter === 'expense' ? 'spesa' : 'entrata' }} questo mese
    </p>

    <!-- Transaction List -->
    <div v-if="localSorted.length > 0" class="space-y-3">
      <div
        v-for="expense in localSorted"
        :key="expense.id"
        class="relative overflow-hidden rounded-2xl"
      >
        <!-- Swipe action buttons (behind the card) -->
        <div class="absolute right-0 top-0 bottom-0 flex" style="width: 140px"
          :class="swipeOpenId === expense.id || (touchingId === expense.id && isDragging) ? 'opacity-100' : 'opacity-0 pointer-events-none'"
        >
          <button
            @click.stop="handleSwipeEdit(expense)"
            class="flex-1 flex flex-col items-center justify-center gap-1 bg-blue-500 active:bg-blue-600 transition-colors"
          >
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
            <span class="text-white text-xs font-medium">Modifica</span>
          </button>
          <button
            @click.stop="handleSwipeDelete(expense.id)"
            class="flex-1 flex flex-col items-center justify-center gap-1 bg-red-500 active:bg-red-600 transition-colors"
          >
            <svg class="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            <span class="text-white text-xs font-medium">Elimina</span>
          </button>
        </div>

        <!-- Swipeable card -->
        <div
          class="relative flex items-center gap-3 p-4 bg-gray-800 text-left w-full min-w-full"
          :style="getCardStyle(expense.id)"
          @click="handleCardClick(expense)"
          @touchstart.passive="onTouchStart($event, expense.id)"
          @touchmove.passive="onTouchMove"
          @touchend="onTouchEnd(expense.id)"
        >
          <!-- Category Icon: prepagata (no description, bank source) → ❓ su sfondo neutro -->
          <div
            v-if="expense.source === 'bank' && !expense.description"
            class="w-10 h-10 rounded-full flex items-center justify-center text-base shrink-0 bg-gray-700/50"
          >❓</div>
          <div
            v-else
            class="w-10 h-10 rounded-full flex items-center justify-center text-lg shrink-0"
            :style="{ backgroundColor: expense.color }"
          >
            {{ expense.icon }}
          </div>

          <!-- Details -->
          <div class="flex-1 min-w-0">
            <div class="flex items-center gap-2">
              <p
                class="font-medium truncate"
                :class="expense.source === 'bank' && !expense.description ? 'text-gray-400' : 'text-white'"
              >{{ expense.description || 'Pagamento prepagata' }}</p>
              <!-- Badge NEW: solo su transazioni bancarie con descrizione (non prepagata) -->
              <span
                v-if="expense.source === 'bank' && !expense.reviewed && expense.description"
                class="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-orange-500 text-white leading-none"
              >NEW</span>
            </div>
            <p class="text-gray-400 text-sm flex items-center gap-1">
              {{ formatDate(expense.date) }}
              <span v-if="expense.source === 'bank' && !expense.description" class="text-gray-500"> · Dati non disponibili</span>
              <svg v-else-if="expense.source === 'bank'" class="w-3 h-3 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
              </svg>
            </p>
          </div>

          <!-- Amount -->
          <p
            class="font-semibold whitespace-nowrap"
            :class="expense.type === 'income' ? 'text-emerald-400' : 'text-red-400'"
          >
            {{ expense.type === 'income' ? '+' : '-' }}{{ formatAmount(expense.amount) }}
          </p>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { useSelectedMonth } from '../composables/useSelectedMonth'
import { useExpenses } from '../composables/useExpenses'
import { useCurrency } from '../composables/useCurrency'
import { useSharedWallets, type SharedWallet } from '../composables/useSharedWallets'

const emit = defineEmits(['expense-click', 'expense-edit', 'expense-delete'])

const { displayMonth } = useSelectedMonth()
const { expenses, balance, totalExpenses, totalIncome, formatDate } = useExpenses()
const { formatAmount } = useCurrency()
const {
  wallets: availableWallets,
  activeWallet,
  walletMembers,
  walletTransactions,
  walletBalance,
  walletTotalExpenses,
  walletTotalIncome,
  setActiveWallet,
} = useSharedWallets()

// Wallet switcher state
const walletSwitcherOpen = ref(false)
const userFilter = ref<string | null>(null)

const activeWalletId = computed(() => activeWallet.value?.id || null)
const activeWalletName = computed(() => activeWallet.value?.name || '')

function switchWallet(wallet: SharedWallet | null) {
  setActiveWallet(wallet)
  walletSwitcherOpen.value = false
  userFilter.value = null
}

// Unified transaction type for display
interface DisplayTransaction {
  id: string
  description: string
  date: string
  amount: number
  category: string
  icon: string
  color: string
  type: 'expense' | 'income'
  source?: 'manual' | 'bank'
  reviewed?: boolean
  userId?: string
  userEmail?: string
  userDisplayName?: string
}

// Display computed values: personal or wallet
const displayTransactions = computed<DisplayTransaction[]>(() => {
  if (activeWalletId.value) {
    return walletTransactions.value
  }
  return expenses.value
})

const displayBalance = computed(() =>
  activeWalletId.value ? walletBalance.value : balance.value
)

const displayTotalExpenses = computed(() =>
  activeWalletId.value ? walletTotalExpenses.value : totalExpenses.value
)

const displayTotalIncome = computed(() =>
  activeWalletId.value ? walletTotalIncome.value : totalIncome.value
)

// Type filter
type TypeFilter = 'all' | 'expense' | 'income'
const typeFilter = ref<TypeFilter>('all')

// Sorting
type SortMode = 'date-desc' | 'date-asc' | 'price-desc' | 'price-asc'
const sortMode = ref<SortMode>('date-desc')

const sortLabels: Record<SortMode, string> = {
  'date-desc': 'Più recenti',
  'date-asc': 'Meno recenti',
  'price-desc': 'Importo ↓',
  'price-asc': 'Importo ↑',
}

const sortLabel = computed(() => sortLabels[sortMode.value])
const sortDropdownOpen = ref(false)

const sortOrder: SortMode[] = ['date-desc', 'date-asc', 'price-desc', 'price-asc']

function selectSortMode(mode: SortMode) {
  sortMode.value = mode
  sortDropdownOpen.value = false
}

// ── Swipe actions ──────────────────────────────────────────
const SWIPE_OPEN_WIDTH = 140
const SWIPE_THRESHOLD = 60

const swipeOpenId = ref<string | null>(null)
const touchingId = ref('')
const isDragging = ref(false)
let touchStartX = 0
let touchStartY = 0
let touchCurrentX = 0

function getCardStyle(id: string) {
  const isOpen = swipeOpenId.value === id
  const isTouching = touchingId.value === id && isDragging.value
  if (isTouching) {
    const delta = Math.max(-SWIPE_OPEN_WIDTH, Math.min(0, touchCurrentX - touchStartX))
    return { transform: `translateX(${delta}px)`, transition: 'none' }
  }
  return {
    transform: `translateX(${isOpen ? -SWIPE_OPEN_WIDTH : 0}px)`,
    transition: 'transform 0.25s ease',
  }
}

function onTouchStart(e: TouchEvent, id: string) {
  const t = e.touches[0]
  if (!t) return
  touchStartX = t.clientX
  touchStartY = t.clientY
  touchCurrentX = touchStartX
  touchingId.value = id
  isDragging.value = false
}

function onTouchMove(e: TouchEvent) {
  const t = e.touches[0]
  if (!t) return
  touchCurrentX = t.clientX
  const dx = touchCurrentX - touchStartX
  const dy = t.clientY - touchStartY
  if (!isDragging.value && Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 5) {
    isDragging.value = true
    if (swipeOpenId.value && swipeOpenId.value !== touchingId.value) {
      swipeOpenId.value = null
    }
  }
}

function onTouchEnd(id: string) {
  if (isDragging.value) {
    const delta = touchCurrentX - touchStartX
    if (delta < -SWIPE_THRESHOLD) {
      swipeOpenId.value = id
    } else if (delta > SWIPE_THRESHOLD / 2) {
      swipeOpenId.value = null
    } else if (swipeOpenId.value !== id) {
      swipeOpenId.value = null
    }
  }
  isDragging.value = false
  touchingId.value = ''
}

function handleCardClick(expense: DisplayTransaction) {
  if (swipeOpenId.value) {
    swipeOpenId.value = null
    return
  }
  emit('expense-click', expense)
}

function handleSwipeEdit(expense: DisplayTransaction) {
  swipeOpenId.value = null
  emit('expense-edit', expense)
}

function handleSwipeDelete(id: string) {
  swipeOpenId.value = null
  emit('expense-delete', id)
}

// ── Sorting ────────────────────────────────────────────────
const localSorted = computed(() => {
  let source = displayTransactions.value
  // Apply user filter (shared wallet only)
  if (userFilter.value && activeWalletId.value) {
    source = source.filter((e: any) => e.userId === userFilter.value)
  }
  const filtered = typeFilter.value === 'all'
    ? [...source]
    : source.filter(e => e.type === typeFilter.value)
  switch (sortMode.value) {
    case 'date-desc':
      return filtered // già ordinato date-desc da Supabase
    case 'date-asc':
      return filtered.sort((a, b) => a.date.localeCompare(b.date))
    case 'price-desc':
      return filtered.sort((a, b) => b.amount - a.amount)
    case 'price-asc':
      return filtered.sort((a, b) => a.amount - b.amount)
    default:
      return filtered
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
