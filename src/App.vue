<template>
  <!-- Maintenance Overlay (shown first if maintenance_mode is enabled) -->
  <MaintenanceOverlay v-if="maintenanceMode" />

  <!-- Loading State -->
  <div v-else-if="authLoading" class="min-h-screen bg-gray-900 flex items-center justify-center">
    <div class="text-center">
      <svg class="w-12 h-12 mx-auto text-teal-400 animate-spin" fill="none" viewBox="0 0 24 24">
        <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" />
        <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
      </svg>
      <p class="mt-4 text-gray-400">Caricamento...</p>
    </div>
  </div>

  <!-- Password Recovery Page -->
  <ResetPasswordPage v-else-if="isPasswordRecovery" />

  <!-- Auth Page -->
  <AuthPage v-else-if="!isAuthenticated" />

  <!-- Banking Callback Handler (intercepts /banking/callback before main app) -->
  <BankCallbackHandler
    v-else-if="bankingSubPage === 'callback' && isEnabled('banking')"
    @done="handleBankingCallbackDone"
  />

  <!-- Main App -->
  <div v-else class="relative min-h-screen bg-gray-900">
    <!-- HEADER -->
    <AppHeader
      :hide-month-picker="bankingSubPage === 'transactions'"
      @open-month-picker="monthPickerOpen = true"
      @open-menu="menuOpen = true"
      @open-avatar="avatarViewerOpen = true"
    />

    <!-- MAIN CONTENT - KeepAlive prevents re-mounting, v-if prevents hidden tabs from reacting -->
    <KeepAlive>
      <div
        v-if="activeTab === 'home'"
        key="home"
        ref="homeScrollRef"
        class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24"
      >
        <HomePage
          @expense-click="openExpenseDetail"
          @expense-edit="openEditExpense"
          @expense-delete="handleDeleteExpense"
        />
      </div>

      <div
        v-else-if="activeTab === 'graphic'"
        key="graphic"
        ref="graphicScrollRef"
        class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24"
      >
        <GraphicsPage />
      </div>

      <div
        v-else-if="activeTab === 'wallets'"
        key="wallets"
        ref="walletsScrollRef"
        class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24"
      >
        <WalletsPage />
      </div>

      <div
        v-else-if="activeTab === 'recurring'"
        key="recurring"
        ref="recurringScrollRef"
        class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24"
      >
        <RecurringPage
          @add-recurring="openCreateRecurring"
          @edit-recurring="openEditRecurring"
        />
      </div>

      <div
        v-else-if="activeTab === 'settings'"
        key="settings"
        ref="settingsScrollRef"
        class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24"
      >
        <SettingsPage
          :banking-enabled="isEnabled('banking')"
          @open-bank-connect="openBankConnect"
          @open-bank-transactions="openBankTransactions"
        />

      </div>
    </KeepAlive>

    <!-- BANKING SUB-PAGES (overlay, feature-gated) -->
    <div
      v-if="bankingSubPage === 'connect' && isEnabled('banking')"
      class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24 z-30"
    >
      <BankConnectionPage @back="bankingSubPage = 'none'" />
    </div>

    <div
      v-if="bankingSubPage === 'transactions' && isEnabled('banking')"
      class="fixed inset-0 top-16 bottom-0 overflow-y-auto bg-gray-900 pb-24 z-30"
    >
      <BankTransactionsPage :initial-connection-id="bankTransactionsConnectionId" @back="bankingSubPage = 'none'" />
    </div>

    <!-- TAB BAR (includes centered FAB) -->
    <TabBar
      :active-tab="activeTab"
      @fab-click="openCreateExpense"
      @navigate="handleTabNavigate"
    />

    <!-- MONTH PICKER -->
    <MonthPicker
      :open="monthPickerOpen"
      @close="monthPickerOpen = false"
    />

    <!-- EXPENSE DIALOG (Create / Edit) -->
    <ExpenseDialog
      :open="expenseDialogOpen"
      :expense="expenseToEdit"
      @close="closeExpenseDialog"
      @save="handleSaveExpense"
    />

    <!-- EXPENSE DETAIL DIALOG (View / Delete) -->
    <ExpenseDetailDialog
      :open="expenseDetailOpen"
      :expense="selectedExpense"
      @close="expenseDetailOpen = false"
      @edit="openEditExpense"
      @delete="handleDeleteExpense"
    />

    <!-- RECURRING EXPENSE DIALOG (Create / Edit) -->
    <RecurringExpenseDialog
      :open="recurringDialogOpen"
      :recurring-expense="recurringToEdit"
      @close="closeRecurringDialog"
      @save="handleSaveRecurring"
      @delete="handleDeleteRecurring"
    />

    <!-- SIDE DRAWER (Menu) -->
    <SideDrawer
      :open="menuOpen"
      @close="menuOpen = false"
      @navigate="handleTabNavigate"
    />

    <!-- AVATAR VIEWER -->
    <AvatarViewer
      :open="avatarViewerOpen"
      @close="avatarViewerOpen = false"
    />

    <!-- WHAT'S NEW MODAL -->
    <WhatsNewModal />

    <!-- PUSH NOTIFICATION PROMPT (auto for installed PWA) -->
    <NotificationPermissionDialog
      :open="showPushPrompt"
      @close="handlePushPromptClose"
      @granted="handlePushPromptClose"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import AppHeader from "./components/AppHeader.vue"
