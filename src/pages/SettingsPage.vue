<template>
  <div class="px-4 py-6">
    <!-- Profile Section -->
    <div class="bg-gray-800 rounded-2xl p-4 mb-4">
      <div class="flex items-center gap-4">
        <div class="w-14 h-14 rounded-full bg-teal-400 flex items-center justify-center text-gray-900 text-xl font-bold">
          {{ userInitial }}
        </div>
        <div class="flex-1 min-w-0">
          <p class="text-white font-medium truncate">{{ userEmail }}</p>
          <p class="text-gray-400 text-sm">Account attivo</p>
        </div>
      </div>
    </div>

    <!-- Settings List -->
    <div class="bg-gray-800 rounded-2xl overflow-hidden mb-4">
      <button class="w-full flex items-center gap-4 p-4 text-left border-b border-gray-700 active:bg-gray-700 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Profilo</p>
          <p class="text-gray-400 text-sm">Gestisci il tuo account</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button class="w-full flex items-center gap-4 p-4 text-left border-b border-gray-700 active:bg-gray-700 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Categorie</p>
          <p class="text-gray-400 text-sm">Personalizza le categorie</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>

      <button class="w-full flex items-center gap-4 p-4 text-left active:bg-gray-700 transition-colors">
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Valuta</p>
          <p class="text-gray-400 text-sm">EUR (€)</p>
        </div>
        <svg class="w-5 h-5 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </button>
    </div>

    <!-- Logout Button -->
    <button
      @click="handleLogout"
      :disabled="loading"
      class="w-full flex items-center justify-center gap-3 p-4 bg-gray-800 rounded-2xl text-red-400 font-semibold active:bg-gray-700 transition-colors"
    >
      <svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
        <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
      </svg>
      {{ loading ? 'Uscita...' : 'Esci' }}
    </button>

    <!-- App Version -->
    <p class="text-center text-gray-600 text-sm mt-6">Expense Tracker v1.0.0</p>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useAuth } from '../composables/useAuth'

const { user, signOut, loading } = useAuth()

const userEmail = computed(() => user.value?.email || 'Utente')

const userInitial = computed(() => {
  const email = user.value?.email
  if (!email) return 'U'
  return email.charAt(0).toUpperCase()
})

async function handleLogout() {
  try {
    await signOut()
  } catch (e) {
    console.error('Logout failed:', e)
  }
}
</script>
