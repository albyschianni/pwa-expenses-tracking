<template>
  <div class="px-4 py-6">
    <!-- Profile Card (clickable) -->
    <button
      @click="profileSheetOpen = true"
      class="w-full bg-gray-800 rounded-2xl p-4 mb-4 active:bg-gray-750 transition-colors text-left"
    >
      <div class="flex items-center gap-4">
        <img
          :src="displayAvatarUrl"
          alt="avatar"
          class="w-16 h-16 rounded-full object-cover border-2 border-gray-600"
        />
        <div class="flex-1 min-w-0">
          <p class="text-white font-semibold text-lg truncate">
            {{ userName }}
          </p>
          <p class="text-gray-400 text-sm truncate">{{ userEmail }}</p>
          <p class="text-teal-400 text-xs mt-1">Modifica profilo</p>
        </div>
        <svg class="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </button>

    <!-- Settings List -->
    <div class="bg-gray-800 rounded-2xl overflow-hidden mb-4">
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

      <button
        @click="currencyPickerOpen = true"
        class="w-full flex items-center gap-4 p-4 text-left active:bg-gray-700 transition-colors"
      >
        <div class="w-10 h-10 rounded-full bg-gray-700 flex items-center justify-center">
          <svg class="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div class="flex-1">
          <p class="text-white font-medium">Valuta</p>
          <p class="text-gray-400 text-sm">{{ currency.code }} ({{ currency.symbol }})</p>
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

    <!-- Currency Picker Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="currencyPickerOpen"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="currencyPickerOpen = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="currencyPickerOpen"
          class="fixed bottom-0 left-0 right-0 z-50 bg-gray-800 rounded-t-3xl p-6 pb-8"
        >
          <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-6" />
          <h3 class="text-white text-lg font-semibold mb-4">Seleziona valuta</h3>

          <div class="space-y-2">
            <button
              v-for="curr in availableCurrencies"
              :key="curr.code"
              @click="selectCurrency(curr.code)"
              class="w-full flex items-center gap-4 p-4 rounded-xl transition-colors"
              :class="currentCurrency === curr.code ? 'bg-teal-500/20 border border-teal-500' : 'bg-gray-700 active:bg-gray-600'"
            >
              <span class="text-2xl w-8 text-center">{{ curr.symbol }}</span>
              <div class="flex-1 text-left">
                <p class="text-white font-medium">{{ curr.name }}</p>
                <p class="text-gray-400 text-sm">{{ curr.code }}</p>
              </div>
              <svg
                v-if="currentCurrency === curr.code"
                class="w-6 h-6 text-teal-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                stroke-width="2"
              >
                <path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Profile Sheet Modal -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="profileSheetOpen"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="profileSheetOpen = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="profileSheetOpen"
          class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl max-h-[85vh] flex flex-col"
        >
          <div class="p-6 pb-0">
            <!-- Handle + Header -->
            <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <div class="flex items-center justify-between mb-6">
              <h3 class="text-white text-xl font-bold">Profilo</h3>
              <button
                @click="profileSheetOpen = false"
                class="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center"
              >
                <svg class="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-8">
            <!-- Avatar -->
            <div class="flex flex-col items-center mb-8">
              <button
                @click="triggerAvatarUpload"
                class="relative group"
              >
                <img
                  :src="displayAvatarUrl"
                  alt="avatar"
                  class="w-24 h-24 rounded-full object-cover border-3 border-gray-600"
                />
                <div class="absolute inset-0 rounded-full bg-black/40 flex items-center justify-center opacity-0 group-active:opacity-100 transition-opacity">
                  <svg class="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </button>
              <input
                ref="avatarFileInput"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                class="hidden"
                @change="handleAvatarChange"
              />
              <p class="text-gray-400 text-xs mt-2">Tocca per cambiare foto</p>
            </div>

            <!-- Display Name -->
            <div class="mb-5">
              <label class="block text-gray-400 text-sm mb-2">Nome</label>
              <input
                v-model="profileForm.displayName"
                type="text"
                placeholder="Il tuo nome"
                @blur="saveDisplayName"
                class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
            </div>

            <!-- Email (read-only) -->
            <div class="mb-5">
              <label class="block text-gray-400 text-sm mb-2">Email</label>
              <div class="w-full bg-gray-700/50 text-gray-300 rounded-xl py-3 px-4">
                {{ userEmail }}
              </div>
            </div>

            <!-- Password Section -->
            <div class="mb-5">
              <label class="block text-gray-400 text-sm mb-2">Password</label>
              <div v-if="!passwordEditMode" class="flex gap-2">
                <div class="flex-1 bg-gray-700/50 text-gray-500 rounded-xl py-3 px-4">
                  ••••••••
                </div>
                <button
                  @click="passwordEditMode = true"
                  class="px-4 bg-gray-700 text-teal-400 rounded-xl font-medium active:bg-gray-600 transition-colors"
                >
                  Cambia
                </button>
              </div>

              <div v-else class="space-y-3">
                <input
                  v-model="profileForm.newPassword"
                  type="password"
                  placeholder="Nuova password"
                  class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <input
                  v-model="profileForm.confirmPassword"
                  type="password"
                  placeholder="Conferma password"
                  class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <div class="flex gap-2">
                  <button
                    @click="cancelPasswordEdit"
                    class="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium active:bg-gray-600 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    @click="savePassword"
                    :disabled="!isPasswordValid"
                    class="flex-1 py-3 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors disabled:opacity-40"
                  >
                    Salva
                  </button>
                </div>
              </div>
            </div>

            <!-- Feedback Toast -->
            <Transition name="fade">
              <div
                v-if="feedbackMessage"
                class="rounded-xl p-3 text-center text-sm font-medium mb-4"
                :class="feedbackType === 'success' ? 'bg-teal-500/20 text-teal-400' : 'bg-red-500/20 text-red-400'"
              >
                {{ feedbackMessage }}
              </div>
            </Transition>

            <!-- Account Info -->
            <div class="mt-4 pt-4 border-t border-gray-700">
              <p class="text-gray-500 text-xs text-center">
                Account creato il {{ accountCreatedDate }}
              </p>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch } from 'vue'
