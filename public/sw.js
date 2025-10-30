// Import Firebase scripts for service worker
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA6DHaYnnhyrcG4r12X4EqDhpshE6D8LDA",
  authDomain: "thedailyrep-db1d4.firebaseapp.com",
  projectId: "thedailyrep-db1d4",
  storageBucket: "thedailyrep-db1d4.firebasestorage.app",
  messagingSenderId: "34827926020",
  appId: "1:34827926020:web:797bbee0e0a9f4ec235351",
  measurementId: "G-M0629HKEKD"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages from FCM
messaging.onBackgroundMessage((payload) => {
  console.log('Received FCM background message:', payload);

  const notificationTitle = payload.notification?.title || 'Daily Rep';
  const notificationOptions = {
    body: payload.notification?.body || 'New notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    data: payload.data || {}
  };

  return self.registration.showNotification(notificationTitle, notificationOptions);
});

self.addEventListener('notificationclick', (event) => {
  console.log('Notification clicked:', event);
  event.notification.close();

  // Open the app when notification is clicked
  const urlToOpen = event.notification.data?.url || '/';
  
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If app is already open, focus it
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