import TabBar from "./components/TabBar.vue"
import MonthPicker from "./components/MonthPicker.vue"
import ExpenseDialog from "./components/ExpenseDialog.vue"
import ExpenseDetailDialog from "./components/ExpenseDetailDialog.vue"
import RecurringExpenseDialog from "./components/RecurringExpenseDialog.vue"
import SideDrawer from "./components/SideDrawer.vue"
import AvatarViewer from "./components/AvatarViewer.vue"
import MaintenanceOverlay from "./components/MaintenanceOverlay.vue"
import HomePage from "./pages/HomePage.vue"
import GraphicsPage from "./pages/GraphicsPage.vue"
import AuthPage from "./pages/AuthPage.vue"
import ResetPasswordPage from "./pages/ResetPasswordPage.vue"
import SettingsPage from "./pages/SettingsPage.vue"
import RecurringPage from "./pages/RecurringPage.vue"
import WalletsPage from "./pages/WalletsPage.vue"
import BankConnectionPage from "./pages/BankConnectionPage.vue"
import BankTransactionsPage from "./pages/BankTransactionsPage.vue"
import BankCallbackHandler from "./components/BankCallbackHandler.vue"
import { useExpenses } from "./composables/useExpenses"
import { useAuth } from "./composables/useAuth"
import { useRecurringExpenses } from "./composables/useRecurringExpenses"
import { useWalletInvitations } from "./composables/useWalletInvitations"
import { usePushNotifications } from "./composables/usePushNotifications"
import { useCategories } from "./composables/useCategories"
import { useBanking } from "./composables/useBanking"
import { useFeatureFlags } from "./composables/useFeatureFlags"
import { useBudgets } from "./composables/useBudgets"
import { useAppDialogs } from "./composables/useAppDialogs"
import WhatsNewModal from "./components/WhatsNewModal.vue"
import NotificationPermissionDialog from "./components/NotificationPermissionDialog.vue"
import { useWhatsNew } from "./composables/useWhatsNew"

// Auto-reload when a new service worker takes control (new deployment)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

// Shared key with WalletsPage. Stores the timestamp (ms) of the last prompt so
// we can re-ask after a cooldown window instead of nagging on every session.
const PUSH_PROMPT_KEY = 'push_notification_prompted_at'
const PUSH_PROMPT_COOLDOWN_MS = 30 * 24 * 60 * 60 * 1000

function pushPromptOnCooldown(): boolean {
  const raw = localStorage.getItem(PUSH_PROMPT_KEY)
  if (!raw) return false
  const last = Number(raw)
  if (!Number.isFinite(last)) return true
  return Date.now() - last < PUSH_PROMPT_COOLDOWN_MS
}

function handlePushPromptClose() {
  showPushPrompt.value = false
  localStorage.setItem(PUSH_PROMPT_KEY, String(Date.now()))
}

const { fetchExpenses, scheduleMarkAllReviewed } = useExpenses()
const { isAuthenticated, isPasswordRecovery, loading: authLoading } = useAuth()
const { fetchPendingInvitations } = useWalletInvitations()
const { pushSupported, permissionState, checkSubscription } = usePushNotifications()
const { fetchCategories } = useCategories()
const { fetchConnections, fetchBankTransactions } = useBanking()
const { loadFlags, isEnabled } = useFeatureFlags()
const { checkForUpdates } = useWhatsNew()
const { init: initBudgets } = useBudgets()
const { fetchRecurringExpenses, processAutoGeneration } = useRecurringExpenses()

// Dialog state e handlers estratti in composable dedicato
const {
  monthPickerOpen, expenseDialogOpen, expenseDetailOpen, recurringDialogOpen,
  menuOpen, avatarViewerOpen, showPushPrompt,
  expenseToEdit, selectedExpense, recurringToEdit,
  openCreateExpense, openExpenseDetail, openEditExpense, closeExpenseDialog,
  handleSaveExpense, handleDeleteExpense,
  openCreateRecurring, openEditRecurring, closeRecurringDialog,
  handleSaveRecurring, handleDeleteRecurring,
} = useAppDialogs()

// Maintenance mode state
const maintenanceMode = ref(false)

// Navigation state — check URL for tab parameter (from push notification click)
const validTabs = ['home', 'graphic', 'wallets', 'recurring', 'settings']
const urlTab = new URLSearchParams(window.location.search).get('tab')

