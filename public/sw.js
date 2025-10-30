self.addEventListener('push', (event) => {
  const data = event.data?.json() ?? {};
  const title = data.title || 'Daily Rep';
  const options = {
    body: data.body || 'New notification',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    data: data.data || {},
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  
  event.waitUntil(
    clients.openWindow('/')
  );
});
