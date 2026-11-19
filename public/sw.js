// public/sw.js
const SW_VERSION = "v1"; // <-- Change to "v2", "v3", etc. every time you push to Cloudflare

const EMERGENCY_VIBRATION = [
  250, 100, 250, 100, 250, // rapid triple pulse
  400,                     // hold
  700, 150, 700,           // long urgent pulses
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(cacheNames.map((cache) => caches.delete(cache)));
    }).then(() => self.clients.claim())
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;

  let data = {};
  try {
    data = event.data.json();
  } catch {
    data = { title: "Emergency Dispatch Alert", body: event.data.text() };
  }

  const title = data.title || "🚨 Emergency Dispatch Alert";
  const options = {
    body: data.body || "New emergency on standby — Tap to claim now.",
    icon: "/icon512_rounded.png", 
    badge: "/icon-192x192.png",
    vibrate: EMERGENCY_VIBRATION,
    requireInteraction: true,
    renotify: true,
    silent: false,
    tag: data.emergencyId ? `emergency-${data.emergencyId}` : "dispatch-alert",
    data: {
      url: data.url || "/responder",
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/responder";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/responder") && "focus" in client) {
            await client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});
