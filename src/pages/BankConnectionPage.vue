<template>
  <div class="px-4 py-6">
    <!-- Header -->
    <div class="mb-6">
      <h2 class="text-xl font-bold text-white">Connetti il tuo conto</h2>
      <p class="text-gray-400 text-sm mt-1">Seleziona la tua banca per importare le transazioni automaticamente</p>
    </div>

    <!-- Search bar -->
    <div class="relative mb-4">
      <svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Cerca la tua banca..."
        class="w-full bg-gray-800 text-white rounded-xl pl-10 pr-4 py-3 text-sm border border-gray-700 focus:border-teal-400 focus:outline-none"
      />
    </div>

    <!-- Loading -->
    <div v-if="loadingAspsps" class="flex items-center justify-center py-12">
      <svg class="w-8 h-8 text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
    </div>

    <!-- Error -->
    <div v-else-if="error" class="bg-red-500/15 border border-red-500/30 rounded-xl p-4 mb-4">
      <p class="text-red-400 text-sm">{{ error }}</p>
      <button @click="loadBanks" class="text-teal-400 text-sm mt-2 font-medium">Riprova</button>
    </div>

    <!-- Bank list -->
    <div v-else class="space-y-2">
      <p v-if="filteredBanks.length === 0" class="text-gray-500 text-center py-8">
        Nessuna banca trovata
      </p>

      <button
        v-for="bank in filteredBanks"
        :key="bank.name"
        @click="connectBank(bank)"
        :disabled="connecting"
        class="w-full bg-gray-800 rounded-xl p-4 flex items-center gap-4 active:bg-gray-700 transition-colors text-left disabled:opacity-50"
      >
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center shrink-0">
          <svg class="w-5 h-5 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-medium truncate">{{ bank.name }}</p>
          <p class="text-gray-500 text-xs">{{ bank.country }}</p>
        </div>
        <svg v-if="connectingBank !== bank.name" class="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <svg v-else class="w-5 h-5 text-teal-400 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
          <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
          <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </button>
    </div>

    <!-- Back button -->
    <button
      @click="$emit('back')"
      class="w-full mt-6 py-3 text-gray-400 text-sm font-medium"
    >
      Annulla
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useBanking, type Aspsp } from '../composables/useBanking'

const emit = defineEmits<{
  back: []
}>()

const { startBankConnection, getAspsps, error } = useBanking()

const searchQuery = ref('')
const banks = ref<Aspsp[]>([])
const loadingAspsps = ref(true)
const connecting = ref(false)
const connectingBank = ref<string | null>(null)

const filteredBanks = computed(() => {
  if (!searchQuery.value) return banks.value
  const q = searchQuery.value.toLowerCase()
  return banks.value.filter(b => b.name.toLowerCase().includes(q))
})

async function loadBanks() {
  loadingAspsps.value = true
  try {
    banks.value = await getAspsps('IT')
  } catch (e) {
    console.error('Error loading banks:', e)
  } finally {
    loadingAspsps.value = false
  }
}

async function connectBank(bank: Aspsp) {
  connecting.value = true
  connectingBank.value = bank.name
  try {
    await startBankConnection(bank.name, bank.country)
    // Se arriviamo qui senza redirect, qualcosa è andato storto
  } catch (e) {
    console.error('Error connecting bank:', e)
  } finally {
    connecting.value = false
    connectingBank.value = null
  }
}

onMounted(loadBanks)
</script>
