import { ref } from 'vue'
import { APP_VERSION } from '../constants/version'
import { useFeatureFlags } from './useFeatureFlags'

export interface ChangelogHighlight {
  icon: string
  text: string
}

export interface ChangelogEntry {
  version: string
  date: string
  title: string
  requiredFlag?: string
  highlights: ChangelogHighlight[]
}

const STORAGE_KEY = 'expense-tracker-last-seen-version'
const showWhatsNew = ref(false)
const changelogEntries = ref<ChangelogEntry[]>([])

function getLastSeenVersion(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function setLastSeenVersion(version: string) {
  try {
    localStorage.setItem(STORAGE_KEY, version)
  } catch {
    // ignore
  }
}

function compareVersions(a: string, b: string): number {
  const pa = a.split('.').map(Number)
  const pb = b.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

export function useWhatsNew() {
  async function checkForUpdates() {
    const lastSeen = getLastSeenVersion()

    // First install: silently set version, don't show modal
    if (!lastSeen) {
      setLastSeenVersion(APP_VERSION)
      return
    }

    // Same version: nothing to show
    if (lastSeen === APP_VERSION) return

    // Version changed: fetch changelog and filter relevant entries
    try {
      const response = await fetch('/changelog.json')
      if (!response.ok) return // Don't mark as seen — retry next time

      const allEntries: ChangelogEntry[] = await response.json()

      const { isEnabled } = useFeatureFlags()

      // Filter entries newer than lastSeen, up to and including current version,
      // and only show entries whose requiredFlag (if any) is enabled for this user
      const relevant = allEntries.filter(entry =>
        compareVersions(entry.version, lastSeen) > 0 &&
        compareVersions(entry.version, APP_VERSION) <= 0 &&
        (!entry.requiredFlag || isEnabled(entry.requiredFlag))
      )

      if (relevant.length > 0) {
        changelogEntries.value = relevant
        showWhatsNew.value = true
      } else {
        // No relevant entries but version changed — just update silently
        setLastSeenVersion(APP_VERSION)
      }
    } catch {
      // Network error — do NOT mark as seen, retry on next app open
    }
  }

  function dismiss() {
    showWhatsNew.value = false
    setLastSeenVersion(APP_VERSION)
  }

  return {
    showWhatsNew,
    changelogEntries,
    checkForUpdates,
    dismiss,
  }
}
