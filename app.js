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
    font-size: 16px;
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
    notifyButton: { enable: false },
    promptOptions: { slidedown: { enabled: false } },
    welcomeNotification: { disable: true },
    allowLocalStyleOverride: true
  });

  const syncExternalId = async () => {
    const subId = OneSignal.User.PushSubscription.id;
    const currentExternalId = OneSignal.User.externalId;

    // We only need to sync if we have a subscription and it's not already linked
    if (subId && currentExternalId !== subId) {
     // showToast("🔗 Attempting to sync External ID...");
      
      try {
        // OneSignal.login returns a promise in v16
        await OneSignal.login(subId);
        
       // showToast("✅ Identity Linked Successfully");
        if (typeof showToast === "function") {
          //showToast("OneSignal Identity Linked Successfully");
        }
      } catch (error) {
        showToast("❌ OneSignal Login Failed:", error);
        if (typeof showToast === "function") {
          showToast("Failed to link OneSignal identity");
        }
      }
    }
  };

  // 1. Run immediately on page load/init
  syncExternalId();

  // 2. Watch for the moment a user clicks "Allow" for the first time
  OneSignal.User.PushSubscription.addEventListener("change", (event) => {
    showToast("🔔 Subscription state changed. Re-syncing...");
    syncExternalId();
  });
  
  // Resolve your external promise if you use one
  if (typeof oneSignalResolve === "function") {
    oneSignalResolve(OneSignal);
  }
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
  
  // ... (Keep your existing Browser/iOS/PWA checks) ...

  const subs = getSubscriptions();


  
  const isSub = subs.includes(areaKey);

    if(!isSub && subs.length >= 2) {
    showToast("You can only subscribe to alerts for Two Areas. Remove alerts from one of the area to enable.")
    return;
  }
  const newSubs = isSub ? subs.filter(a => a !== areaKey) : [...subs, areaKey];

  // Logic: ["south", "west"] -> "south+west"
  const tagValue = newSubs.sort().join("+");


  const OneSignal = await oneSignalReady;

  const permission = await OneSignal.Notifications.requestPermission();

  if (Notification.permission !== 'granted') {
    showToast(
      "🚦 Live alerts need a real browser. Open PuneTraffic in Chrome/Safari and allow notifications."
    );
    return;
  }

  if (!localStorage.getItem('push_enabled_tracked')) {
    window.zaraz?.track('push_notification_enabled', {
      method: 'onesignal',
      platform: 'pwa'
    });
  
    localStorage.setItem('push_enabled_tracked', 'true');
  }



  
  try {
    // 1. Set the new combined tag
    if (tagValue === "") {
      await OneSignal.User.removeTag("area_set");
    } else {
      await OneSignal.User.addTag("area_set", tagValue);
    }

    // 2. Migration: Remove the old individual tag for this area
    await OneSignal.User.removeTag(`area_${areaKey}`);

    saveSubscriptions(newSubs);
    showToast(isSub ? "🔕 Alerts disabled" : "🔔 Alerts enabled");
    render();
  } catch (err) {
    showToast("⚠️ Update failed");
  }
}
// async function toggleAreaSubscription(areaKey) {
//   if (isFacebookBrowser || isInstagramBrowser) {
//     showToast(
//       isIOS
//         ? "⚠️ Open in Safari → Add to Home Screen"
//         : "⚠️ Open in Chrome (in-app browser unsupported)"
//     );
//     return;
//   }

//   if (isIOS && !isPWA) {
//     showToast("📱 Add to Home Screen required for iOS alerts");
//     return;
//   }

//   const subs = getSubscriptions();
//   const isSub = subs.includes(areaKey);

//   if (!isSub && subs.length >= MAX_AREA_SUBSCRIPTIONS) {
//     showToast(
//       "🚦 You can subscribe to alerts for only 2 areas. Unsubscribe from one area to add another."
//     );
//     return;
//   }

//   const OneSignal = await oneSignalReady;
//   const permission = await OneSignal.Notifications.requestPermission();
//   if (!permission) {
//     showToast("🚦 Live alerts need a real browser. Open PuneTraffic in Chrome/Safari to continue.");
//     return;
//   }

//   await OneSignal.User.PushSubscription.optIn();

//   try {
//     if (isSub) {
//       await OneSignal.User.removeTag(`area_${areaKey}`);
//     } else {
//       await OneSignal.User.addTag(`area_${areaKey}`, "1");
//     }

//     saveSubscriptions(
//       isSub ? subs.filter(a => a !== areaKey) : [...subs, areaKey]
//     );

//     showToast(isSub ? "🔕 Area alerts disabled" : "🔔 Area alerts enabled");
//     render();
//   } catch (err) {
//     console.error(err);
//     showToast("⚠️ Failed to update alerts");
//   }
// }

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
  // 1. Define the priority hierarchy
  const severityOrder = {
    'CRITICAL': 1,
    'HIGH': 2,
    'MODERATE': 3,
    'MEDIUM': 3, // Grouped with Moderate
    'LOW': 4
  };

  // 2. Sort the entire list first
  const sortedList = [...list].sort((a, b) => {
    // Normalize to uppercase safely
    const statusA = a.traffic?.status?.toUpperCase();
    const statusB = b.traffic?.status?.toUpperCase();
  
    // Look up priority (defaulting to 5 for any unknown/missing status)
    const priorityA = severityOrder[statusA] || 5;
    const priorityB = severityOrder[statusB] || 5;
  
    return priorityA - priorityB;
  });

  // 3. Group the already-sorted items
  return sortedList.reduce((acc, cp) => {
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
        <h2>${area.name} Pune</h2>
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
        <h3 class="cp-name">${cp.name}</h3>
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
    showToast("You’re seeing the latest traffic. Updates run every 10 minutes till 6 PM.")
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



const refreshButton = document.getElementById("refreshBtn");
refreshButton.addEventListener("click", async () => {
  refreshChokepoints()
})


window.refreshChokepoints = refreshChokepoints;
