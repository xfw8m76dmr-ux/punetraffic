export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);

  // Only SSR homepage
  if (url.pathname !== "/") {
    return context.next();
  }

  // Fetch data on EDGE
  const res = await fetch(
    "https://trafficmatrix.k7jzqg8c4k.workers.dev/api/chokepoints",
    { cf: { cacheTtl: 300, cacheEverything: true } }
  );

  const chokepoints = await res.json();

  const renderedGrid = renderGrid(chokepoints);

  const html = getHtml({
    chokepoints,
    renderedGrid
  });

  return new Response(html, {
    headers: {
      "Content-Type": "text/html",
      "Cache-Control": "public, max-age=60, stale-while-revalidate=300"
    }
  });
}

/*************************************************
 * SERVER RENDER HELPERS
 *************************************************/

function groupByArea(list) {
  return list.reduce((acc, cp) => {
    const key = cp.area.toLowerCase().replace(/\s+/g, "_");
    acc[key] ??= { name: cp.area, items: [] };
    acc[key].items.push(cp);
    return acc;
  }, {});
}

function renderGrid(chokepoints) {
  const grouped = groupByArea(chokepoints);

  return Object.values(grouped)
    .map(area => `
      <div class="area-card">
        <div class="area-header">
          <h2>${area.name}</h2>
          <button class="subscribe-btn">
            🔔 Alert me when Traffic Jams
          </button>
        </div>
        <div class="chokepoint-list">
          ${area.items.map(renderChokepoint).join("")}
        </div>
      </div>
    `)
    .join("");
}

function renderChokepoint(cp) {
  const status = cp.traffic?.status || "LOW";
  const label = cp.traffic?.label || "Unknown";
  const checkedAt = cp.traffic?.checkedAt
    ? new Date(cp.traffic.checkedAt).toLocaleString("en-IN")
    : "Unknown";

  const mapUrl = `https://www.google.com/maps?q=${cp.lat},${cp.lng}`;

  return `
    <div class="chokepoint ${status}">
      <div class="cp-name">${cp.name}</div>
      <div class="cp-status">${label}</div>
      <div class="cp-time">Last checked: ${checkedAt}</div>
      <a href="${mapUrl}" target="_blank" class="map-link">📍</a>
    </div>
  `;
}

function getHtml({ chokepoints, renderedGrid }) {
return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />

<!-- Favicons -->
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="icon" href="/icons/icon-512.png" sizes="512x512" type="image/png">
<link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png">

<!-- PWA -->
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#111827">

<!-- SEO -->
<title>Pune Traffic Today – Live Traffic Status, Congestion & Alerts</title>
<meta name="description" content="Check Pune traffic today with live traffic status, congestion updates, and real-time chokepoint alerts. Pune traffic is monitored every 10 minutes during daytime. No login required." />
<meta name="keywords" content="pune traffic, pune traffic today, live pune traffic, pune traffic status, pune traffic updates, real time traffic pune" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href="https://www.punetraffic.com/" />

<!-- OneSignal -->
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>

<style>
${/* 🔥 KEEP YOUR FULL CSS HERE - unchanged */""}
</style>
</head>

<body>

<div id="ptr-indicator">↓ Pull to refresh</div>

<header>
  <h1>🚦 Pune Traffic – Live Status & Real-Time Alerts</h1>
  <p>
    We monitor Pune traffic every 10 minutes and alert you with Notification on your Mobile.
    Daytime alerts (9 AM – 10 PM), only when traffic gets jammed.
    No login. No signup.
  </p>
</header>

<button id="quietBtn" class="quiet-btn">🔕 Set quiet hours</button>

<main>
  <div id="status"></div>
  <div id="grid" class="grid">
    ${renderedGrid}
  </div>
</main>

<footer>
  Live Pune traffic monitoring • Real-time congestion alerts • Area-based Pune traffic notifications
</footer>

<!-- 🔥 PRELOADED DATA -->
<script>
window.__PRE_LOADCHOKEPOINTS__ = ${JSON.stringify(chokepoints)};
</script>

<script src="/app.js" defer></script>
<script src="/pull-to-refresh.js" defer></script>
<script src="/quiet-hours.js" defer></script>

</body>
</html>`;
}
