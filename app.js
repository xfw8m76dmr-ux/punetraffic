const API_URL = "https://chokepointsmaster.k7jzqg8c4k.workers.dev/api/chokepoints";
const STORAGE_KEY = "subscribed_chokepoints";

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

function toggleSubscription(id) {
  const subs = getSubscriptions();
  const index = subs.indexOf(id);

  if (index >= 0) {
    subs.splice(index, 1);
    // TODO: OneSignal unsubscribe from cp_<id>
  } else {
    subs.push(id);
    // TODO: OneSignal subscribe to cp_<id>
  }

  saveSubscriptions(subs);
  renderUI(window.__AREAS__);
}

async function loadChokepoints() {
  const res = await fetch(API_URL);
  if (!res.ok) throw new Error("Failed to load chokepoints");
  return res.json();
}

function renderUI(areas) {
  const container = document.getElementById("app");
  const subs = getSubscriptions();

  container.innerHTML = "";

  for (const areaName of Object.keys(areas)) {
    const areaDiv = document.createElement("div");
    areaDiv.className = "area";

    const title = document.createElement("h2");
    title.textContent = areaName;
    areaDiv.appendChild(title);

    areas[areaName].forEach(cp => {
      const item = document.createElement("div");
      item.className = "chokepoint";

      if (subs.includes(cp.id)) {
        item.classList.add("subscribed");
      }

      const name = document.createElement("div");
      name.textContent = cp.name;

      const badge = document.createElement("div");
      badge.className = "badge";
      badge.textContent = subs.includes(cp.id) ? "Subscribed" : "Subscribe";

      if (subs.includes(cp.id)) {
        badge.classList.add("sub");
      }

      item.appendChild(name);
      item.appendChild(badge);

      item.onclick = () => toggleSubscription(cp.id);

      areaDiv.appendChild(item);
    });

    container.appendChild(areaDiv);
  }
}

(async function init() {
  try {
    const data = await loadChokepoints();
    window.__AREAS__ = data.areas;
    renderUI(data.areas);
  } catch (e) {
    document.getElementById("app").textContent =
      "Failed to load choke points. Please try again.";
  }
})();
