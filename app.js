/*************************************************
 * CONFIG
 *************************************************/
const API_URL = "https://chokepointsmaster.k7jzqg8c4k.workers.dev/api/chokepoints";
const STORAGE_KEY = "subscribed_chokepoints";

/*************************************************
 * BASIC HELPERS
 *************************************************/
function getSubscriptions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveSubscriptions(list) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

/*************************************************
 * USER AGENT / ENV CHECKS
 *************************************************/
const ua = navigator.userAgent.toLowerCase();
const isIOS = /iphone|ipad|ipod/.test(ua);
const isPWA =
  window.matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
const isFacebookBrowser =
  navigator.userAgent.includes("FBAN") ||
  navigator.userAgent.includes("FBAV");
const isInstagramBrowser = navigator.userAgent.includes("Instagram");

/*************************************************
 * TOAST
 *************************************************/
function showToast(message) {
  const t = document.createElement("div");
  t.innerHTML = message;
  t.style = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #222;
    color: #fff;
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 14px;
    opacity: 0;
    transition: opacity .4s;
    z-index: 99999;
  `;
  document.body.appendChild(t);
  requestAnimationFrame(() => (t.style.opacity = 1));
  setTimeout(() => {
    t.style.opacity = 0;
    setTimeout(() => t.remove(), 400);
  }, 5000);
}

/*************************************************
 * 🔑 ONESIGNAL READY PROMISE (CRITICAL FIX)
 *************************************************/
let oneSignalResolve;
const oneSignalReady = new Promise(resolve => {
  oneSignalResolve = resolve;
});

// Ensure global exists before SDK loads
window.OneSignalDeferred = window.OneSignalDeferred || [];

window.OneSignalDeferred.push(async function (OneSignal) {
  try {
    console.log("🟡 OneSignal init starting");

    await OneSignal.init({
      appId: "a0be9561-f1b6-4f22-a214-e8b6412f28b3",
      serviceWorkerPath: "OneSignalSDKWorker.js",
      serviceWorkerParam: { scope: "/" },
      notifyButton: { enable: false }
    });

    console.log("✅ OneSignal init completed");

    // 🔥 THIS WAS MISSING
    oneSignalResolve(OneSignal);

  } catch (e) {
    console.error("❌ OneSignal init failed", e);
  }
});


/*************************************************
 * ENSURE PUSH IS ENABLED
 *************************************************/
async function ensurePushEnabledFromClick() {
  console.log("ensurePushEnabledFromClick()");

  // Hard blocks
  if (isFacebookBrowser || isInstagramBrowser) {
    showToast(
      isIOS
        ? "⚠️ Open in Safari → Add to Home Screen"
        : "⚠️ Open in Chrome (in-app browser unsupported)"
    );
    return false;
  }

  if (isIOS && !isPWA) {
    showToast("📱 Add to Home Screen required for iOS alerts");
    return false;
  }

  // 🚨 CRITICAL: permission MUST be requested synchronously
  try {
    const permission = await OneSignal.Notifications.requestPermission();
    console.log("Permission result:", permission);

    if (!permission) {
      showToast("🔕 Notifications blocked in browser");
      return false;
    }

    return true;
  } catch (e) {
    console.error("Permission request failed", e);
    showToast("❌ Failed to request permission");
    return false;
  }
}


/*************************************************
 * TOGGLE CHOKEPOINT SUBSCRIPTION
 *************************************************/
async function toggleChokepointSubscription(chokepointId) {
  console.log("Clicked chokepoint:", chokepointId);

  // 1️⃣ Permission — MUST happen immediately
  const permissionOk = await ensurePushEnabledFromClick();
  if (!permissionOk) {
    console.log("Permission not granted, aborting");
    return;
  }

  // 2️⃣ Now we can safely await OneSignal init
  const OneSignalInstance = await oneSignalReady;
  console.log("OneSignal fully ready");

  // 3️⃣ Ensure push subscription
  await OneSignalInstance.User.PushSubscription.optIn();

  const subs = getSubscriptions();
  const alreadySubscribed = subs.includes(chokepointId);

  try {
    if (alreadySubscribed) {
      await OneSignalInstance.User.addTag(`cp_${chokepointId}`, "0");
      saveSubscriptions(subs.filter(id => id !== chokepointId));
      showToast("🔕 Alerts disabled");
    } else {
      await OneSignalInstance.User.addTag(`cp_${chokepointId}`, "1");
      saveSubscriptions([...subs, chokepointId]);
      showToast("🔔 Alerts enabled");
    }

    renderUI(window.__AREAS__);
  } catch (e) {
    console.error("Subscription error", e);
    showToast("⚠️ Failed to update alerts");
  }
}


/*************************************************
 * LOAD CHOKEPOINTS
 *************************************************/
async function loadChokepoints() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed to load chokepoints");
  return res.json();
}

/*************************************************
 * RENDER UI
 *************************************************/
function renderUI(areas) {
  const container = document.getElementById("app");
  const subs = getSubscriptions();
  container.innerHTML = "";

  Object.keys(areas).forEach(areaName => {
    const areaDiv = document.createElement("div");
    areaDiv.className = "area";

    const title = document.createElement("h2");
    title.textContent = areaName;
    areaDiv.appendChild(title);

    areas[areaName].forEach(cp => {
      const item = document.createElement("div");
      item.className = "chokepoint";

      const isSub = subs.includes(cp.id);
      if (isSub) item.classList.add("subscribed");

      const name = document.createElement("div");
      name.textContent = cp.name;

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = isSub ? "Subscribed" : "Subscribe";
      if (isSub) badge.classList.add("sub");

      item.appendChild(name);
      item.appendChild(badge);

      item.onclick = () => toggleChokepointSubscription(cp.id);

      areaDiv.appendChild(item);
    });

    container.appendChild(areaDiv);
  });
}

/*************************************************
 * INIT
 *************************************************/
(async function init() {
  const app = document.getElementById("app");
  try {
    const data = await loadChokepoints();
    window.__AREAS__ = data.areas;
    renderUI(data.areas);
  } catch (e) {
    console.error(e);
    app.textContent =
      "❌ Failed to load choke points. Please try again later.";
  }
})();
