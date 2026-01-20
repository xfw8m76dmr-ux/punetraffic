/*************************************************
 * CONFIG
 *************************************************/
const API_URL =
  "https://trafficmatrix.k7jzqg8c4k.workers.dev/api/chokepoints";
const STORAGE_KEY = "subscribed_areas";
const MAX_AREA_SUBSCRIPTIONS = 2;

/*************************************************
 * STATE (🔥 SSR PRELOADED)
 *************************************************/
let ALL_CHOKEPOINTS =
  window.__PRE_LOADCHOKEPOINTS__ || [];

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
 * ENV CHECKS
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
    border-radius: 10px;
    font-size: 14px;
    z-index: 99999;
    text-align: center;
    max-width: 90%;
  `;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3200);
}

/*************************************************
 * GOOGLE MAPS
 *************************************************/
function getGoogleMapsUrl(lat, lng, name) {
  const label = encodeURIComponent(name);
  return `https://www.google.com/maps?q=${lat},${lng}(${label})`;
}

/*************************************************
 * ONESIGNAL INIT
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
 * AREA SUBSCRIBE / UNSUBSCRIBE
 *************************************************/
async function toggleAreaSubscription(areaKey) {
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

  const subs = getSubscriptions();
  const isSub = subs.includes(areaKey);

  if (!isSub && subs.length >= MAX_AREA_SUBSCRIPTIONS) {
    showToast(
      "🚦 You can subscribe to alerts for only 2 areas. Unsubscribe from one area to add another."
    );
    return;
  }

  const OneSignal = await oneSignalReady;
  const permission = await OneSignal.Notifications.requestPermission();
  if (!permission) {
    showToast("🔕 Notifications blocked");
    return;
  }

  await OneSignal.User.PushSubscription.optIn();

  try {
    if (isSub) {
      await OneSignal.User.removeTag(`area_${areaKey}`);
    } else {
      await OneSignal.User.addTag(`area_${areaKey}`, "1");
    }

    saveSubscriptions(
      isSub ? subs.filter(a => a !== areaKey) : [...subs, areaKey]
    );

    showToast(isSub ? "🔕 Area alerts disabled" : "🔔 Area alerts enabled");
    render();
  } catch (err) {
    console.error(err);
    showToast("⚠️ Failed to update alerts");
  }
}

/*************************************************
 * TIME FORMAT
 *************************************************/
function formatCheckedAt(checkedAt) {
  if (!checkedAt) return "Unknown";

  const t = new Date(checkedAt);
  const diffMin = Math.floor((Date.now() - t) / 60000);

  if (diffMin < 1) return "Just now";
  if (diffMin < 60) return `${diffMin} min ago`;

  const hr = Math.floor(diffMin / 60);
  if (hr < 24) return `${hr} hour${hr > 1 ? "s" : ""} ago`;

  return t.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  });
}

/*************************************************
 * GROUP BY AREA
 *************************************************/
function groupByArea(list) {
  return list.reduce((acc, cp) => {
    const key = cp.area.toLowerCase().replace(/\s+/g, "_");
    acc[key] = acc[key] || { name: cp.area, items: [] };
    acc[key].items.push(cp);
    return acc;
  }, {});
}

/*************************************************
 * RENDER
 *************************************************/
function render() {
  const grid = document.getElementById("grid");
  const subs = getSubscriptions();
  grid.innerHTML = "";

  const grouped = groupByArea(ALL_CHOKEPOINTS);

  const sortedAreas = Object.entries(grouped).sort(([a], [b]) => {
    const aSub = subs.includes(a);
    const bSub = subs.includes(b);
    if (aSub && !bSub) return -1;
    if (!aSub && bSub) return 1;
    return a.localeCompare(b);
  });

  sortedAreas.forEach(([areaKey, area]) => {
    const isSub = subs.includes(areaKey);

    const areaCard = document.createElement("div");
    areaCard.className = "area-card";
    areaCard.innerHTML = `
      <div class="area-header">
        <h2>${area.name}</h2>
        <button class="subscribe-btn ${isSub ? "subscribed" : ""}">
          ${isSub ? "Stop Alerts" : "🔔 Alert me when Traffic Jams"}
        </button>
      </div>
      <div class="chokepoint-list"></div>
    `;

    areaCard.querySelector("button").onclick =
      () => toggleAreaSubscription(areaKey);

    const list = areaCard.querySelector(".chokepoint-list");

    area.items.forEach(cp => {
      const mapUrl = getGoogleMapsUrl(cp.lat, cp.lng, cp.name);
      const lastChecked = formatCheckedAt(cp.traffic?.checkedAt);

      const item = document.createElement("div");
      item.className = `chokepoint ${cp.traffic?.status || "LOW"}`;
      item.innerHTML = `
        <div class="cp-name">${cp.name}</div>
        <div class="cp-status">${cp.traffic?.label || "Unknown"}</div>
        <div class="cp-time">Last checked: ${lastChecked}</div>
        <a href="${mapUrl}" target="_blank" class="map-link">📍</a>
      `;
      list.appendChild(item);
    });

    grid.appendChild(areaCard);
  });
}

/*************************************************
 * INITIAL LOAD (🔥 NO FETCH)
 *************************************************/
document.addEventListener("DOMContentLoaded", () => {
  render();
});

/*************************************************
 * BACKGROUND REFRESH (OPTIONAL)
 *************************************************/
async function refreshChokepoints() {
  try {
    const res = await fetch(`${API_URL}?_ts=${Date.now()}`, { cache: "no-store" });
    ALL_CHOKEPOINTS = await res.json();
    render();
  } catch (err) {
    console.error("Failed to refresh chokepoints", err);
  }
}

(function () {
  const btn = document.getElementById("floatingShareBtn");
  if (!btn) return;

  btn.addEventListener("click", async () => {
    const shareData = {
      title: "Pune Traffic – Live Status",
      text: "Live Pune traffic updates with real-time alerts. Updated every 10 minutes.",
      url: "https://punetraffic.com"
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(shareData.url);
        alert("Link copied to clipboard");
      }
    } catch (e) {
      // user cancelled share → ignore
    }
  });
})();




window.refreshChokepoints = refreshChokepoints;
