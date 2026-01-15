// CHANGE THIS ON EVERY DEPLOY
const SW_VERSION = "2026-01-15-quiet-idb";

/**
 * Load OneSignal Service Worker
 */
importScripts("https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.sw.js");

/**
 * Install / Activate
 */
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

/*************************************************
 * IndexedDB helpers (MUST match quiet-hours.js)
 *************************************************/
const DB_NAME = "pta_prefs";
const STORE = "prefs";
const KEY = "quiet_hours";

function getQuietHours() {
  return new Promise((resolve) => {
    const openReq = indexedDB.open(DB_NAME, 1);

    openReq.onerror = () => resolve(null);

    openReq.onupgradeneeded = () => {
      openReq.result.createObjectStore(STORE);
    };

    openReq.onsuccess = () => {
      const db = openReq.result;
      const tx = db.transaction(STORE, "readonly");
      const store = tx.objectStore(STORE);
      const getReq = store.get(KEY);

      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => resolve(null);
    };
  });
}

/*************************************************
 * 🔕 Intercept notification display
 *************************************************/
self.addEventListener("notificationreceived", (event) => {
  event.waitUntil((async () => {
    const notification = event.notification;
    if (!notification) return;

    const prefs = await getQuietHours();

    // If no quiet hours set → allow notification
    if (!prefs || prefs.start == null || prefs.end == null) {
      self.registration.showNotification(
        notification.title,
        notification.options
      );
      return;
    }

    const { start, end } = prefs;
    const hour = new Date().getHours();

    const isQuietTime =
      start < end
        ? hour >= start && hour < end
        : hour >= start || hour < end;

    if (isQuietTime) {
      // ❌ Suppress silently
      notification.close();
      return;
    }

    // ✅ Show notification
    self.registration.showNotification(
      notification.title,
      notification.options
    );
  })());
});
