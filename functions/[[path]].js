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

const escapeQuotes = (str) => str ? str.replace(/"/g, '&quot;').replace(/'/g, '&apos;') : "";

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
          <h2>${area.name} Pune</h2>
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
  const safeName = escapeQuotes(cp.name);
  
  const checkedAt = cp.traffic?.checkedAt
    ? new Date(cp.traffic.checkedAt).toLocaleString("en-IN", { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' })
    : "Unknown";

  // Fixed the 19{cp.lat} syntax error
  const mapUrl = `https://www.google.com/maps/search/?api=1&query=${cp.lat},${cp.lng}`;

  return `
    <div class="chokepoint ${status}">
      <h3 class="cp-name">${cp.name}</h3>
      <div class="cp-status">${label}</div>
      <div class="cp-time">Last checked: ${checkedAt}</div>
      <a href="${mapUrl}" target="_blank" class="map-link" 
         title="View live traffic for ${safeName} on Google Maps" 
         aria-label="View live traffic for ${safeName} on Google Maps">
         <span style="display:none">View traffic map for ${safeName}</span>📍
      </a>
    </div>
  `;
}

function getHtml({ chokepoints, renderedGrid }) {
return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<link rel="apple-touch-icon" href="/icons/icon-192.png">
<link rel="icon" href="/icons/icon-512.png" sizes="512x512" type="image/png">
<link rel="icon" href="/icons/icon-192.png" sizes="192x192" type="image/png">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
<link rel="manifest" href="/manifest.json">
<meta name="theme-color" content="#111827">

<title>Pune Traffic Today – Live Traffic Status, Congestion & Alerts</title>
<meta name="description" content="Check Pune traffic today with live traffic status, congestion updates, and real-time chokepoint alerts. Pune traffic is monitored every 10 minutes. No login required." />
<meta name="keywords" content="pune traffic, pune traffic today, live pune traffic, pune traffic status, pune traffic updates, real time traffic pune" />
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href="https://www.punetraffic.com/" />

<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "GovernmentService",
  "name": "Pune Live Traffic Alerts",
  "serviceType": "Traffic Monitoring",
  "areaServed": {
    "@type": "City",
    "name": "Pune"
  },
  "provider": {
    "@type": "Organization",
    "name": "Pune Traffic",
    "url": "https://punetraffic.com"
  },
  "description": "Real-time traffic status and push notification alerts for severe congestion in Pune."
}
</script>

<link rel="preconnect" href="https://cdn.onesignal.com">
<link rel="preconnect" href="https://api.onesignal.com">
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>

<style>
${STYLESHEET}
</style>
</head>

<body>
<div id="ptr-indicator">↓ Pull to refresh</div>

<header>
  <h1>🚦 Pune Traffic – Live Status & Real-Time Alerts</h1>
  <p>
    We monitor Pune traffic every 10 minutes and alert you with Notification on your Mobile.
    Daytime alerts (9 AM – 6 PM), only when traffic gets jammed.
    No login. No signup.
  </p>
</header>

<main>
  <section class="seo-intro" style="padding: 10px; font-size: 0.8rem; color: #666; text-align:center;">
    Real-time traffic monitoring for <strong>Hinjewadi</strong>, <strong>Baner</strong>, <strong>Mundhwa</strong>, and <strong>Koregaon Park</strong>. 
    Get instant alerts for Pune road closures and congestion.
  </section>

  <p class="message">Traffic status reflects actual travel delay; brief signal slowdowns are normal</p>

  <button id="quietBtn" class="quiet-btn">🔕 Set quiet hours</button>
  <button id="refreshBtn" class="refresh-btn">Refresh ⟳</button>

  <div id="status"></div>
  <div id="grid" class="grid">
    ${renderedGrid} 
  </div>
</main>

<footer>
  Live Pune traffic monitoring • Real-time congestion alerts • Area-based Pune traffic notifications
</footer>

<button id="floatingShareBtn" class="floating-share-btn" aria-label="Share Pune Traffic">
  📤
</button>

<script src="/app.js" defer></script>
<script src="/pull-to-refresh.js" defer></script>
<script src="/quiet-hours.js" defer></script>
<script src="/utils.js" defer></script>

</body>
</html>`;
}

const STYLESHEET = `/*************************************************
 * BASE & GRID
 *************************************************/
body { margin: 0; font-family: system-ui, -apple-system, sans-serif; background: #f5f7fa; color: #111; }
.message { margin: 10px 4px; text-align: center; font-size: 14px; color: #4b5563; }
header { background: #111827; color: #ffffff; padding: 16px; text-align: center; }
header h1 { margin: 0; font-size: 1.4rem; font-weight: 700; }
header p { margin-top: 6px; font-size: 14px; opacity: 0.85; }
main { max-width: 900px; margin: auto; padding: 16px; }
.grid { display: flex; flex-direction: column; gap: 16px; }

/*************************************************
 * CARDS
 *************************************************/
.area-card { background: #fff; border-radius: 16px; padding: 14px; box-shadow: 0 4px 6px rgba(0,0,0,0.1); display: flex; flex-direction: column; gap: 12px; }
.area-header { display: flex; align-items: center; justify-content: space-between; }
.area-header h2 { margin: 0; font-size: 1.05rem; font-weight: 700; }
.subscribe-btn { padding: 8px 14px; border-radius: 10px; font-size: 13px; border: none; cursor: pointer; background: darkgreen; color: white; font-weight: bold; }
.chokepoint-list { display: flex; flex-direction: column; gap: 10px; }
.chokepoint { background: #f9fafb; border-radius: 12px; padding: 12px; display: grid; grid-template-columns: 1fr auto; gap: 4px; border-left: 4px solid transparent; }

/*************************************************
 * STATUS COLORS & ANIMATION
 *************************************************/
.chokepoint.LOW { border-left-color: #16a34a; }
.chokepoint.MEDIUM, .chokepoint.MODERATE { border-left-color: orangered; }
.chokepoint.HIGH, .chokepoint.CRITICAL { border-left-color: #b91c1c; border: 2px solid #b91c1c; background: #fff5f5; animation: critical-pulse 1.5s infinite; }

@keyframes critical-pulse {
  0% { box-shadow: 0 0 0 0 rgba(185, 28, 28, 0.4); }
  50% { box-shadow: 0 0 10px 4px rgba(185, 28, 28, 0.2); }
  100% { box-shadow: 0 0 0 0 rgba(185, 28, 28, 0.4); }
}

.cp-name { margin: 0; font-weight: 700; font-size: 1rem; color: #111827; }
.cp-status { text-transform: uppercase; font-size: 0.7rem; font-weight: 800; }
.cp-time { font-size: .75rem; color: #6b7280; }
.map-link { grid-column: 2; grid-row: 1/4; align-self: center; padding: 8px 12px; border-radius: 10px; background: #fff; border: 1px solid #e5e7eb; text-decoration: none; }

/*************************************************
 * UTILS
 *************************************************/
.quiet-btn, .refresh-btn { display: block; margin: 10px auto; padding: 7px 14px; font-size: 13px; border-radius: 999px; background: #111827; color: #fff; border: none; cursor: pointer; }
footer { text-align: center; padding: 20px; font-size: 12px; color: #6b7280; }
.floating-share-btn { position: fixed; bottom: 18px; right: 18px; width: 52px; height: 52px; border-radius: 50%; background: #111827; color: #fff; border: none; font-size: 20px; box-shadow: 0 4px 12px rgba(0,0,0,0.3); }
#ptr-indicator { position: fixed; top: -50px; left: 0; right: 0; height: 50px; background: #111827; color: #fff; display: flex; align-items: center; justify-content: center; transition: top 0.25s; }
`;
