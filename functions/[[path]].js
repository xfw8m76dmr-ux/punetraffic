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
  const checkedAt = cp.traffic?.checkedAt
    ? new Date(cp.traffic.checkedAt).toLocaleString("en-IN")
    : "Unknown";

  const mapUrl = `https://www.google.com/maps?q=${cp.lat},${cp.lng}`;

  return `
    <div class="chokepoint ${status}">
      <h3 class="cp-name">${cp.name}</h3>
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

<meta property="og:title" content="Live Pune Traffic Status & Alerts">
<meta property="og:description" content="No login, no ads. Just real-time traffic updates for Pune IT professionals.">
<meta property="og:image" content="/icons/icon-512.png.png"> <meta property="og:url" content="https://punetraffic.com">
<meta name="twitter:card" content="summary_large_image">

<!-- OneSignal -->
<link rel="preconnect" href="https://cdn.onesignal.com">
<link rel="preconnect" href="https://api.onesignal.com">
<link rel="dns-prefetch" href="https://cdn.onesignal.com">
<link rel="dns-prefetch" href="https://api.onesignal.com">
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
<script type="application/ld+json">
[
  {
    "@context": "https://schema.org",
    "@type": ["Service", "LocalBusiness"],
    "name": "Pune Traffic Live Alerts",
    "description": "Real-time traffic congestion monitoring and proactive push alerts for Pune city. No login or signup required.",
    "url": "https://punetraffic.com",
    "logo": "https://punetraffic.com/icons/icon-512.png",
    "address": {
      "@type": "PostalAddress",
      "addressLocality": "Pune",
      "addressRegion": "MH",
      "addressCountry": "IN"
    },
    "geo": {
      "@type": "GeoCoordinates",
      "latitude": "18.5204",
      "longitude": "73.8567"
    },
    "areaServed": "Pune, India",
    "provider": {
      "@type": "Organization",
      "name": "Pune Traffic",
      "url": "https://punetraffic.com"
    },
    "hasOfferCatalog": {
      "@type": "OfferCatalog",
      "name": "Traffic Alerts",
      "itemListElement": [
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Live Congestion Updates" } },
        { "@type": "Offer", "itemOffered": { "@type": "Service", "name": "Push Notifications for Traffic Jams" } }
      ]
    }
  },
  {
    "@context": "https://schema.org",
    "@type": "LiveBlogPosting",
    "headline": "Live Pune Traffic Updates – Real-Time Congestion & Road Alerts",
    "description": "Live status of Pune's major chokepoints including Hinjewadi, Mundhwa, and University Chowk. Updated every 10 minutes.",
    "coverageStartTime": "2026-01-26T00:00:00+05:30",
    "about": {
      "@type": "Event",
      "name": "Pune Traffic Monitoring",
      "location": {
        "@type": "Place",
        "name": "Pune, India"
      }
    }
  }
]
</script>
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
<p class="message">Traffic status reflects actual travel delay; brief signal slowdowns are normal</p>

<button id="quietBtn" class="quiet-btn">🔕 Set quiet hours</button>
<button id="refreshBtn" class="refresh-btn">Refresh ⟳</button>
<main>
  <div id="status"></div>
  <div id="grid" class="grid">
    ${renderedGrid}
  </div>
</main>

<footer>
  Pune Traffic Live: Your real-time dashboard for navigating Pune’s evolving landscape. We provide up-to-the-minute traffic status updates across major IT corridors and residential hubs, from the heavy congestion of Hinjewadi IT Park and Bhumkar Chowk in the West to the bustling transit points of Mundhwa Bridge, Kharadi, and Magarpatta in the East. As Pune scales with new Metro Line construction, flyover projects at University Chowk, and diversions at Chandni Chowk, our platform monitors over 20+ critical chokepoints every 10 minutes to deliver proactive push notification alerts. Whether you are commuting via the Mumbai-Pune Expressway service roads, navigating Nal Stop, or checking for road closures today, our no-login, high-speed PWA ensures you have the latest data to beat the city's peak-hour jams and monsoon waterlogging delays without any friction.
</footer>

<!-- 🔥 PRELOADED DATA -->
<script>
window.__PRE_LOADCHOKEPOINTS__ = ${JSON.stringify(chokepoints)};
</script>

<!-- Floating Share Button -->
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
 * BASE
 *************************************************/
body {
  margin: 0;
  font-family: system-ui, -apple-system, BlinkMacSystemFont;
  background: #f5f7fa;
  color: #111;
}

.message {
 margin-left: 4px;
 margin-right: 4px;
 text-align: center;
}

header {
  background: #111827;
  color: #ffffff;
  padding: 16px;
  text-align: center;
  position: relative;
  z-index: 1000;
  backdrop-filter: blur(8px);
  background: rgba(17, 24, 39, 0.95); /* Semi-transparent */
}


header h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
}

header p {
  margin-top: 6px;
  font-size: 14px;
  opacity: 0.85;
}

main {
  max-width: 900px;
  margin: auto;
  padding: 16px;
}

/*************************************************
 * SEO INTRO
 *************************************************/
.seo-intro {
  max-width: 900px;
  margin: 12px auto 0;
  padding: 0 16px;
  font-size: 14px;
  color: #374151;
  line-height: 1.6;
}

/*************************************************
 * GRID
 *************************************************/
.grid {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/*************************************************
 * AREA CARD
 *************************************************/
.area-card {
  background: #ffffff;
  border-radius: 16px;
  box-shadow: 0 8px 24px rgba(0,0,0,.06);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;

  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
  border: 1px solid rgba(0,0,0,0.03);
}

/* Add a "Pinned" indicator to the Area Card when subscribed */
.area-card.alert-active {
  border: 2px solid #3b82f6;
  background: linear-gradient(to bottom right, #ffffff, #f0f7ff);
}


.area-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.area-header h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
}

/*************************************************
 * SUBSCRIBE BUTTON
 *************************************************/
.subscribe-btn {
  padding: 8px 14px;
  border-radius: 10px;
  font-size: 13px;
  cursor: pointer;
  border: none;
  white-space: nowrap;
  transition: all 0.15s ease;
}

.subscribe-btn:not(.subscribed) {
  background: darkgreen;
  color: white;
  font-weight: bold;
}

.subscribe-btn.subscribed {
  background: #eff6ff; /* Light blue background */
  color: #2563eb;      /* Primary Blue */
  border: 1px solid #bfdbfe;
  font-weight: 600;
}

/*************************************************
 * CHOKEPOINT LIST
 *************************************************/
.chokepoint-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

/*************************************************
 * CHOKEPOINT CARD
 *************************************************/
.chokepoint {
  background: #f9fafb;
  border-radius: 12px;
  padding: 12px;
  display: grid;
  grid-template-columns: 1fr auto;
  grid-template-rows: auto auto auto;
  gap: 4px 10px;
  border-left: 4px solid transparent;

  transition: transform 0.1s ease, box-shadow 0.1s ease;
}


.chokepoint.LOW { border-left-color: #16a34a; }
.chokepoint.MEDIUM,
.chokepoint.MODERATE { border-left-color: orangered; }
.chokepoint.HIGH,
.chokepoint.CRITICAL { border-left-color: darkred; }

/*************************************************
 * URGENT: CRITICAL STATUS STYLING
 *************************************************/
/*************************************************
 * HIGH & CRITICAL: FULL CARD EMPHASIS
 *************************************************/

/* Shared base for both */
.chokepoint.HIGH, 
.chokepoint.CRITICAL {
  border: 2px solid transparent;
  transition: all 0.3s ease;
}

/* HIGH: The "Warning" State (Deep Orange/Amber) */
.chokepoint.HIGH {
  border-color: #f97316; /* Vibrant Orange */
  background: #fffaf0;   /* Subtle amber tint */
  animation: high-pulse 3s infinite ease-in-out; /* Slower, calmer pulse */
}

/* CRITICAL: The "Emergency" State (Deep Red) */
.chokepoint.CRITICAL {
  border-color: #b91c1c; /* Deep Red */
  background: #fff5f5;   /* Subtle red tint */
  animation: critical-pulse 1.5s infinite ease-in-out; /* Faster, urgent pulse */
}

@keyframes high-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.2); }
  50% { box-shadow: 0 0 10px 2px rgba(249, 115, 22, 0.1); }
}

@keyframes critical-pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(185, 28, 28, 0.4); 
    border-color: #b91c1c;
  }
  50% { 
    box-shadow: 0 0 15px 5px rgba(185, 28, 28, 0.2); 
    border-color: #ef4444; /* Brightens at peak of pulse */
  }
}

/* Polish: Make the status text bold enough to match the border */
.chokepoint.HIGH .cp-status,
.chokepoint.CRITICAL .cp-status {
  font-weight: 800;
  text-transform: uppercase;
}

/*************************************************
 * CHOKEPOINT TEXT
 *************************************************/
.cp-name {
  font-weight: 700;
  font-size: 1rem;
  color: #111827;
  letter-spacing: -0.01em; /* Tighter for readability */
  line-height: 1.2;
  margin: 0px;
}

.cp-status {
  text-transform: uppercase;
  font-size: 0.7rem;
  letter-spacing: 0.05em;
  font-weight: 800;
  margin-top: 2px;
}

.chokepoint.LOW .cp-status { color: darkgreen; }
.chokepoint.MEDIUM .cp-status,
.chokepoint.MODERATE .cp-status { color: orangered; }
.chokepoint.HIGH .cp-status,
.chokepoint.CRITICAL .cp-status { color: darkred; }

.cp-time {
  font-size: .75rem;
  color: #6b7280;
}

/*************************************************
 * MAP LINK
 *************************************************/
.map-link {
  grid-column: 2 / 3;
  grid-row: 1 / 4;
  align-self: center;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  color: #111827;
  text-decoration: none;
  font-weight: 500;

  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}

.map-link:hover {
  background: #d1d5db;
}

/*************************************************
 * STATUS BANNER
 *************************************************/
.status {
  padding: 10px 14px;
  margin: 12px 16px;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
}

.status.active {
  background: #e8f5e9;
  color: #1b5e20;
}

.status.inactive {
  background: #f1f3f4;
  color: #555;
}

/*************************************************
 * EMPTY STATE
 *************************************************/
.no_chokepoints {
  text-align: center;
  color: #6b7280;
  font-size: 14px;
  padding: 24px 0;
}

/*************************************************
 * FOOTER
 *************************************************/
footer {
  text-align: center;
  padding: 14px;
  font-size: 12px;
  color: #6b7280;
}

/*************************************************
 * PULL TO REFRESH
 *************************************************/
#ptr-indicator {
  position: fixed;
  top: -50px;
  left: 0;
  right: 0;
  height: 50px;
  background: #111827;
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  transition: top 0.25s ease;
  z-index: 9999;
}

#ptr-indicator.active,
#ptr-indicator.loading {
  top: 0;
}

/*************************************************
 * SHARE BUTTON
 *************************************************/
.share-btn {
  position: absolute;
  top: 14px;
  right: 14px;
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  opacity: 0.85;
}

.share-btn:hover {
  opacity: 1;
}

.share-btn svg {
  display: block;
}

/*************************************************
 * QUIET HOURS BUTTON (CENTERED, DELAYED)
 *************************************************/
.quiet-btn {
  display: none; /* hidden initially */
  margin: 12px auto 0;
  padding: 7px 14px;
  font-size: 13px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.25);
  background: #020617; /* dark slate */
  color: #e5e7eb;
  cursor: pointer;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.refresh-btn {
  display: table;
  margin-left: auto;
  margin-right: auto;
  padding: 7px 14px;
  font-size: 13px;
  border-radius: 999px;
  border: 1px solid rgba(255,255,255,0.25);
  background: #020617; /* dark slate */
  color: #e5e7eb;
  cursor: pointer;
  transition: opacity 0.25s ease, transform 0.25s ease;
}

.quiet-btn.visible {
  display: block;
  opacity: 1;
  transform: translateY(0);
}

.quiet-btn:hover {
  background: #020617;
  color: #ffffff;
}

/*************************************************
 * QUIET HOURS MODAL
 *************************************************/
#quietModal {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.45);
  display: none;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

#quietModal .box {
  background: #ffffff;
  border-radius: 16px;
  padding: 16px;
  width: 90%;
  max-width: 320px;
  text-align: center;
}

#quietModal h3 {
  margin: 0 0 12px;
  font-size: 1rem;
}

#quietModal .row {
  display: flex;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 12px;
}

#quietModal select {
  flex: 1;
  padding: 6px;
  font-size: 14px;
}

#quietModal button {
  padding: 8px 12px;
  border-radius: 10px;
  border: none;
  background: #111827;
  color: white;
  font-size: 14px;
  cursor: pointer;
}

/*************************************************
 * FLOATING SHARE BUTTON
 *************************************************/
.floating-share-btn {
  position: fixed;
  bottom: 18px;
  right: 18px;
  width: 52px;
  height: 52px;
  border-radius: 50%;
  border: none;
  background: #111827;
  color: #ffffff;
  font-size: 20px;
  cursor: pointer;
  box-shadow: 0 10px 24px rgba(0,0,0,.25);
  z-index: 9000;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform .15s ease, opacity .15s ease;
}

.floating-share-btn:hover {
  transform: scale(1.05);
}

.floating-share-btn.hidden {
  opacity: 0;
  pointer-events: none;
}
`
