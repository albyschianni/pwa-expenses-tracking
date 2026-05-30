import { ref } from 'vue'
import { supabase } from '../lib/supabase'
import { useAuth } from './useAuth'

// VAPID public key — must match the one in Supabase Edge Function secrets
const VAPID_PUBLIC_KEY = 'BJmFgiUBsKet7iAxDnPfw0ulaPDMVU_FhWqf5Urv99zlX1tdwNseolBKDonR-0C9voQtQX-E56XYacqhr3F1_YE'

const permissionState = ref<NotificationPermission>(
  typeof Notification !== 'undefined' ? Notification.permission : 'default'
)
const isSubscribed = ref(false)
const pushSupported = ref('serviceWorker' in navigator && 'PushManager' in window)

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/')
  const rawData = atob(base64)
  const outputArray = new Uint8Array(rawData.length)
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i)
  }
  return outputArray
}

export function usePushNotifications() {
  const { user } = useAuth()

  async function requestPermission(): Promise<boolean> {
    if (!pushSupported.value) return false

    const result = await Notification.requestPermission()
    permissionState.value = result

    if (result === 'granted') {
      await subscribe()
      return true
    }
    return false
  }

  async function subscribe() {
    if (!user.value || !pushSupported.value) return

    try {
      const registration = await navigator.serviceWorker.ready

      // Unsubscribe old subscription if it exists (key may have changed)
      const existing = await registration.pushManager.getSubscription()
      if (existing) {
        await existing.unsubscribe()
      }

      // Create fresh subscription with current VAPID key
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY) as BufferSource,
      })

      // Save to Supabase
      const subJson = subscription.toJSON()
      const keys = subJson.keys as { p256dh: string; auth: string }

      await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.value.id,
          endpoint: subscription.endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
        }, { onConflict: 'user_id,endpoint' })

      isSubscribed.value = true
    } catch (e) {
      console.error('Push subscription failed:', e)
    }
  }

  async function checkSubscription() {
    if (!pushSupported.value) return

    permissionState.value = Notification.permission

    if (Notification.permission === 'granted' && user.value) {
      // Always re-subscribe to ensure DB is in sync and key is current
      await subscribe()
    }
  }

  return {
    pushSupported,
    permissionState,
    isSubscribed,
    requestPermission,
    subscribe,
    checkSubscription,
  }
}
