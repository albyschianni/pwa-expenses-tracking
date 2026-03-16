<template>
  <div class="min-h-screen bg-gray-900 flex flex-col justify-center px-6 py-12">

    <!-- Logo/Brand -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-400 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">Expense Tracker</h1>
    </div>

    <div class="w-full max-w-sm mx-auto">
      <h2 class="text-white text-xl font-bold mb-2">Nuova password</h2>
      <p class="text-gray-400 text-sm mb-6">Scegli una nuova password per il tuo account.</p>

      <div v-if="success" class="bg-teal-500/10 border border-teal-500/20 rounded-xl p-4 text-center">
        <p class="text-teal-400 font-medium mb-1">Password aggiornata!</p>
        <p class="text-gray-400 text-sm">Stai entrando nell'app...</p>
      </div>

      <form v-else @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-2">Nuova password</label>
          <input
            v-model="password"
            type="password"
            required
            autocomplete="new-password"
            placeholder="••••••••"
            minlength="6"
            class="w-full bg-gray-800 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div>
          <label class="block text-gray-400 text-sm mb-2">Conferma password</label>
          <input
            v-model="confirmPassword"
            type="password"
            required
            autocomplete="new-password"
            placeholder="••••••••"
            minlength="6"
            class="w-full bg-gray-800 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p class="text-red-400 text-sm text-center">{{ errorMessage }}</p>
        </div>

        <button
          type="submit"
          :disabled="saving"
          class="w-full bg-teal-400 text-gray-900 font-semibold py-3 px-4 rounded-xl disabled:opacity-50 active:bg-teal-500 transition-colors flex items-center justify-center gap-2"
        >
          <svg v-if="saving" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          Salva password
        </button>
      </form>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { updatePassword, isPasswordRecovery } = useAuth()

const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const saving = ref(false)
const success = ref(false)

async function handleSubmit() {
  errorMessage.value = ''

  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Le password non corrispondono'
    return
  }

  saving.value = true
  try {
    await updatePassword(password.value)
    success.value = true
    // Give user a moment to read the success message, then enter the app
    setTimeout(() => {
      isPasswordRecovery.value = false
    }, 1500)
  } catch (e: any) {
    errorMessage.value = e.message || 'Errore durante il salvataggio'
  } finally {
    saving.value = false
  }
}
</script>
