/*************************************************
 * CONFIG
 *************************************************/
const API_URL =
  "https://trafficmatrix.k7jzqg8c4k.workers.dev/api/chokepoints";
const STORAGE_KEY = "subscribed_areas";
const MAX_AREA_SUBSCRIPTIONS = 2;

/*************************************************
 * STATE  (🔥 SSR DATA)
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
 * GOOGLE MAPS
 *************************************************/
function getGoogleMapsUrl(lat, lng, name) {
  const label = encodeURIComponent(name);
  return `https://www.google.com/maps?q=${lat},${lng}(${label})`;
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

    const btn = areaCard.querySelector("button");
    btn.onclick = () => toggleAreaSubscription(areaKey);

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
 * BACKGROUND REFRESH
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

window.refreshChokepoints = refreshChokepoints;
