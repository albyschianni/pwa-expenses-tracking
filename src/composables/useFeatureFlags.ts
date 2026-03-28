import { reactive, computed } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// ── Singleton store — una sola query per sessione ───────────

const flagsStore = reactive({
  flags: {} as Record<string, { enabled: boolean; allowedUsers: string[] }>,
  loaded: false,
  loading: false,
})

export function useFeatureFlags() {
  const { user } = useAuth()

  async function loadFlags() {
    if (flagsStore.loaded || flagsStore.loading) return
    flagsStore.loading = true

    try {
      const { data, error } = await supabase
        .from('feature_flags')
        .select('feature, enabled, allowed_users')

      if (error) throw error

      for (const flag of data || []) {
        flagsStore.flags[flag.feature] = {
          enabled: flag.enabled,
          allowedUsers: flag.allowed_users || [],
        }
      }
      flagsStore.loaded = true
    } catch (e) {
      console.error('Failed to load feature flags:', e)
      flagsStore.loaded = true // fail-safe: tutto disabilitato
    } finally {
      flagsStore.loading = false
    }
  }

  function isEnabled(feature: string): boolean {
    const flag = flagsStore.flags[feature]
    if (!flag) return false
    if (flag.enabled) return true
    return flag.allowedUsers.includes(user.value?.id ?? '')
  }

  // Reset quando l'utente fa logout (così al prossimo login ricarica)
  function resetFlags() {
    flagsStore.flags = {}
    flagsStore.loaded = false
    flagsStore.loading = false
  }

  return {
    loadFlags,
    isEnabled,
    resetFlags,
    loaded: computed(() => flagsStore.loaded),
    loading: computed(() => flagsStore.loading),
  }
}
