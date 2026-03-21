<template>
  <div class="px-4 py-6">
    <!-- Header -->
    <div class="flex items-center justify-between mb-4">
      <h2 class="text-white text-xl font-bold">Portafogli Condivisi</h2>
      <button
        @click="showCreateDialog = true"
        class="px-4 py-2 bg-teal-400 text-gray-900 rounded-xl font-semibold text-sm active:bg-teal-500 transition-colors"
      >
        + Nuovo
      </button>
    </div>

    <!-- Empty state -->
    <div v-if="wallets.length === 0 && !loading" class="text-center py-16">
      <div class="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
        <svg class="w-8 h-8 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
          <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      </div>
      <p class="text-gray-400 text-sm">Nessun portafoglio condiviso</p>
      <p class="text-gray-500 text-xs mt-1">Crea un portafoglio per condividere le spese</p>
    </div>

    <!-- Wallet list — clicking opens settings directly -->
    <div class="space-y-3">
      <button
        v-for="w in wallets"
        :key="w.id"
        @click="openWalletSettings(w)"
        class="w-full bg-gray-800 rounded-2xl p-4 text-left active:bg-gray-750 transition-colors"
      >
        <div class="flex items-center gap-4">
          <div class="w-12 h-12 rounded-full flex items-center justify-center text-xl"
            :class="w.role === 'owner' ? 'bg-teal-400/20' : 'bg-gray-700'"
          >
            {{ w.role === 'owner' ? '👑' : '👤' }}
          </div>
          <div class="flex-1 min-w-0">
            <p class="text-white font-semibold truncate">{{ w.name }}</p>
            <p class="text-gray-400 text-sm">{{ w.role === 'owner' ? 'Proprietario' : 'Membro' }} · {{ w.currency }}</p>
          </div>
          <svg class="w-5 h-5 text-gray-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
            <path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </button>
    </div>

    <!-- Create Wallet Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showCreateDialog"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="showCreateDialog = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="showCreateDialog"
          class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl p-6 pb-8"
        >
          <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
          <h3 class="text-white text-lg font-semibold mb-4">Nuovo Portafoglio</h3>

          <div class="mb-4">
            <label class="block text-gray-400 text-sm mb-2">Nome</label>
            <input
              v-model="newWalletName"
              type="text"
              placeholder="Es: Casa con coinquilini"
              class="w-full bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
            />
          </div>

          <div class="flex gap-2">
            <button
              @click="showCreateDialog = false"
              class="flex-1 py-3 bg-gray-700 text-gray-300 rounded-xl font-medium active:bg-gray-600 transition-colors"
            >
              Annulla
            </button>
            <button
              @click="handleCreateWallet"
              :disabled="!newWalletName.trim()"
              class="flex-1 py-3 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors disabled:opacity-40"
            >
              Crea
            </button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Wallet Settings Dialog -->
    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="showWalletSettings"
          class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
          @click="showWalletSettings = false"
        />
      </Transition>

      <Transition name="slide-up">
        <div
          v-if="showWalletSettings && activeWallet"
          class="fixed inset-x-0 bottom-0 z-50 bg-gray-800 rounded-t-3xl max-h-[85vh] flex flex-col"
        >
          <div class="p-6 pb-0">
            <div class="w-12 h-1 bg-gray-600 rounded-full mx-auto mb-4" />
            <h3 class="text-white text-lg font-semibold mb-4">Impostazioni Portafoglio</h3>
          </div>

          <div class="flex-1 overflow-y-auto px-6 pb-8">
            <!-- Rename (owner only) -->
            <div v-if="isOwner" class="mb-6">
              <label class="block text-gray-400 text-sm mb-2">Nome</label>
              <div class="flex gap-2">
                <input
                  v-model="editWalletName"
                  type="text"
                  class="flex-1 bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
                <button
                  @click="handleRenameWallet"
                  class="px-4 bg-teal-400 text-gray-900 rounded-xl font-semibold active:bg-teal-500 transition-colors"
                >
                  Salva
                </button>
              </div>
            </div>

            <!-- Members -->
            <div class="mb-6">
              <h4 class="text-white font-semibold mb-3">Membri</h4>
              <div class="space-y-2">
                <div
                  v-for="m in walletMembers"
                  :key="m.id"
                  class="bg-gray-700 rounded-xl p-3 flex items-center gap-3"
                >
                  <div class="w-8 h-8 rounded-full bg-gray-600 flex items-center justify-center text-sm">
                    {{ m.role === 'owner' ? '👑' : '👤' }}
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm truncate">{{ m.displayName || m.email || 'Utente' }}</p>
                    <p class="text-gray-500 text-xs capitalize">{{ m.role === 'owner' ? 'Proprietario' : 'Membro' }}</p>
                  </div>
                  <button
                    v-if="isOwner && m.userId !== user?.id"
                    @click="handleRemoveMember(m.id)"
                    class="text-red-400 text-xs font-medium active:text-red-300"
                  >
                    Rimuovi
                  </button>
                </div>
              </div>
            </div>

            <!-- Add member (owner only) -->
            <div v-if="isOwner" class="mb-6">
              <h4 class="text-white font-semibold mb-3">Aggiungi Membro</h4>
              <div class="flex gap-2 mb-2">
                <input
                  v-model="memberSearchEmail"
                  type="email"
                  inputmode="email"
                  placeholder="Cerca per email..."
                  class="flex-1 bg-gray-700 text-white rounded-xl py-3 px-4 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-teal-400"
                  @input="handleSearchUsers"
                />
              </div>
              <div v-if="searchResults.length > 0" class="space-y-1">
                <button
                  v-for="u in searchResults"
                  :key="u.id"
                  @click="handleAddMember(u.id)"
                  class="w-full bg-gray-700 rounded-xl p-3 flex items-center gap-3 text-left active:bg-gray-600 transition-colors"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm truncate">{{ u.displayName || u.email }}</p>
                    <p class="text-gray-500 text-xs truncate">{{ u.email }}</p>
                  </div>
                  <span class="text-teal-400 text-sm font-medium">Aggiungi</span>
                </button>
              </div>
            </div>

            <!-- Leave / Delete -->
            <div class="pt-4 border-t border-gray-700 space-y-2">
              <button
                v-if="!isOwner"
                @click="handleLeaveWallet"
                class="w-full p-3 rounded-xl bg-red-500/10 text-red-400 font-semibold active:bg-red-500/20 transition-colors text-center"
              >
                Abbandona Portafoglio
              </button>
              <p v-if="!isOwner" class="text-gray-500 text-xs text-center">Le tue transazioni resteranno visibili</p>

              <button
                v-if="isOwner"
                @click="handleDeleteWallet"
                class="w-full p-3 rounded-xl bg-red-500/10 text-red-400 font-semibold active:bg-red-500/20 transition-colors text-center"
              >
                Elimina Portafoglio
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useSharedWallets, type UserSearchResult } from '../composables/useSharedWallets'
import { useAuth } from '../composables/useAuth'

