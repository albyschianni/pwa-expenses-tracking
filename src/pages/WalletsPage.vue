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

    <!-- Pending Invitations Banner -->
    <InvitationsBanner />

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

            <!-- Pending invitations for this wallet (owner only) -->
            <div v-if="isOwner && walletPendingInvites.length > 0" class="mb-6">
              <h4 class="text-white font-semibold mb-3">Inviti in attesa</h4>
              <div class="space-y-2">
                <div
                  v-for="inv in walletPendingInvites"
                  :key="inv.id"
                  class="bg-gray-700/50 rounded-xl p-3 flex items-center gap-3"
                >
                  <div class="w-8 h-8 rounded-full bg-yellow-500/20 flex items-center justify-center text-sm">
                    ⏳
                  </div>
                  <div class="flex-1 min-w-0">
                    <p class="text-gray-300 text-sm truncate">{{ inv.email }}</p>
                    <p class="text-yellow-500/70 text-xs">In attesa di risposta</p>
                  </div>
                  <button
                    @click="handleCancelInvite(inv.id)"
                    :disabled="cancellingInviteId === inv.id"
                    class="text-red-400 text-xs font-medium active:text-red-300 disabled:opacity-50"
                  >
                    {{ cancellingInviteId === inv.id ? '...' : 'Annulla' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- Invite member (owner only) -->
            <div v-if="isOwner" class="mb-6">
              <h4 class="text-white font-semibold mb-3">Invita Membro</h4>
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

              <!-- Invite feedback -->
              <p v-if="inviteMessage" class="text-sm mb-2" :class="inviteError ? 'text-red-400' : 'text-teal-400'">
                {{ inviteMessage }}
              </p>

              <div v-if="searchResults.length > 0" class="space-y-1">
                <button
                  v-for="u in searchResults"
                  :key="u.id"
                  @click="handleInviteMember(u)"
                  :disabled="invitingUserId === u.id"
                  class="w-full bg-gray-700 rounded-xl p-3 flex items-center gap-3 text-left active:bg-gray-600 transition-colors disabled:opacity-50"
                >
                  <div class="flex-1 min-w-0">
                    <p class="text-white text-sm truncate">{{ u.displayName || u.email }}</p>
                    <p class="text-gray-500 text-xs truncate">{{ u.email }}</p>
                  </div>
                  <span class="text-teal-400 text-sm font-medium">
                    {{ invitingUserId === u.id ? 'Invio...' : 'Invita' }}
                  </span>
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

    <!-- Notification Permission Dialog -->
    <NotificationPermissionDialog
      :open="showNotificationDialog"
      @close="handleNotificationDialogClose"
      @granted="handleNotificationGranted"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from 'vue'
import { supabase } from '../lib/supabase'
import { useSharedWallets, type UserSearchResult } from '../composables/useSharedWallets'
import { useWalletInvitations } from '../composables/useWalletInvitations'
import { usePushNotifications } from '../composables/usePushNotifications'
import { useAuth } from '../composables/useAuth'
import InvitationsBanner from '../components/InvitationsBanner.vue'
import NotificationPermissionDialog from '../components/NotificationPermissionDialog.vue'

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
  removeMember,
  leaveWallet,
  searchUsers,
} = useSharedWallets()

const { sendInvitation, cancelInvitation } = useWalletInvitations()
const { pushSupported, permissionState, checkSubscription } = usePushNotifications()

const showCreateDialog = ref(false)
const showWalletSettings = ref(false)
const showNotificationDialog = ref(false)

async function openWalletSettings(w: typeof wallets.value[0]) {
  await setActiveWallet(w)
  editWalletName.value = w.name
  fetchWalletPendingInvites()
  showWalletSettings.value = true
}
const newWalletName = ref('')
const editWalletName = ref('')
const memberSearchEmail = ref('')
const searchResults = ref<UserSearchResult[]>([])
const invitingUserId = ref<string | null>(null)
const inviteMessage = ref('')
const inviteError = ref(false)
const cancellingInviteId = ref<string | null>(null)

// Pending invitations for the current wallet (owner view)
const walletPendingInvites = ref<{ id: string; email: string }[]>([])

async function fetchWalletPendingInvites() {
  if (!activeWallet.value) return
  try {
    const { data } = await supabase
      .from('wallet_invitations')
      .select('id, invited_user_id')
      .eq('wallet_id', activeWallet.value.id)
      .eq('status', 'pending')

    if (!data || data.length === 0) {
      walletPendingInvites.value = []
      return
    }

    const userIds = data.map((d: any) => d.invited_user_id)
    const { data: users } = await supabase
      .rpc('get_users_by_ids', { user_ids: userIds })

    const userMap = new Map<string, string>()
    for (const u of users || []) {
      userMap.set(u.id, u.display_name || u.email)
    }

    walletPendingInvites.value = data.map((d: any) => ({
      id: d.id,
      email: userMap.get(d.invited_user_id) || 'Utente',
    }))
  } catch (e) {
    console.error('Failed to fetch pending invites:', e)
  }
}

// Check if push notification prompt should be shown (first time on wallets tab)
const PUSH_PROMPT_KEY = 'push_notification_prompted'

onMounted(() => {
  if (pushSupported.value && permissionState.value === 'default') {
    const alreadyPrompted = localStorage.getItem(PUSH_PROMPT_KEY)
    if (!alreadyPrompted) {
      showNotificationDialog.value = true
    }
  }
  // If already granted, ensure subscription is active
  if (permissionState.value === 'granted') {
    checkSubscription()
  }
})

function handleNotificationDialogClose() {
  showNotificationDialog.value = false
  localStorage.setItem(PUSH_PROMPT_KEY, 'true')
}

function handleNotificationGranted() {
  localStorage.setItem(PUSH_PROMPT_KEY, 'true')
}

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
  inviteMessage.value = ''
  if (searchTimeout) clearTimeout(searchTimeout)
  searchTimeout = setTimeout(async () => {
    if (memberSearchEmail.value.length < 3) {
      searchResults.value = []
      return
    }
    try {
      const results = await searchUsers(memberSearchEmail.value)
      // Filter out existing members
      const memberIds = new Set(walletMembers.value.map(m => m.userId))
      searchResults.value = results.filter(r => !memberIds.has(r.id))
    } catch (e) {
      console.error('Search failed:', e)
    }
  }, 300)
}

async function handleInviteMember(u: UserSearchResult) {
  if (!activeWallet.value) return
  invitingUserId.value = u.id
  inviteMessage.value = ''
  inviteError.value = false

  try {
    await sendInvitation(activeWallet.value.id, u.id)
    inviteMessage.value = `Invito inviato a ${u.displayName || u.email}`
    inviteError.value = false
    memberSearchEmail.value = ''
    searchResults.value = []
    await fetchWalletPendingInvites()
  } catch (e: any) {
    inviteMessage.value = e.message || 'Errore nell\'invio dell\'invito'
    inviteError.value = true
  } finally {
    invitingUserId.value = null
  }
}

async function handleCancelInvite(invitationId: string) {
  cancellingInviteId.value = invitationId
  try {
    await cancelInvitation(invitationId)
    await fetchWalletPendingInvites()
  } catch (e) {
    console.error('Failed to cancel invitation:', e)
  } finally {
    cancellingInviteId.value = null
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
    walletPendingInvites.value = []
    inviteMessage.value = ''
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
