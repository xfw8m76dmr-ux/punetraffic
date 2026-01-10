/*************************************************
 * CONFIG
 *************************************************/
const API_URL = "https://punetrafficcron.k7jzqg8c4k.workers.dev/api/chokepoints";
const STORAGE_KEY = "subscribed_chokepoints";

/*************************************************
 * STATE
 *************************************************/
let ALL_CHOKEPOINTS = [];
let SHOW_ONLY_SUBSCRIBED = false;

/*************************************************
 * STORAGE HELPERS
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
 * ENV CHECKS (FROM YOUR FILE)
 *************************************************/
const ua = navigator.userAgent.toLowerCase();
const isIOS = /iphone|ipad|ipod/.test(ua);
const isPWA =
  window.matchMedia("(display-mode: standalone)").matches ||
  navigator.standalone === true;
const isFacebookBrowser = ua.includes("fban") || ua.includes("fbav");
const isInstagramBrowser = ua.includes("instagram");

/*************************************************
 * TOAST
 *************************************************/
function showToast(message) {
  const t = document.createElement("div");
  t.textContent = message;
  t.style = `
    position: fixed;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    background: #111;
    color: #fff;
    padding: 12px 18px;
    border-radius: 8px;
    font-size: 14px;
    z-index: 99999;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3500);
}

/*************************************************
 * 🔑 ONESIGNAL INIT
 *************************************************/
let oneSignalResolve;
const oneSignalReady = new Promise(r => (oneSignalResolve = r));

window.OneSignalDeferred = window.OneSignalDeferred || [];
window.OneSignalDeferred.push(async function (OneSignal) {
  await OneSignal.init({
    appId: "a0be9561-f1b6-4f22-a214-e8b6412f28b3",
    notifyButton: { enable: false }
  });
  oneSignalResolve(OneSignal);
});

/*************************************************
 * 🔔 SUBSCRIBE / UNSUBSCRIBE
 *************************************************/
async function toggleSubscription(chokepointId) {
  /* -------- HARD BLOCKS -------- */
  if (isFacebookBrowser || isInstagramBrowser) {
    showToast(
      isIOS
        ? "⚠️ Open in Safari → Add to Home Screen"
        : "⚠️ Open in Chrome (in-app browser unsupported)"
    );
    return;
  }

  if (isIOS && !isPWA) {
    showToast("📱 Add to Home Screen required for iOS alerts");
    return;
  }

  /* -------- WAIT FOR ONESIGNAL -------- */
  const OneSignalInstance = await oneSignalReady;

  /* -------- REQUEST PERMISSION (SAFE) -------- */
  let permission;
  try {
    permission =
      await OneSignalInstance.Notifications.requestPermission();
  } catch (e) {
    console.error("Permission request failed", e);
    showToast("❌ Failed to request permission");
    return;
  }

  if (!permission) {
    showToast("🔕 Notifications blocked");
    return;
  }

  /* -------- ENSURE PUSH SUB -------- */
  await OneSignalInstance.User.PushSubscription.optIn();

  const subs = getSubscriptions();
  const alreadySubscribed = subs.includes(chokepointId);

  try {
    if (alreadySubscribed) {
      await OneSignalInstance.User.addTag(
        `cp_${chokepointId}`,
        "0"
      );
      saveSubscriptions(subs.filter(id => id !== chokepointId));
      showToast("🔕 Alerts disabled");
    } else {
      await OneSignalInstance.User.addTag(
        `cp_${chokepointId}`,
        "1"
      );
      saveSubscriptions([...subs, chokepointId]);
      showToast("🔔 Alerts enabled");
    }

    render();
  } catch (e) {
    console.error("Subscription error", e);
    showToast("⚠️ Failed to update alerts");
  }
}

function formatCheckedAt(checkedAt) {
  if (!checkedAt) return "Unknown";

  const checkedTime = new Date(checkedAt);
  const now = new Date();
  const diffMs = now - checkedTime;
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr} hour${diffHr > 1 ? "s" : ""} ago`;

  return checkedTime.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/*************************************************
 * RENDER UI
 *************************************************/
function render() {
  const grid = document.getElementById("grid");
  const subs = getSubscriptions();
  grid.innerHTML = "";

  const list = SHOW_ONLY_SUBSCRIBED
    ? ALL_CHOKEPOINTS.filter(cp => subs.includes(cp.id))
    : ALL_CHOKEPOINTS;

  if (list.length === 0) {
    grid.innerHTML = "<p>No chokepoints subscribed.</p>";
    return;
  }

  list.forEach(cp => {
  const card = document.createElement("div");
  card.className = "card";

  const isSub = subs.includes(cp.id);
  const lastChecked = formatCheckedAt(cp.traffic?.checkedAt);

  card.innerHTML = `
    <h3>${cp.name}</h3>
    <div class="area">${cp.area}</div>

    <div class="status ${cp.traffic.status}">
      ${cp.traffic.label} • Delay ${Math.max(0, cp.traffic.delayMin)} min
    </div>

    <div class="checked-at">
      Last updated: ${lastChecked}
    </div>

    <button class="subscribe-btn ${isSub ? "subscribed" : "not-subscribed"}">
      ${isSub ? "Unsubscribe" : "Subscribe"}
    </button>
  `;

  card.querySelector("button").onclick = () =>
    toggleSubscription(cp.id);

  grid.appendChild(card);
});
}

/*************************************************
 * LOAD DATA
 *************************************************/
async function load() {
  const res = await fetch(API_URL);
  ALL_CHOKEPOINTS = await res.json();
  render();
}

/*************************************************
 * TOGGLE VIEW BUTTON
 *************************************************/
document.getElementById("toggleViewBtn").onclick = () => {
  SHOW_ONLY_SUBSCRIBED = !SHOW_ONLY_SUBSCRIBED;
  document.getElementById("toggleViewBtn").textContent =
    SHOW_ONLY_SUBSCRIBED
      ? "View All Chokepoints"
      : "Show My List";
  render();
};

/*************************************************
 * INIT
 *************************************************/
load();
