importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-database-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCPGgtXoDUycykLaTSee0S0yY0tkeJpqKI",
  authDomain: "data-com-a94a8.firebaseapp.com",
  databaseURL: "https://data-com-a94a8-default-rtdb.firebaseio.com",
  projectId: "data-com-a94a8",
  storageBucket: "data-com-a94a8.firebasestorage.app",
  messagingSenderId: "276904640935",
  appId: "1:276904640935:web:9cd805aeba6c34c767f682",
  measurementId: "G-FYQCWY5G4S"
});

var messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  var title = (payload.notification && payload.notification.title) ? payload.notification.title : 'Express Notify';
  var body  = (payload.notification && payload.notification.body)  ? payload.notification.body  : '';
  var icon  = (payload.notification && payload.notification.icon)  ? payload.notification.icon  : '/icon.png';

  // ── Sauvegarde dans Firebase Realtime Database ──
  firebase.database().ref('notifications').push({
    title: title,
    body:  body,
    ts:    Date.now()
  }).catch(function(err) {
    console.error('[SW] Erreur écriture DB :', err);
  });

  // ── Affichage de la notification système ──
  var options = {
    body: body,
    icon: icon,
    badge: '/badge.png',
    data: payload.data || {},
    requireInteraction: true,
    vibrate: [200, 100, 200],
    actions: [
      { action: 'open',  title: 'Voir' },
      { action: 'close', title: 'Fermer' }
    ]
  };

  return self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  if (event.action === 'close') return;
  var url = (event.notification.data && event.notification.data.url)
    ? event.notification.data.url
    : '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(clientList) {
      for (var i = 0; i < clientList.length; i++) {
        var client = clientList[i];
        if (client.url === url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(url);
      }
    })
  );
});
