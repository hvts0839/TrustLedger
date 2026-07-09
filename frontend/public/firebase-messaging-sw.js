// ponytail: CDN compat SDK — service workers can't import from npm
importScripts('https://www.gstatic.com/firebasejs/11.6.2/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/11.6.2/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: 'AIzaSyC3rnD0BkW1mJoUEIi_7Zma50OcB5YHp5c',
  authDomain: 'trustledger-747ba.firebaseapp.com',
  projectId: 'trustledger-747ba',
  storageBucket: 'trustledger-747ba.firebasestorage.app',
  messagingSenderId: '737860098058',
  appId: '1:737860098058:web:22eb43a1b6f72af3eae7f3',
  measurementId: 'G-YWX71NL9CH',
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  const { title, body } = payload.notification || {}
  const data = payload.data || {}
  self.registration.showNotification(title || 'TrustLedger', {
    body: body || '',
    icon: '/favicon.svg',
    data,
  })
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const { route, id } = event.notification.data || {}
  const url = route === 'invoice' && id ? `/invoices/${id}` : '/dashboard'
  event.waitUntil(clients.openWindow(url))
})