import { useAuth } from '../composables/useAuth'
import { useCurrency } from '../composables/useCurrency'
import { useAvatar } from '../composables/useAvatar'

const { user, signOut, loading, displayName, updateProfile, updatePassword } = useAuth()
const { currency, availableCurrencies, setCurrency, currentCurrency } = useCurrency()
const { displayAvatarUrl, uploadAvatar } = useAvatar()

const currencyPickerOpen = ref(false)
const profileSheetOpen = ref(false)
const passwordEditMode = ref(false)
const feedbackMessage = ref('')
const feedbackType = ref<'success' | 'error'>('success')
const avatarFileInput = ref<HTMLInputElement | null>(null)

const profileForm = reactive({
  displayName: '',
  newPassword: '',
  confirmPassword: '',
})

// Sync form when profile sheet opens
watch(profileSheetOpen, (open) => {
  if (open) {
    profileForm.displayName = displayName.value || ''
    profileForm.newPassword = ''
    profileForm.confirmPassword = ''
    passwordEditMode.value = false
    feedbackMessage.value = ''
  }
})

const userEmail = computed(() => user.value?.email || 'Utente')
const userName = computed(() => displayName.value || userEmail.value)

const isPasswordValid = computed(() => {
  return (
    profileForm.newPassword.length >= 6 &&
    profileForm.newPassword === profileForm.confirmPassword
  )
})

const accountCreatedDate = computed(() => {
  if (!user.value?.created_at) return ''
  return new Date(user.value.created_at).toLocaleDateString('it-IT', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })
})

function selectCurrency(code: 'EUR' | 'USD' | 'GBP') {
  setCurrency(code)
  currencyPickerOpen.value = false
}

function showFeedback(message: string, type: 'success' | 'error') {
  feedbackMessage.value = message
  feedbackType.value = type
  setTimeout(() => {
    feedbackMessage.value = ''
  }, 3000)
}

async function saveDisplayName() {
  const trimmed = profileForm.displayName.trim()
  if (trimmed === displayName.value) return

  try {
    await updateProfile({ displayName: trimmed })
    showFeedback('Nome aggiornato', 'success')
  } catch (e) {
    showFeedback('Errore nell\'aggiornamento del nome', 'error')
  }
}

function cancelPasswordEdit() {
  passwordEditMode.value = false
  profileForm.newPassword = ''
  profileForm.confirmPassword = ''
}

async function savePassword() {
  if (!isPasswordValid.value) return

  try {
    await updatePassword(profileForm.newPassword)
    showFeedback('Password aggiornata', 'success')
    cancelPasswordEdit()
  } catch (e) {
    showFeedback('Errore nell\'aggiornamento della password', 'error')
  }
}

function triggerAvatarUpload() {
  avatarFileInput.value?.click()
}

async function handleAvatarChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return

  const success = await uploadAvatar(file)
  if (success) {
    showFeedback('Foto aggiornata', 'success')
  } else {
    showFeedback('Errore nel caricamento della foto', 'error')
  }

  // Reset input so same file can be selected again
  input.value = ''
}

async function handleLogout() {
  try {
    await signOut()
  } catch (e) {
    console.error('Logout failed:', e)
  }
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.slide-up-enter-active,
.slide-up-leave-active {
  transition: transform 0.3s ease;
}
.slide-up-enter-from,
.slide-up-leave-to {
  transform: translateY(100%);
}
</style>
