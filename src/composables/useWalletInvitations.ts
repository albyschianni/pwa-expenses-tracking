import { ref, watch } from 'vue'
import { supabase, type DbWalletInvitation } from '../lib/supabase'
import { useAuth } from './useAuth'
import { useSharedWallets } from './useSharedWallets'

export interface WalletInvitation {
  id: string
  walletId: string
  walletName: string
  invitedBy: string
  inviterName: string
  status: 'pending' | 'accepted' | 'rejected'
  createdAt: string
}

// Singleton state
const pendingInvitations = ref<WalletInvitation[]>([])
const loading = ref(false)
let initialized = false

export function useWalletInvitations() {
  const { user, isAuthenticated } = useAuth()
  const { fetchWallets } = useSharedWallets()

  async function fetchPendingInvitations() {
    if (!user.value) return

    loading.value = true
    try {
      const { data, error } = await supabase
        .from('wallet_invitations')
        .select('*')
        .eq('invited_user_id', user.value.id)
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      if (error) throw error
      if (!data || data.length === 0) {
        pendingInvitations.value = []
        return
      }

      // Fetch wallet names and inviter info
      const walletIds = [...new Set(data.map((d: DbWalletInvitation) => d.wallet_id))]
      const inviterIds = [...new Set(data.map((d: DbWalletInvitation) => d.invited_by))]

      const [walletResult, inviterResult] = await Promise.all([
        supabase.from('shared_wallets').select('id, name').in('id', walletIds),
        supabase.rpc('get_users_by_ids', { user_ids: inviterIds }),
      ])

      const walletMap = new Map<string, string>()
      for (const w of walletResult.data || []) {
        walletMap.set(w.id, w.name)
      }

      const inviterMap = new Map<string, string>()
      for (const u of inviterResult.data || []) {
        inviterMap.set(u.id, u.display_name || u.email)
      }

      pendingInvitations.value = data.map((inv: DbWalletInvitation) => ({
        id: inv.id,
        walletId: inv.wallet_id,
        walletName: walletMap.get(inv.wallet_id) || 'Portafoglio',
        invitedBy: inv.invited_by,
        inviterName: inviterMap.get(inv.invited_by) || 'Utente',
        status: inv.status,
        createdAt: inv.created_at,
      }))
    } catch (e) {
      console.error('Failed to fetch invitations:', e)
    } finally {
      loading.value = false
    }
  }

  async function acceptInvitation(invitationId: string) {
    try {
      const { error } = await supabase.rpc('accept_wallet_invitation', {
        invitation_id: invitationId,
      })
      if (error) throw error

      // Remove from local list
      pendingInvitations.value = pendingInvitations.value.filter(i => i.id !== invitationId)

      // Refresh wallets so the new one appears
      await fetchWallets()
    } catch (e) {
      console.error('Failed to accept invitation:', e)
      throw e
    }
  }

  async function rejectInvitation(invitationId: string) {
    try {
      const { error } = await supabase.rpc('reject_wallet_invitation', {
        invitation_id: invitationId,
      })
      if (error) throw error

      pendingInvitations.value = pendingInvitations.value.filter(i => i.id !== invitationId)
    } catch (e) {
      console.error('Failed to reject invitation:', e)
      throw e
    }
  }

  async function cancelInvitation(invitationId: string) {
    try {
      const { error } = await supabase
        .from('wallet_invitations')
        .delete()
        .eq('id', invitationId)
        .eq('status', 'pending')

      if (error) throw error
    } catch (e) {
      console.error('Failed to cancel invitation:', e)
      throw e
    }
  }

  async function sendInvitation(walletId: string, userId: string): Promise<boolean> {
    if (!user.value) throw new Error('Not authenticated')

    try {
      // Create invitation record
      const { data: invitation, error: insertErr } = await supabase
        .from('wallet_invitations')
        .insert({
          wallet_id: walletId,
          invited_by: user.value.id,
          invited_user_id: userId,
          status: 'pending',
        })
        .select()
        .single()

      if (insertErr) throw insertErr

      // Trigger push notification via Edge Function
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.access_token) {
          await supabase.functions.invoke('send-push', {
            body: { invitation_id: invitation.id },
            headers: {
              Authorization: `Bearer ${session.access_token}`,
            },
          })
        }
      } catch (pushErr) {
        // Push failure is non-critical — invitation is still created
        console.warn('Push notification failed (non-critical):', pushErr)
      }

      return true
    } catch (e: any) {
      // Handle duplicate invitation
      if (e.code === '23505') {
        throw new Error('Invito già inviato a questo utente')
      }
      throw e
    }
  }

  // Init: fetch invitations on auth, set up realtime
  if (!initialized) {
    initialized = true

    watch(isAuthenticated, (auth) => {
      if (auth) {
        fetchPendingInvitations()
      } else {
        pendingInvitations.value = []
      }
    }, { immediate: true })
  }

  return {
    pendingInvitations,
    loading,
    fetchPendingInvitations,
    acceptInvitation,
    rejectInvitation,
    cancelInvitation,
    sendInvitation,
  }
}
