<template>
  <!-- Loading State -->
  <div v-if="authLoading" class="min-h-screen bg-gray-900 flex items-center justify-center">
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
        <HomePage @expense-click="openExpenseDetail" />
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
      <BankTransactionsPage @back="bankingSubPage = 'none'" />
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
      @close="showPushPrompt = false"
      @granted="showPushPrompt = false"
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
import { useExpenses, type Expense } from "./composables/useExpenses"
import { useAuth } from "./composables/useAuth"
import { useRecurringExpenses, type RecurringExpense } from "./composables/useRecurringExpenses"
import { useSharedWallets } from "./composables/useSharedWallets"
import { useWalletInvitations } from "./composables/useWalletInvitations"
import { usePushNotifications } from "./composables/usePushNotifications"
import { useCategories } from "./composables/useCategories"
import { useBanking } from "./composables/useBanking"
import { useFeatureFlags } from "./composables/useFeatureFlags"
import WhatsNewModal from "./components/WhatsNewModal.vue"
import NotificationPermissionDialog from "./components/NotificationPermissionDialog.vue"
import { useWhatsNew } from "./composables/useWhatsNew"

// Auto-reload when a new service worker takes control (new deployment)
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    window.location.reload()
  })
}

const { addExpense, updateExpense, deleteExpense, fetchExpenses } = useExpenses()
const { isAuthenticated, isPasswordRecovery, loading: authLoading } = useAuth()
const { activeWallet, addWalletTransaction } = useSharedWallets()
const { fetchPendingInvitations } = useWalletInvitations()
const { pushSupported, permissionState, checkSubscription } = usePushNotifications()
const { fetchCategories } = useCategories()
const { fetchConnections, fetchBankTransactions } = useBanking()
const { loadFlags, isEnabled } = useFeatureFlags()
const { checkForUpdates } = useWhatsNew()
const {
  addRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  fetchRecurringExpenses,
  processAutoGeneration
} = useRecurringExpenses()

// Navigation state — check URL for tab parameter (from push notification click)
const validTabs = ['home', 'graphic', 'wallets', 'recurring', 'settings']
const urlTab = new URLSearchParams(window.location.search).get('tab')

// Detect banking callback (/banking/callback?code=...&state=...)
const isBankingCallback = window.location.pathname.includes('/banking/callback')
const bankingSubPage = ref<'none' | 'callback' | 'connect' | 'transactions'>(
  isBankingCallback ? 'callback' : 'none'
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

function openBankTransactions() {
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

// Dialog states
const monthPickerOpen = ref(false)
const expenseDialogOpen = ref(false)
const expenseDetailOpen = ref(false)
const recurringDialogOpen = ref(false)
const menuOpen = ref(false)
const avatarViewerOpen = ref(false)
const showPushPrompt = ref(false)

// Expense being edited (null = create mode)
const expenseToEdit = ref<Expense | null>(null)

// Selected expense for detail view
const selectedExpense = ref<Expense | null>(null)

// Recurring expense being edited (null = create mode)
const recurringToEdit = ref<RecurringExpense | null>(null)

// Fetch expenses and recurring expenses when authenticated
// Parallelize independent fetches, then run auto-generation
watch(isAuthenticated, async (authenticated) => {
  if (authenticated) {
    // Categories and feature flags must load first
    await Promise.all([fetchCategories(), loadFlags()])
    await Promise.all([fetchExpenses(), fetchRecurringExpenses()])
    await processAutoGeneration()
    // Banking: only fetch if feature is enabled for this user
    if (isEnabled('banking')) {
      fetchConnections()
      fetchBankTransactions()
    }
    // Defer non-critical tasks so they don't compete with initial UI render
    setTimeout(() => checkForUpdates(), 500)
    setTimeout(() => checkSubscription(), 1500)

    // Auto-prompt push notifications for installed PWA users
    const isInstalledPwa = window.matchMedia('(display-mode: standalone)').matches
      || (navigator as any).standalone === true
    if (isInstalledPwa && pushSupported.value && permissionState.value !== 'granted') {
      // Show after WhatsNew modal has had time to appear and be dismissed
      setTimeout(() => {
        if (permissionState.value !== 'granted') {
          showPushPrompt.value = true
        }
      }, 2500)
    }
  }
}, { immediate: true })

// Refresh invitations when app comes back to foreground
document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'visible' && isAuthenticated.value) {
    fetchPendingInvitations()
  }
})

// ============================================================
// CREATE EXPENSE
// ============================================================
function openCreateExpense() {
  expenseToEdit.value = null
  expenseDialogOpen.value = true
}

// ============================================================
// VIEW EXPENSE DETAIL
// ============================================================
function openExpenseDetail(expense: Expense) {
  selectedExpense.value = expense
  expenseDetailOpen.value = true
}

// ============================================================
// EDIT EXPENSE
// ============================================================
function openEditExpense(expense: Expense) {
  expenseDetailOpen.value = false
  expenseToEdit.value = expense
  expenseDialogOpen.value = true
}

function closeExpenseDialog() {
  expenseDialogOpen.value = false
  expenseToEdit.value = null
}

// ============================================================
// SAVE EXPENSE (Create or Update)
// ============================================================
async function handleSaveExpense(data: { description: string; date: string; amount: number; category: string; type: 'expense' | 'income' }) {
  try {
    if (expenseToEdit.value) {
      await updateExpense(expenseToEdit.value.id, data)
    } else if (activeWallet.value) {
      // Shared wallet mode: add to the active wallet
      await addWalletTransaction(activeWallet.value.id, data)
    } else {
      await addExpense(data)
    }
    closeExpenseDialog()
  } catch (e) {
    console.error('Failed to save expense:', e)
  }
}

// ============================================================
// DELETE EXPENSE
// ============================================================
async function handleDeleteExpense(expenseId: string) {
  try {
    await deleteExpense(expenseId)
  } catch (e) {
    console.error('Failed to delete expense:', e)
  }
}

// ============================================================
// RECURRING EXPENSES
// ============================================================
function openCreateRecurring() {
  recurringToEdit.value = null
  recurringDialogOpen.value = true
}

function openEditRecurring(item: RecurringExpense) {
  recurringToEdit.value = item
  recurringDialogOpen.value = true
}

function closeRecurringDialog() {
  recurringDialogOpen.value = false
  recurringToEdit.value = null
}

async function handleSaveRecurring(data: { description: string; amount: number; category: string; dayOfMonth: number; type: 'expense' | 'income' }) {
  try {
    if (recurringToEdit.value) {
      await updateRecurringExpense(recurringToEdit.value.id, data)
    } else {
      await addRecurringExpense(data)
    }
    closeRecurringDialog()
  } catch (e) {
    console.error('Failed to save recurring expense:', e)
  }
}

async function handleDeleteRecurring(id: string) {
  try {
    await deleteRecurringExpense(id)
    closeRecurringDialog()
  } catch (e) {
    console.error('Failed to delete recurring expense:', e)
  }
}
</script>
