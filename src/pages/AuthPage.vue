<template>
  <div class="min-h-screen bg-gray-900 flex flex-col justify-center px-6 py-12">

    <!-- Email Confirmation Overlay -->
    <Transition name="overlay">
      <div
        v-if="showConfirmation"
        class="fixed inset-0 z-50 bg-gray-900/95 flex items-center justify-center px-6"
        @click.self="dismissConfirmation"
      >
        <div class="bg-gray-800 rounded-2xl p-8 w-full max-w-sm text-center shadow-xl">
          <!-- Mail Icon -->
          <div class="w-16 h-16 mx-auto mb-5 rounded-full bg-teal-400/15 flex items-center justify-center">
            <svg class="w-8 h-8 text-teal-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
            </svg>
          </div>

          <h2 class="text-xl font-bold text-white mb-2">Controlla la tua email</h2>
          <p class="text-gray-400 text-sm leading-relaxed mb-6">
            Ti abbiamo inviato un'email di conferma. Clicca sul link nell'email per attivare il tuo account e poi torna qui per accedere.
          </p>

          <button
            @click="dismissConfirmation"
            class="w-full bg-teal-400 text-gray-900 font-semibold py-3 px-4 rounded-xl active:bg-teal-500 transition-colors"
          >
            Ho capito
          </button>
        </div>
      </div>
    </Transition>

    <!-- Logo/Brand -->
    <div class="text-center mb-8">
      <div class="w-16 h-16 mx-auto mb-4 rounded-2xl bg-teal-400 flex items-center justify-center">
        <svg class="w-8 h-8 text-gray-900" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h1 class="text-2xl font-bold text-white">Expense Tracker</h1>
      <p class="text-gray-400 mt-1">Gestisci le tue spese facilmente</p>
    </div>

    <!-- Auth Form -->
    <div class="w-full max-w-sm mx-auto">
      <!-- Tabs -->
      <div class="flex bg-gray-800 rounded-xl p-1 mb-6">
        <button
          @click="mode = 'login'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          :class="mode === 'login' ? 'bg-teal-400 text-gray-900' : 'text-gray-400'"
        >
          Accedi
        </button>
        <button
          @click="mode = 'signup'"
          class="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors"
          :class="mode === 'signup' ? 'bg-teal-400 text-gray-900' : 'text-gray-400'"
        >
          Registrati
        </button>
      </div>

      <!-- Form -->
      <form @submit.prevent="handleSubmit" class="space-y-4">
        <div>
          <label class="block text-gray-400 text-sm mb-2">Email</label>
          <input
            v-model="email"
            type="email"
            required
            autocomplete="email"
            placeholder="nome@email.com"
            class="w-full bg-gray-800 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div>
          <label class="block text-gray-400 text-sm mb-2">Password</label>
          <input
            v-model="password"
            type="password"
            required
            :autocomplete="mode === 'login' ? 'current-password' : 'new-password'"
            placeholder="••••••••"
            minlength="6"
            class="w-full bg-gray-800 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
          />
        </div>

        <div v-if="mode === 'signup'">
          <label class="block text-gray-400 text-sm mb-2">Conferma Password</label>
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

        <!-- Error Message -->
        <div v-if="errorMessage" class="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
          <p class="text-red-400 text-sm text-center">{{ errorMessage }}</p>
        </div>

        <!-- Success Message (for signup confirmation) -->
        <div v-if="successMessage" class="bg-teal-500/10 border border-teal-500/20 rounded-xl p-3">
          <p class="text-teal-400 text-sm text-center">{{ successMessage }}</p>
        </div>

        <!-- Submit Button -->
        <button
          type="submit"
          :disabled="loading"
          class="w-full bg-teal-400 text-gray-900 font-semibold py-3 px-4 rounded-xl disabled:opacity-50 active:bg-teal-500 transition-colors flex items-center justify-center gap-2"
        >
          <svg v-if="loading" class="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
          {{ mode === 'login' ? 'Accedi' : 'Registrati' }}
        </button>
      </form>

      <!-- Forgot Password -->
      <div v-if="mode === 'login'" class="mt-4 text-center">
        <button
          @click="handleForgotPassword"
          :disabled="loading"
          class="text-gray-400 text-sm hover:text-teal-400 transition-colors"
        >
          Password dimenticata?
        </button>
      </div>

      <!-- Divider -->
      <div class="flex items-center gap-4 my-6">
        <div class="flex-1 h-px bg-gray-700" />
        <span class="text-gray-500 text-sm">oppure</span>
        <div class="flex-1 h-px bg-gray-700" />
      </div>

      <!-- Google Sign In -->
      <button
        @click="handleGoogleSignIn"
        :disabled="loading"
        class="w-full flex items-center justify-center gap-3 bg-white text-gray-900 font-semibold py-3 px-4 rounded-xl disabled:opacity-50 active:bg-gray-100 transition-colors"
      >
        <svg class="w-5 h-5" viewBox="0 0 24 24">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
        </svg>
        Continua con Google
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useAuth } from '../composables/useAuth'

