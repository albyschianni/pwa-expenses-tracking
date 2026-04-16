import { ref, computed, watch } from 'vue'
import { supabase, type DbSharedWalletMember, type DbExpense } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useSelectedMonth } from './useSelectedMonth'
import { getCategoryConfig, type TransactionType } from './useExpenses'

export interface SharedWallet {
  id: string
  name: string
  createdBy: string
  currency: string
  createdAt: string
  role: 'owner' | 'member'
}

export interface WalletMember {
  id: string
  walletId: string
  userId: string
  email: string
  displayName: string
  role: 'owner' | 'member'
  isActive: boolean
  joinedAt: string
}

export interface WalletTransaction {
  id: string
  description: string
  date: string
  amount: number
  category: string
  icon: string
  color: string
  type: TransactionType
  userId: string
  userEmail: string
  userDisplayName: string
}

export interface UserSearchResult {
  id: string
  email: string
  displayName: string
}

// Singleton state
const wallets = ref<SharedWallet[]>([])
const activeWallet = ref<SharedWallet | null>(null)
const walletMembers = ref<WalletMember[]>([])
const walletTransactions = ref<WalletTransaction[]>([])
const loading = ref(false)
const error = ref<string | null>(null)
let initialized = false
let realtimeChannel: ReturnType<typeof supabase.channel> | null = null

