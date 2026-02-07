import { ref, computed } from 'vue'
import { supabase } from '../lib/supabase'
import type { User, Session } from '@supabase/supabase-js'

// Shared reactive state (singleton)
const user = ref<User | null>(null)
const session = ref<Session | null>(null)
const loading = ref(true)
const error = ref<string | null>(null)

// Initialize auth state listener (called once)
let initialized = false

async function initAuth() {
  if (initialized) return
  initialized = true

  // Get initial session
  const { data } = await supabase.auth.getSession()
  session.value = data.session
  user.value = data.session?.user ?? null
  loading.value = false

  // Listen for auth changes
  supabase.auth.onAuthStateChange((_event, newSession) => {
    session.value = newSession
    user.value = newSession?.user ?? null
    loading.value = false
  })
}

// Start initialization immediately
initAuth()

export function useAuth() {
  const isAuthenticated = computed(() => !!user.value)

  async function signUp(email: string, password: string) {
    error.value = null
    loading.value = true

    try {
      const { data, error: authError } = await supabase.auth.signUp({
        email,
        password,
      })

      if (authError) throw authError

      // Supabase sends confirmation email by default
      return { user: data.user, needsConfirmation: !data.session }
    } catch (e: any) {
      error.value = e.message || 'Sign up failed'
      throw e
    } finally {
      loading.value = false
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
    loading.value = true

    try {
      const { error: authError } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      })

      if (authError) throw authError
    } catch (e: any) {
      error.value = e.message || 'Password reset failed'
      throw e
    } finally {
      loading.value = false
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

  function clearError() {
    error.value = null
  }

  return {
    user,
    session,
    loading,
    error,
    isAuthenticated,
    signUp,
    signIn,
    signInWithGoogle,
    signOut,
    resetPassword,
    clearError,
  }
}
