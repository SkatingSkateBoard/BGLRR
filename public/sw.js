// public/sw.js
const SW_VERSION = "v1.1.3";

const EMERGENCY_VIBRATION = [
  250, 100, 250, 100, 250,
  400,
  700, 150, 700,
];

const ANNOUNCEMENT_VIBRATION = [200, 100, 200];

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

  const isAnnouncement = data.type === "announcement";

  const title =
    data.title ||
    (isAnnouncement ? "📢 Community Announcement" : "🚨 Emergency Dispatch Alert");

  const options = {
    body:
      data.body ||
      (isAnnouncement
        ? "New community announcement posted."
        : "New emergency on standby — Tap to claim now."),
    icon: "/icon512_rounded.png",
    badge: "/icon-192x192.png",
    vibrate: isAnnouncement ? ANNOUNCEMENT_VIBRATION : EMERGENCY_VIBRATION,
    requireInteraction: !isAnnouncement,
    renotify: true,
    silent: false,
    tag: isAnnouncement
      ? `announcement-${data.announcementId || "general"}`
      : data.emergencyId
      ? `emergency-${data.emergencyId}`
      : "dispatch-alert",
    data: {
      url: data.url || (isAnnouncement ? "/resident" : "/responder"),
    },
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || "/responder";
  const basePath = targetUrl.startsWith("/resident") ? "/resident" : "/responder";

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(async (clientList) => {
        for (const client of clientList) {
          if (client.url.includes(basePath) && "focus" in client) {
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


self.addEventListener("message", (event) => {
  if (event.data?.type === "GET_VERSION") {
    event.ports[0]?.postMessage({ version: SW_VERSION });
  }
});
