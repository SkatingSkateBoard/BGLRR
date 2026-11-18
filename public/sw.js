// public/sw.js

// Urgent, non-Morse alarm pattern: [vibrate, pause, vibrate, pause, ...] in ms.
// Three rapid pulses, a short hold, then two long pulses.
const EMERGENCY_VIBRATION = [
  250, 100, 250, 100, 250, // rapid triple pulse
  400,                     // hold
  700, 150, 700,           // long urgent pulses
];

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
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
    vibrate: EMERGENCY_VIBRATION,
    requireInteraction: true,
    renotify: true, // re-alert (vibrate/sound) even when reusing the same tag
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
      .then((clientList) => {
        for (const client of clientList) {
          if (client.url.includes("/responder") && "focus" in client) {
            client.navigate(targetUrl);
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
      })
  );
});