export function useSharedWallets() {
  const { user, isAuthenticated } = useAuth()
  const { monthKey } = useSelectedMonth()

  async function fetchWallets() {
    if (!user.value) return
    loading.value = true
    error.value = null

    try {
      // Singola query con JOIN: elimina il roundtrip N+1
      const { data: rows, error: queryErr } = await supabase
        .from('shared_wallet_members')
        .select('role, shared_wallets!inner(id, name, created_by, currency, created_at, is_deleted)')
        .eq('user_id', user.value.id)
        .eq('is_active', true)
        .eq('shared_wallets.is_deleted', false)

      if (queryErr) throw queryErr
      if (!rows || rows.length === 0) {
        wallets.value = []
        return
      }

      wallets.value = rows.map((row: any) => {
        const w = row.shared_wallets
        return {
          id: w.id,
          name: w.name,
          createdBy: w.created_by,
          currency: w.currency,
          createdAt: w.created_at,
          role: (row.role || 'member') as 'owner' | 'member',
        }
      }).sort((a: SharedWallet, b: SharedWallet) => b.createdAt.localeCompare(a.createdAt))
    } catch (e: any) {
      error.value = e.message
      console.error('Failed to fetch wallets:', e)
    } finally {
      loading.value = false
    }
  }

  async function createWallet(name: string, currency = 'EUR') {
    if (!user.value) throw new Error('Non autenticato')

    const { data, error: insertErr } = await supabase
      .from('shared_wallets')
      .insert({
        name,
        created_by: user.value.id,
        currency,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    // Trigger will auto-add creator as owner
    await fetchWallets()
    return data
  }

  async function updateWallet(walletId: string, data: { name?: string }) {
    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    if (data.name) updateData.name = data.name

    const { error: updateErr } = await supabase
      .from('shared_wallets')
      .update(updateData)
      .eq('id', walletId)

    if (updateErr) throw updateErr

    const w = wallets.value.find(w => w.id === walletId)
    if (w && data.name) w.name = data.name
  }

  async function deleteWallet(walletId: string) {
    // Soft delete
    const { error: deleteErr } = await supabase
      .from('shared_wallets')
      .update({ is_deleted: true, updated_at: new Date().toISOString() })
      .eq('id', walletId)

    if (deleteErr) throw deleteErr

    wallets.value = wallets.value.filter(w => w.id !== walletId)
    if (activeWallet.value?.id === walletId) {
      activeWallet.value = null
      walletMembers.value = []
      walletTransactions.value = []
    }
  }

  // ── Members ──────────────────────────────────────────────────

  async function fetchMembers(walletId: string) {
    const { data, error: fetchErr } = await supabase
      .from('shared_wallet_members')
      .select('*')
      .eq('wallet_id', walletId)
      .eq('is_active', true)

    if (fetchErr) throw fetchErr

    const members = (data || []) as DbSharedWalletMember[]

    // Fetch user info (email, display_name) for all member user IDs
    const userIds = members.map(m => m.user_id)
    let userMap = new Map<string, { email: string; displayName: string }>()

    if (userIds.length > 0) {
      const { data: users } = await supabase.rpc('get_users_by_ids', { user_ids: userIds })
      if (users) {
        for (const u of users) {
          userMap.set(u.id, { email: u.email, displayName: u.display_name || '' })
        }
      }
    }

    walletMembers.value = members.map(m => {
      const info = userMap.get(m.user_id)
      return {
        id: m.id,
        walletId: m.wallet_id,
        userId: m.user_id,
        email: info?.email || '',
        displayName: info?.displayName || '',
        role: m.role,
        isActive: m.is_active,
        joinedAt: m.joined_at,
      }
    })
  }

  async function addMember(walletId: string, userId: string) {
    const { error: insertErr } = await supabase
      .from('shared_wallet_members')
      .insert({
        wallet_id: walletId,
        user_id: userId,
        role: 'member',
        is_active: true,
      })

    if (insertErr) throw insertErr
    await fetchMembers(walletId)
  }

  async function removeMember(_walletId: string, memberId: string) {
    const { error: updateErr } = await supabase
      .from('shared_wallet_members')
      .update({ is_active: false })
      .eq('id', memberId)

    if (updateErr) throw updateErr
    walletMembers.value = walletMembers.value.filter(m => m.id !== memberId)
  }

  async function leaveWallet(walletId: string) {
    if (!user.value) return

    const { error: updateErr } = await supabase
      .from('shared_wallet_members')
      .update({ is_active: false })
      .eq('wallet_id', walletId)
      .eq('user_id', user.value.id)

    if (updateErr) throw updateErr

    wallets.value = wallets.value.filter(w => w.id !== walletId)
    if (activeWallet.value?.id === walletId) {
      activeWallet.value = null
    }
  }

  // ── Search users ─────────────────────────────────────────────

  async function searchUsers(email: string): Promise<UserSearchResult[]> {
    if (!email || email.length < 3) return []

    const { data, error: searchErr } = await supabase
      .rpc('search_users_by_email', { search_email: email })

    if (searchErr) throw searchErr

    return (data || []).map((u: any) => ({
      id: u.id,
      email: u.email,
      displayName: u.display_name || '',
    }))
  }

  // ── Wallet Transactions ──────────────────────────────────────

  async function fetchWalletTransactions(walletId: string) {
    loading.value = true
    try {
      // Filtra per mese selezionato (come useExpenses per coerenza)
      const mk = monthKey.value
      const parts = mk.split('-').map(Number)
      const year = parts[0] ?? new Date().getFullYear()
      const month = parts[1] ?? (new Date().getMonth() + 1)
      const startDate = `${year}-${String(month).padStart(2, '0')}-01`
      const lastDay = new Date(year, month, 0).getDate()
      const endDate = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`

      const { data, error: fetchErr } = await supabase
        .from('expenses')
        .select('*')
        .eq('shared_wallet_id', walletId)
        .gte('date', startDate)
        .lte('date', endDate)
        .order('date', { ascending: false })

      if (fetchErr) throw fetchErr

      // Build a map of userId -> member info from current walletMembers
      const memberMap = new Map<string, { email: string; displayName: string }>()
      for (const m of walletMembers.value) {
        memberMap.set(m.userId, { email: m.email, displayName: m.displayName })
      }

      walletTransactions.value = (data || []).map((db: DbExpense) => {
        const txType: TransactionType = db.transaction_type === 'income' ? 'income' : 'expense'
        const cat = getCategoryConfig(db.category_id)
        const memberInfo = memberMap.get(db.user_id)
        return {
          id: db.id,
          description: db.description,
          date: db.date,
          amount: Number(db.amount),
          category: db.category_id,
          icon: cat.icon,
          color: cat.color,
          type: txType,
          userId: db.user_id,
          userEmail: memberInfo?.email || '',
          userDisplayName: memberInfo?.displayName || '',
        }
      })
    } catch (e: any) {
      error.value = e.message
    } finally {
      loading.value = false
    }
  }

  async function addWalletTransaction(walletId: string, data: {
    description: string
    date: string
    amount: number
    category: string
    type?: TransactionType
  }) {
    if (!user.value) throw new Error('Non autenticato')

    const { data: newRow, error: insertErr } = await supabase
      .from('expenses')
      .insert({
        user_id: user.value.id,
        description: data.description,
        date: data.date,
        amount: data.amount,
        category_id: data.category,
        transaction_type: data.type ?? 'expense',
        shared_wallet_id: walletId,
      })
      .select()
      .single()

    if (insertErr) throw insertErr

    const cat = getCategoryConfig(newRow.category_id)
    const currentMember = walletMembers.value.find(m => m.userId === newRow.user_id)
    const tx: WalletTransaction = {
      id: newRow.id,
      description: newRow.description,
      date: newRow.date,
      amount: Number(newRow.amount),
      category: newRow.category_id,
      icon: cat.icon,
      color: cat.color,
      type: newRow.transaction_type === 'income' ? 'income' : 'expense',
      userId: newRow.user_id,
      userEmail: currentMember?.email || '',
      userDisplayName: currentMember?.displayName || '',
    }

    walletTransactions.value = [tx, ...walletTransactions.value]
    return tx
  }

  async function setActiveWallet(wallet: SharedWallet | null) {
    // Cleanup sottoscrizione precedente
    if (realtimeChannel) {
      supabase.removeChannel(realtimeChannel)
      realtimeChannel = null
    }

    activeWallet.value = wallet
    if (wallet) {
      // Fetch members first so their info is available for transaction attribution
      await fetchMembers(wallet.id)
      await fetchWalletTransactions(wallet.id)

      // Realtime: aggiorna transazioni quando altri utenti modificano il wallet
      realtimeChannel = supabase
        .channel(`wallet-${wallet.id}`)
        .on('postgres_changes', {
          event: '*',
          schema: 'public',
          table: 'expenses',
          filter: `shared_wallet_id=eq.${wallet.id}`,
        }, () => {
          fetchWalletTransactions(wallet.id)
        })
        .subscribe()
    } else {
      walletMembers.value = []
      walletTransactions.value = []
    }
  }

  // Computed
  const isOwner = computed(() =>
    activeWallet.value?.role === 'owner'
  )

  const walletBalance = computed(() =>
    walletTransactions.value.reduce(
      (sum, t) => sum + (t.type === 'income' ? t.amount : -t.amount), 0
    )
  )

  const walletTotalExpenses = computed(() =>
    walletTransactions.value
      .filter(t => t.type === 'expense')
      .reduce((sum, t) => sum + t.amount, 0)
  )

  const walletTotalIncome = computed(() =>
    walletTransactions.value
      .filter(t => t.type === 'income')
      .reduce((sum, t) => sum + t.amount, 0)
  )

  // Init watchers
  if (!initialized) {
    initialized = true
    watch(isAuthenticated, (auth) => {
      if (auth) {
        fetchWallets()
      } else {
        if (realtimeChannel) {
          supabase.removeChannel(realtimeChannel)
          realtimeChannel = null
        }
        wallets.value = []
        activeWallet.value = null
        walletMembers.value = []
        walletTransactions.value = []
      }
    }, { immediate: true })

    // Ri-fetcha transazioni wallet quando cambia mese
    watch(monthKey, () => {
      if (activeWallet.value) {
        fetchWalletTransactions(activeWallet.value.id)
      }
    })
  }

  return {
    wallets,
    activeWallet,
    walletMembers,
    walletTransactions,
    loading,
    error,
    isOwner,
    walletBalance,
    walletTotalExpenses,
    walletTotalIncome,
    fetchWallets,
    createWallet,
    updateWallet,
    deleteWallet,
    setActiveWallet,
    fetchMembers,
    addMember,
    removeMember,
    leaveWallet,
    searchUsers,
    fetchWalletTransactions,
    addWalletTransaction,
  }
}
