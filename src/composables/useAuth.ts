import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Check if this page load comes from a password recovery email link
// Must run before Supabase processes the URL hash
function detectRecoveryFromUrl(): boolean {
  const hash = new URLSearchParams(window.location.hash.substring(1))
  const search = new URLSearchParams(window.location.search)
  return hash.get('type') === 'recovery' || search.get('type') === 'recovery'
}

// Shared reactive state (singleton)
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)
const isPasswordRecovery = ref(detectRecoveryFromUrl())

// Initialize auth state listener (called once)
let initialized = false

async function initAuth() {
  if (initialized) return
  initialized = true

  // Set up listener FIRST so we catch PASSWORD_RECOVERY from URL hash
  // before getSession() processes the token
  supabase.auth.onAuthStateChange((_event, newSession) => {
    if (_event === 'PASSWORD_RECOVERY') {
      isPasswordRecovery.value = true
    }
    // Note: don't reset isPasswordRecovery on SIGNED_IN — Supabase fires it
    // right after PASSWORD_RECOVERY. It's reset manually in ResetPasswordPage
    // after the password is successfully updated.
    session.value = newSession
    user.value = newSession?.user ?? null
    loading.value = false
  })

  // getSession() triggers URL hash processing and fires onAuthStateChange
  // with INITIAL_SESSION (and PASSWORD_RECOVERY if recovery token present)
  await supabase.auth.getSession()
}

// Start initialization immediately
initAuth()

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)
  const displayName = computed(() => user.value?.user_metadata?.display_name || '')

  async function signUp(email: string, password: string) {
    error.value = null
    // Note: don't set global loading=true here — it unmounts AuthPage via v-if chain in App.vue

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      // Check if email confirmation is needed:
      // - No session means confirmation required
      // - User exists but email not confirmed also means confirmation required
      const needsConfirmation = !data.session || !data.user?.confirmed_at
      return { user: data.user, needsConfirmation }
    } catch (e: any) {
      error.value = e.message || 'Sign up failed'
      throw e
    }
  }

  async function signIn(email: string, password: string) {
    error.value = null
    loading.value = true

    try {
      const { data, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (authError) throw authError
      return data.user
    } catch (e: any) {
      error.value = e.message || 'Sign in failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function signOut() {
    error.value = null
    loading.value = true

    try {
      const { error: authError } = await supabase.auth.signOut()
      if (authError) throw authError
    } catch (e: any) {
      error.value = e.message || 'Sign out failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function resetPassword(email: string) {
    error.value = null
    // Note: don't set global loading=true here — it unmounts AuthPage via v-if chain in App.vue

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (authError) throw authError
    } catch (e: any) {
      error.value = e.message || 'Password reset failed'
      throw e
    }
  }

  async function signInWithGoogle() {
    error.value = null
    loading.value = true

    try {
      const { error: authError } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
          },
        },
      })

      if (authError) throw authError
    } catch (e: any) {
      error.value = e.message || 'Google sign in failed'
      loading.value = false
      throw e
    }
    // Note: loading stays true as we're redirecting to Google
  }

  async function updateProfile(data: { displayName?: string; email?: string }) {
    error.value = null
    loading.value = true

    try {
      const updateData: any = {}

      if (data.displayName !== undefined) {
        updateData.data = { display_name: data.displayName }
      }

      if (data.email) {
        updateData.email = data.email
      }

      const { data: result, error: authError } = await supabase.auth.updateUser(updateData)
      if (authError) throw authError

      user.value = result.user
    } catch (e: any) {
      error.value = e.message || 'Update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function updatePassword(newPassword: string) {
    error.value = null
    loading.value = true

    try {
      const { error: authError } = await supabase.auth.updateUser({
        password: newPassword,
      })
      if (authError) throw authError
    } catch (e: any) {
      error.value = e.message || 'Password update failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  async function deleteAccount() {
    error.value = null
    loading.value = true

    try {
      const { error: fnError } = await supabase.functions.invoke('delete-account')
      if (fnError) throw fnError
      await supabase.auth.signOut()
    } catch (e: any) {
      error.value = e.message || 'Account deletion failed'
      throw e
    } finally {
      loading.value = false
    }
  }

  function clearError() {
    error.value = null
  }

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    isPasswordRecovery,
    displayName,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    updateProfile,
    updatePassword,
    deleteAccount,
    clearError,
  }
}
