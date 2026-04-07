<template>
  <div>
    <!-- Section header -->
    <div class="flex items-center justify-between mb-3">
      <h3 class="text-white font-semibold">Conti bancari</h3>
      <button
        @click="$emit('add-connection')"
        class="text-teal-400 text-sm font-medium"
      >
        + Aggiungi
      </button>
    </div>

    <!-- No connections -->
    <div v-if="connections.length === 0" class="bg-gray-800 rounded-xl p-6 text-center">
      <div class="w-12 h-12 mx-auto bg-gray-700 rounded-full flex items-center justify-center mb-3">
        <svg class="w-6 h-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
          <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
        </svg>
      </div>
      <p class="text-gray-400 text-sm">Nessun conto collegato</p>
      <button
        @click="$emit('add-connection')"
        class="mt-3 text-teal-400 text-sm font-medium"
      >
        Connetti il tuo conto bancario
      </button>
    </div>

    <!-- Connection cards -->
    <div v-else class="space-y-2">
      <div
        v-for="conn in connections"
        :key="conn.id"
        class="bg-gray-800 rounded-xl p-4"
      >
        <!-- Header conto: tap → apre dettaglio transazioni -->
        <button
          class="w-full flex items-center gap-3 mb-3 text-left active:opacity-70 transition-opacity"
          @click="$emit('open-transactions', conn.id)"
        >
          <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
            <svg class="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white font-medium truncate">{{ conn.institutionName }}</p>
            <div class="flex items-center gap-2 mt-0.5">
              <span
                class="inline-flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full"
                :class="statusClasses(conn.status)"
              >
                <span class="w-1.5 h-1.5 rounded-full" :class="statusDotClass(conn.status)" />
                {{ statusLabel(conn.status) }}
              </span>
            </div>
          </div>
          <svg class="w-4 h-4 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <!-- Details -->
        <div class="text-xs text-gray-500 space-y-1 mb-3">
          <p v-if="conn.lastSyncAt">
            Ultimo sync: {{ formatDateTime(conn.lastSyncAt) }}
          </p>
          <p v-if="conn.consentExpiresAt" :class="consentWarningClass(conn.consentExpiresAt)">
            Consenso scade: {{ formatDate(conn.consentExpiresAt) }}
            <span v-if="daysUntilExpiry(conn.consentExpiresAt) <= 30"> ({{ daysUntilExpiry(conn.consentExpiresAt) }} giorni)</span>
          </p>
          <p v-if="conn.accountIds">
            {{ conn.accountIds.length }} conto{{ conn.accountIds.length > 1 ? 'i' : '' }}
          </p>
        </div>

        <!-- Actions -->
        <div class="flex gap-2">
          <button
            v-if="conn.status === 'active'"
            @click="handleSync(conn)"
            :disabled="syncingId === conn.id"
            class="flex-1 flex items-center justify-center gap-2 bg-gray-700 rounded-lg py-2 text-sm font-medium text-teal-400 active:bg-gray-600 transition-colors disabled:opacity-50"
          >
            <svg
              class="w-4 h-4"
              :class="{ 'animate-spin': syncingId === conn.id }"
              fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"
            >
              <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            {{ syncingId === conn.id ? 'Sync...' : 'Sincronizza' }}
          </button>

          <button
            v-if="conn.status === 'expired'"
            @click="$emit('add-connection')"
            class="flex-1 bg-teal-400/15 text-teal-400 rounded-lg py-2 text-sm font-medium active:bg-teal-400/25 transition-colors"
          >
            Rinnova consenso
          </button>

          <!-- Disconnetti (solo attive) -->
          <button
            v-if="conn.status === 'active'"
            @click="handleDisconnect(conn)"
            class="px-3 bg-gray-700 rounded-lg py-2 text-sm text-gray-400 active:bg-gray-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M13.181 8.68a4.503 4.503 0 011.903 6.405m-9.768-2.782L3.56 14.06a4.5 4.5 0 006.364 6.365l.707-.707m6.768-10.036l1.756-1.757a4.5 4.5 0 00-6.364-6.364l-.707.707" />
            </svg>
          </button>

          <!-- Elimina (tutte) -->
          <button
            @click="handleDelete(conn)"
            class="px-3 bg-gray-700 rounded-lg py-2 text-sm text-red-400 active:bg-gray-600 transition-colors"
          >
            <svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Confirm disconnect -->
    <Transition name="fade">
      <div v-if="disconnectTarget" class="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/60" @click="disconnectTarget = null" />
        <div class="relative bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
          <h3 class="text-white font-semibold text-lg mb-2">Disconnetti conto?</h3>
          <p class="text-gray-400 text-sm mb-6">
            La connessione a {{ disconnectTarget.institutionName }} verrà rimossa.
            Le transazioni già importate resteranno nell'app.
          </p>
          <div class="flex gap-3">
            <button
              @click="disconnectTarget = null"
              class="flex-1 bg-gray-700 text-white rounded-xl py-3 font-medium active:bg-gray-600 transition-colors"
            >
              Annulla
            </button>
            <button
              @click="confirmDisconnect"
              class="flex-1 bg-red-500/15 text-red-400 rounded-xl py-3 font-medium active:bg-red-500/25 transition-colors"
            >
              Disconnetti
            </button>
          </div>
        </div>
      </div>
    </Transition>

    <!-- Confirm delete -->
    <Transition name="fade">
      <div v-if="deleteTarget" class="fixed inset-0 z-50 flex items-center justify-center px-4">
        <div class="absolute inset-0 bg-black/60" @click="deleteTarget = null" />
        <div class="relative bg-gray-800 rounded-2xl p-6 max-w-sm w-full">
          <h3 class="text-white font-semibold text-lg mb-2">Elimina connessione?</h3>
          <p class="text-gray-400 text-sm mb-4">
            La connessione a <span class="text-white font-medium">{{ deleteTarget.institutionName }}</span> e tutte le transazioni importate verranno eliminate definitivamente.
          </p>
          <div class="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-6">
            <p class="text-amber-400 text-xs font-medium mb-1">⚠️ Perderai le categorizzazioni manuali</p>
            <p class="text-amber-400/70 text-xs">Le transazioni possono essere reimportate con un nuovo sync, ma le categorizzazioni manuali non sono recuperabili. Per ricollegare la banca usa invece "Disconnetti".</p>
          </div>
          <div class="flex gap-3">
            <button
              @click="deleteTarget = null"
              class="flex-1 bg-gray-700 text-white rounded-xl py-3 font-medium active:bg-gray-600 transition-colors"
            >
              Annulla
            </button>
            <button
              @click="confirmDelete"
              class="flex-1 bg-red-500/15 text-red-400 rounded-xl py-3 font-medium active:bg-red-500/25 transition-colors"
            >
              Elimina
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useBanking, type BankConnection } from '../composables/useBanking'

