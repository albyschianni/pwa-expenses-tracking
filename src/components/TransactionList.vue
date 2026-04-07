<template>
  <!-- Empty state -->
  <div v-if="!loading && transactions.length === 0" class="text-center py-12">
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
      v-for="tx in transactions"
      :key="tx.id"
      @click="$emit('categorize', tx)"
      class="w-full bg-gray-800 rounded-xl p-4 flex items-center gap-3 active:bg-gray-700 transition-colors text-left"
    >
      <!-- Icon -->
      <div
        class="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
        :class="iconBg(tx)"
      >
        <span v-if="tx.isInternalTransfer" class="text-lg">↔️</span>
        <span v-else-if="isEmptyCardTx(tx)" class="text-base">❓</span>
        <span v-else-if="tx.categoryId && getCategoryIcon(tx.categoryId)" class="text-lg">{{ getCategoryIcon(tx.categoryId) }}</span>
        <div v-else class="w-2.5 h-2.5 rounded-full bg-amber-500" />
      </div>

      <!-- Info -->
      <div class="flex-1 min-w-0">
        <p
          class="text-sm font-medium truncate"
          :class="isEmptyCardTx(tx) ? 'text-gray-400' : 'text-white'"
        >
          {{ displayName(tx) }}
        </p>
        <p class="text-gray-500 text-xs mt-0.5">
          {{ formatDate(tx.bookingDate) }}
          <span v-if="tx.isInternalTransfer" class="text-blue-400/80"> · Trasferimento interno</span>
          <span v-else-if="isEmptyCardTx(tx)" class="text-gray-600"> · Dati non disponibili</span>
          <span v-else-if="tx.categoryId" class="text-gray-600"> · {{ getCategoryLabel(tx.categoryId) }}</span>
        </p>
      </div>

      <!-- Amount -->
      <div class="text-right shrink-0">
        <p
          class="font-semibold text-sm"
          :class="tx.creditDebitIndicator === 'CRDT' ? 'text-green-400' : tx.isInternalTransfer ? 'text-blue-400/60' : isEmptyCardTx(tx) ? 'text-gray-500' : 'text-white'"
        >
          {{ tx.creditDebitIndicator === 'CRDT' ? '+' : '-' }}€{{ tx.amount.toFixed(2) }}
        </p>
        <!-- Badge "Da revisionare": solo su tx normali non categorizzate, mai su prepagata/interna -->
        <p
          v-if="!tx.reviewed && !tx.categoryId && !tx.isInternalTransfer && !isEmptyCardTx(tx)"
          class="text-amber-400 text-xs mt-0.5"
        >Da revisionare</p>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { type BankTransaction } from '../composables/useBanking'
import { useCategories } from '../composables/useCategories'

defineProps<{
  transactions: BankTransaction[]
  loading: boolean
  filter: 'all' | 'uncategorized' | 'income' | 'expense'
}>()

defineEmits<{ categorize: [tx: BankTransaction] }>()

const { getCategoryById } = useCategories()

function isEmptyCardTx(tx: BankTransaction): boolean {
  const noDescription = !tx.description || tx.description.toLowerCase().trim() === 'transazione'
  const noCounterpart = !tx.counterpartName && !tx.counterpartIban
  const noExternalId  = !tx.externalId || tx.externalId.startsWith('synthetic_')
  return noDescription && noCounterpart && noExternalId
}

function iconBg(tx: BankTransaction): string {
  if (tx.isInternalTransfer) return 'bg-blue-500/15'
  if (isEmptyCardTx(tx))     return 'bg-gray-700/50'
  if (tx.categoryId)         return 'bg-gray-700'
  return 'bg-amber-500/15'
}

function displayName(tx: BankTransaction): string {
  if (tx.counterpartName) return tx.counterpartName
  if (isEmptyCardTx(tx))  return 'Pagamento prepagata'
  return tx.description || 'Transazione'
}

function getCategoryIcon(categoryId: string): string {
  return getCategoryById(categoryId)?.icon || ''
}

function getCategoryLabel(categoryId: string): string {
  return getCategoryById(categoryId)?.label || categoryId
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('it-IT', { day: 'numeric', month: 'short' })
}
</script>
