<template>
  <div class="min-h-screen bg-gray-900 flex items-center justify-center px-4">
    <!-- Loading state -->
    <div v-if="!callbackError" class="text-center">
      <svg class="w-12 h-12 mx-auto text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p class="mt-4 text-white font-medium">Collegamento in corso...</p>
      <p class="mt-2 text-gray-400 text-sm">{{ statusMessage }}</p>
    </div>

    <!-- Error state -->
    <div v-else class="text-center max-w-sm">
      <div class="w-16 h-16 mx-auto bg-red-500/15 rounded-full flex items-center justify-center mb-4">
        <svg class="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h3 class="text-white font-semibold text-lg mb-2">Connessione non riuscita</h3>
      <p class="text-gray-400 text-sm mb-6">{{ callbackError }}</p>
      <button
        @click="$emit('done', false)"
        class="w-full bg-gray-800 text-white rounded-xl py-3 font-medium active:bg-gray-700 transition-colors"
      >
        Torna indietro
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useBanking } from '../composables/useBanking'

const emit = defineEmits<{
  done: [success: boolean]
}>()

const { completeBankConnection } = useBanking()

const callbackError = ref<string | null>(null)
const statusMessage = ref('Verifica autorizzazione...')

onMounted(async () => {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  const error = params.get('error')

  // Pulisci URL
  window.history.replaceState({}, '', window.location.pathname)

  if (error) {
    callbackError.value = error === 'access_denied'
      ? 'Hai annullato l\'autorizzazione bancaria.'
      : `Errore dalla banca: ${error}`
    return
  }

  if (!code) {
    callbackError.value = 'Codice di autorizzazione mancante.'
    return
  }

  try {
    statusMessage.value = 'Connessione al conto...'
    await completeBankConnection(code)
    statusMessage.value = 'Importazione transazioni...'

    // Breve pausa per mostrare il messaggio di successo
    setTimeout(() => {
      emit('done', true)
    }, 500)
  } catch (e: any) {
    callbackError.value = e.message || 'Errore durante il collegamento del conto.'
  }
})
</script>