defineEmits<{
  'add-connection': []
  'open-transactions': [connectionId: string]
}>()

const { connections, syncManual, disconnectBank, deleteConnection } = useBanking()

const syncingId = ref<string | null>(null)
const disconnectTarget = ref<BankConnection | null>(null)
const deleteTarget = ref<BankConnection | null>(null)

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    active: 'Attivo',
    pending: 'In attesa',
    expired: 'Scaduto',
    error: 'Errore',
  }
  return labels[status] || status
}

function statusClasses(status: string): string {
  const classes: Record<string, string> = {
    active: 'bg-green-500/15 text-green-400',
    pending: 'bg-amber-500/15 text-amber-400',
    expired: 'bg-red-500/15 text-red-400',
    error: 'bg-red-500/15 text-red-400',
  }
  return classes[status] || 'bg-gray-700 text-gray-400'
}

function statusDotClass(status: string): string {
  const classes: Record<string, string> = {
    active: 'bg-green-400',
    pending: 'bg-amber-400',
    expired: 'bg-red-400',
    error: 'bg-red-400',
  }
  return classes[status] || 'bg-gray-400'
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(dateStr: string): string {
  return new Date(dateStr).toLocaleString('it-IT', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function daysUntilExpiry(dateStr: string): number {
  const diff = new Date(dateStr).getTime() - Date.now()
  return Math.ceil(diff / (1000 * 60 * 60 * 24))
}

function consentWarningClass(dateStr: string): string {
  const days = daysUntilExpiry(dateStr)
  if (days <= 7) return 'text-red-400'
  if (days <= 30) return 'text-amber-400'
  return 'text-gray-500'
}

async function handleSync(conn: BankConnection) {
  syncingId.value = conn.id
  try {
    await syncManual()
  } catch (e) {
    console.error('Sync error:', e)
  } finally {
    syncingId.value = null
  }
}

function handleDisconnect(conn: BankConnection) {
  disconnectTarget.value = conn
}

async function confirmDisconnect() {
  if (!disconnectTarget.value) return
  try {
    await disconnectBank(disconnectTarget.value.id)
    disconnectTarget.value = null
  } catch (e) {
    console.error('Disconnect error:', e)
  }
}

function handleDelete(conn: BankConnection) {
  deleteTarget.value = conn
}

async function confirmDelete() {
  if (!deleteTarget.value) return
  try {
    await deleteConnection(deleteTarget.value.id)
    deleteTarget.value = null
  } catch (e) {
    console.error('Delete error:', e)
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