const { signIn, signUp, signInWithGoogle, resetPassword, loading } = useAuth()

const mode = ref<'login' | 'signup'>('login')
const email = ref('')
const password = ref('')
const confirmPassword = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const showConfirmation = ref(false)

function clearMessages() {
  errorMessage.value = ''
  successMessage.value = ''
}

function dismissConfirmation() {
  showConfirmation.value = false
  mode.value = 'login'
}

async function handleSubmit() {
  clearMessages()

  // Validate
  if (mode.value === 'signup' && password.value !== confirmPassword.value) {
    errorMessage.value = 'Le password non corrispondono'
    return
  }

  try {
    if (mode.value === 'login') {
      await signIn(email.value, password.value)
    } else {
      const result = await signUp(email.value, password.value)
      if (result.needsConfirmation) {
        showConfirmation.value = true
        email.value = ''
        password.value = ''
        confirmPassword.value = ''
      }
    }
  } catch (e: any) {
    const msg = e?.message || e?.error_description || e?.msg || 'Qualcosa è andato storto. Riprova.'
    errorMessage.value = translateError(msg)
  }
}

async function handleForgotPassword() {
  clearMessages()

  if (!email.value) {
    errorMessage.value = 'Inserisci la tua email'
    return
  }

  try {
    await resetPassword(email.value)
    successMessage.value = 'Controlla la tua email per reimpostare la password'
  } catch (e: any) {
    errorMessage.value = translateError(e.message)
  }
}

async function handleGoogleSignIn() {
  clearMessages()
  try {
    await signInWithGoogle()
  } catch (e: any) {
    errorMessage.value = translateError(e.message)
  }
}

// Translate common Supabase errors to Italian
function translateError(message: string): string {
  const translations: Record<string, string> = {
    'Invalid login credentials': 'Email o password non validi',
    'Email not confirmed': 'Email non confermata. Controlla la tua posta.',
    'User already registered': 'Utente già registrato',
    'Password should be at least 6 characters': 'La password deve avere almeno 6 caratteri',
    'Unable to validate email address: invalid format': 'Formato email non valido',
    'Request rate limit reached': 'Troppi tentativi. Riprova tra qualche minuto.',
    'email rate limit exceeded': 'Troppi tentativi. Riprova tra qualche minuto.',
  }
  if (translations[message]) return translations[message]
  if (message.toLowerCase().includes('rate') || message.toLowerCase().includes('limit') || message.toLowerCase().includes('429'))
    return 'Troppi tentativi. Riprova tra qualche minuto.'
  return message
}
</script>

<style scoped>
.overlay-enter-active,
.overlay-leave-active {
  transition: opacity 0.25s ease;
}
.overlay-enter-active .bg-gray-800,
.overlay-leave-active .bg-gray-800 {
  transition: transform 0.25s ease, opacity 0.25s ease;
}
.overlay-enter-from,
.overlay-leave-to {
  opacity: 0;
}
.overlay-enter-from .bg-gray-800,
.overlay-leave-to .bg-gray-800 {
  transform: scale(0.95);
  opacity: 0;
}
</style>
