<template>
  <div v-if="pendingInvitations.length > 0" class="space-y-2 mb-4">
    <div
      v-for="inv in pendingInvitations"
      :key="inv.id"
      class="bg-teal-400/10 border border-teal-400/30 rounded-2xl p-4"
    >
      <div class="flex items-start gap-3">
        <!-- Bell icon -->
        <div class="w-10 h-10 rounded-full bg-teal-400/20 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
        </div>

        <div class="flex-1 min-w-0">
          <p class="text-white text-sm font-medium">
            Invito al gruppo
          </p>
          <p class="text-gray-400 text-xs mt-0.5">
            <span class="text-teal-400">{{ inv.inviterName }}</span> ti ha invitato a
            "<span class="text-white">{{ inv.walletName }}</span>"
          </p>

          <!-- Actions -->
          <div class="flex gap-2 mt-3">
            <button
              @click="handleReject(inv.id)"
              :disabled="processing === inv.id"
              class="flex-1 py-2 bg-gray-700 text-gray-300 rounded-xl text-sm font-medium active:bg-gray-600 transition-colors disabled:opacity-50"
            >
              Rifiuta
            </button>
            <button
              @click="handleAccept(inv.id)"
              :disabled="processing === inv.id"
              class="flex-1 py-2 bg-teal-400 text-gray-900 rounded-xl text-sm font-semibold active:bg-teal-500 transition-colors disabled:opacity-50"
            >
              {{ processing === inv.id ? 'Caricamento...' : 'Accetta' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useWalletInvitations } from '../composables/useWalletInvitations'

const { pendingInvitations, acceptInvitation, rejectInvitation } = useWalletInvitations()

const processing = ref<string | null>(null)

async function handleAccept(id: string) {
  processing.value = id
  try {
    await acceptInvitation(id)
  } catch (e: any) {
    alert('Errore accettazione: ' + (e?.message || JSON.stringify(e)))
  } finally {
    processing.value = null
  }
}

async function handleReject(id: string) {
  processing.value = id
  try {
    await rejectInvitation(id)
  } catch (e: any) {
    alert('Errore rifiuto: ' + (e?.message || JSON.stringify(e)))
  } finally {
    processing.value = null
  }
}
</script>
