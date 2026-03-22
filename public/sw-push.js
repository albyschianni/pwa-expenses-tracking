// Custom push handler — imported by the Workbox service worker

self.addEventListener('push', (event) => {
  if (!event.data) return

  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'Expense Tracker', body: event.data.text() }
  }

  const title = data.title || 'Expense Tracker'
  const options = {
    body: data.body || '',
    icon: '/pwa-192x192.png',
    badge: '/pwa-192x192.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: [],
    tag: data.data?.type || 'default',
    renotify: true,
  }

  // Add accept/reject actions for wallet invitations
  if (data.data?.type === 'wallet_invitation') {
    options.actions = [
      { action: 'open', title: 'Apri' },
    ]
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const notifData = event.notification.data || {}
  const targetTab = notifData.type === 'wallet_invitation' ? 'wallets' : null

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If app is already open, send message and focus
      for (const client of clientList) {
        if (client.url.includes(self.location.origin) && 'focus' in client) {
          if (targetTab) {
            client.postMessage({ type: 'navigate', tab: targetTab })
          }
          return client.focus()
        }
      }
      // Otherwise open the app with tab parameter
      const url = targetTab ? `/?tab=${targetTab}` : '/'
      return self.clients.openWindow(url)
    }),
  )
})