// Detect banking callback (/banking/callback?code=...&state=...)
const isBankingCallback = window.location.pathname.includes('/banking/callback')

// Se arriviamo dal redirect bancario, salviamo code/error in sessionStorage
// PRIMA dell'auth, così non si perdono dopo il login
if (isBankingCallback) {
  const cbParams = new URLSearchParams(window.location.search)
  const cbCode = cbParams.get('code')
  const cbError = cbParams.get('error')
  if (cbCode) sessionStorage.setItem('banking_callback_code', cbCode)
  if (cbError) sessionStorage.setItem('banking_callback_error', cbError)
}

const bankingSubPage = ref<'none' | 'callback' | 'connect' | 'transactions'>(
  isBankingCallback || sessionStorage.getItem('banking_callback_code') ? 'callback' : 'none'
)

const activeTab = ref(urlTab && validTabs.includes(urlTab) ? urlTab : 'home')

// Clean up URL parameter (but not for banking callback — handled by BankCallbackHandler)
if (urlTab && !isBankingCallback) {
  window.history.replaceState({}, '', window.location.pathname)
}

// Listen for service worker messages (when app is already open)
navigator.serviceWorker?.addEventListener('message', (event) => {
  if (event.data?.type === 'navigate' && validTabs.includes(event.data.tab)) {
    activeTab.value = event.data.tab
  }
})

// Banking callback handler
function handleBankingCallbackDone(success: boolean) {
  bankingSubPage.value = 'none'
  window.history.replaceState({}, '', '/')
  if (success) {
    activeTab.value = 'home'
    // Refresh data after bank connection
    fetchBankTransactions()
    fetchConnections()
  }
}

// Open banking sub-pages (called from settings or other places)
function handleTabNavigate(tab: string) {
  activeTab.value = tab
  bankingSubPage.value = 'none'
}

function openBankConnect() {
  bankingSubPage.value = 'connect'
}

const bankTransactionsConnectionId = ref<string | undefined>(undefined)

function openBankTransactions(connectionId?: string) {
  bankTransactionsConnectionId.value = connectionId
  bankingSubPage.value = 'transactions'
}

// Scroll refs for each tab
const homeScrollRef = ref<HTMLElement | null>(null)
const graphicScrollRef = ref<HTMLElement | null>(null)
const walletsScrollRef = ref<HTMLElement | null>(null)
const recurringScrollRef = ref<HTMLElement | null>(null)
const settingsScrollRef = ref<HTMLElement | null>(null)

// Reset scroll to top when switching tabs
watch(activeTab, () => {
  const scrollRefs: Record<string, typeof homeScrollRef> = {
    home: homeScrollRef,
    graphic: graphicScrollRef,
    wallets: walletsScrollRef,
    recurring: recurringScrollRef,
    settings: settingsScrollRef,
  }
  const ref = scrollRefs[activeTab.value]
  if (ref?.value) {
    ref.value.scrollTop = 0
  }
})

// Fetch expenses and recurring expenses when authenticated
// Parallelize independent fetches, then run auto-generation
watch(isAuthenticated, async (authenticated) => {
  if (authenticated) {
    // Categories and feature flags must load first
    await Promise.all([fetchCategories(), loadFlags()])
    
    // Check maintenance mode status
    maintenanceMode.value = isEnabled('maintenance_mode')
    
    // If in maintenance mode, skip the rest of initialization
    if (!maintenanceMode.value) {
      await Promise.all([fetchExpenses(), fetchRecurringExpenses(), initBudgets()])
      scheduleMarkAllReviewed()
      await processAutoGeneration()
      // Banking: only fetch if feature is enabled for this user
      if (isEnabled('banking')) {
        fetchConnections()
        fetchBankTransactions()
      }
      // Defer non-critical tasks: esegui dopo che il browser ha completato il rendering iniziale
      const defer = (fn: () => void) =>
        'requestIdleCallback' in window
          ? requestIdleCallback(fn)
          : setTimeout(fn, 200)

      defer(() => {
        checkForUpdates()
        checkSubscription()
      })

      // Auto-prompt push notifications for installed PWA users.
      // Show only if the user has never granted permission (`default`) AND we're
      // not within the cooldown window from the last dismissal. We deliberately
      // skip `denied` because re-asking is a no-op on iOS and just nags the user.
      const isInstalledPwa = window.matchMedia('(display-mode: standalone)').matches
        || (navigator as any).standalone === true
      if (
        isInstalledPwa
        && pushSupported.value
        && permissionState.value === 'default'
        && !pushPromptOnCooldown()
      ) {
        defer(() => {
          if (permissionState.value === 'default') {
            showPushPrompt.value = true
          }
        })
      }
    }
  }
}, { immediate: true })

// Refresh invitations when app comes back to foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isAuthenticated.value) {
    fetchPendingInvitations()
  }
})

</script>
