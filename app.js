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
 * USER AGENT / ENV CHECKS (from your reference)
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
 * TOAST (unchanged, simplified slightly)
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
  requestAnimationFrame(() => {
    t.style.opacity = 1;
  });
  setTimeout(() => {
    t.style.opacity = 0;
    setTimeout(() => t.remove(), 400);
  }, 5000);
}

/*************************************************
 * ENSURE PUSH IS ENABLED (CORE NOTIFY FLOW)
 *************************************************/
async function ensurePushEnabled() {
  if (isFacebookBrowser || isInstagramBrowser) {
    if (isIOS) {
      showToast(`
        ⚠️ iOS does not allow notifications inside Facebook.<br>
        Open in Safari → Add to Home Screen.
      `);
    } else {
      showToast(`
        ⚠️ FB / Instagram browser does not support notifications.<br>
        Open in Chrome.
      `);
    }
    return false;
  }

  if (isIOS && !isPWA) {
    showToast(`
      📱 iOS requires Add to Home Screen.<br>
      Share → Add to Home Screen.
    `);
    return false;
  }

  try {
    const permission = await OneSignal.Notifications.requestPermission();
    if (!permission) {
      showToast("🔕 Notifications are blocked in browser settings.");
      return false;
    }

    await OneSignal.User.PushSubscription.optIn();
    return OneSignal.User.PushSubscription.optedIn === true;
  } catch (e) {
    console.error(e);
    showToast("❌ Failed to enable alerts.");
    return false;
  }
}

/*************************************************
 * TOGGLE CHOKEPOINT SUBSCRIPTION
 *************************************************/
async function toggleChokepointSubscription(chokepointId) {
  console.log("Clicked chokepoint:", chokepointId);
  const subs = getSubscriptions();
  const alreadySubscribed = subs.includes(chokepointId);

  const enabled = await ensurePushEnabled();
  if (!enabled) return;

  window.OneSignalDeferred.push(async function (OneSignal) {
    try {
      if (alreadySubscribed) {
        // UNSUBSCRIBE
        await OneSignal.User.addTag(`cp_${chokepointId}`, "0");
        saveSubscriptions(subs.filter(id => id !== chokepointId));
        showToast("🔕 Alerts disabled for this road");
      } else {
        // SUBSCRIBE
        await OneSignal.User.addTag(`cp_${chokepointId}`, "1");
        subs.push(chokepointId);
        saveSubscriptions(subs);
        showToast("🔔 Alerts enabled for this road");
      }

      renderUI(window.__AREAS__);
    } catch (e) {
      console.error(e);
      showToast("⚠️ Failed to update subscription");
    }
  });
}

/*************************************************
 * LOAD CHOKEPOINTS FROM API
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
