
self.addEventListener("push", (event) => {
  let data = {};

  try {
    data = event.data?.json() || {};
  } catch {
    data = {
      title: "Rotate Reminder 🔔",
      body: event.data?.text() || "You have an upcoming rotation!"
    };
  }

  event.waitUntil(
    self.registration.showNotification(
      data.title || "Rotate Reminder 🔔",
      {
        body: data.body || "You have an upcoming rotation!",
        icon: "/favicon.svg",
        data: { url: data.url || "/" }
      }
    )
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();

  const url = new URL(
    event.notification.data?.url || "/",
    self.location.origin
  );

  if (url.origin !== self.location.origin) return;

  event.waitUntil(clients.openWindow(url.href));
});