const { user } = useAuth()
const {
  wallets,
  activeWallet,
  walletMembers,
  loading,
  isOwner,
  createWallet,
  updateWallet,
  deleteWallet,
  setActiveWallet,
  addMember,
  removeMember,
  leaveWallet,
  searchUsers,
} = useSharedWallets()

const showCreateDialog = ref(false)
const showWalletSettings = ref(false)

async function openWalletSettings(w: typeof wallets.value[0]) {
  await setActiveWallet(w)
  editWalletName.value = w.name
  showWalletSettings.value = true
}
const newWalletName = ref('')
const editWalletName = ref('')
const memberSearchEmail = ref('')
const searchResults = ref<UserSearchResult[]>([])


async function handleCreateWallet() {
  if (!newWalletName.value.trim()) return
  try {
    await createWallet(newWalletName.value.trim())
    newWalletName.value = ''
    showCreateDialog.value = false
  } catch (e) {
    console.error('Failed to create wallet:', e)
  }
}

async function handleRenameWallet() {
  if (!activeWallet.value || !editWalletName.value.trim()) return
  try {
    await updateWallet(activeWallet.value.id, { name: editWalletName.value.trim() })
  } catch (e) {
    console.error('Failed to rename wallet:', e)
  }
}

async function handleDeleteWallet() {
  if (!activeWallet.value) return
  try {
    await deleteWallet(activeWallet.value.id)
    showWalletSettings.value = false
  } catch (e) {
    console.error('Failed to delete wallet:', e)
  }
}

async function handleLeaveWallet() {
  if (!activeWallet.value) return
  try {
    await leaveWallet(activeWallet.value.id)
    showWalletSettings.value = false
  } catch (e) {
    console.error('Failed to leave wallet:', e)
  }
}

let searchTimeout: ReturnType<typeof setTimeout> | null = null
function handleSearchUsers() {
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (memberSearchEmail.value.length < 3) {
      searchResults.value = []
      return
    }
    try {
      searchResults.value = await searchUsers(memberSearchEmail.value)
    } catch (e) {
      console.error('Search failed:', e)
    }
  }, 300)
}

async function handleAddMember(userId: string) {
  if (!activeWallet.value) return
  try {
    await addMember(activeWallet.value.id, userId)
    memberSearchEmail.value = ''
    searchResults.value = []
  } catch (e) {
    console.error('Failed to add member:', e)
  }
}

async function handleRemoveMember(memberId: string) {
  if (!activeWallet.value) return
  try {
    await removeMember(activeWallet.value.id, memberId)
  } catch (e) {
    console.error('Failed to remove member:', e)
  }
}

// Clear active wallet when settings closes
watch(showWalletSettings, (open) => {
  if (!open) {
    setActiveWallet(null)
  }
})
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

input[type="date"]::-webkit-calendar-picker-indicator {
  filter: invert(1);
}
</style>
