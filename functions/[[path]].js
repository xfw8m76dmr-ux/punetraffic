export async function onRequest(context) {
  const { request } = context;
  const url = new URL(request.url);
  // Example logic to add to your refresh function
  const now = new Date().toISOString(); // e.g., "2026-01-26T12:40:00.000Z"

   // 🚫 Skip blog completely
  if (url.hostname === "blog.punetraffic.com") {
    return context.next();
  }
  
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
      <div class="area-card" aria-labelledby="${area.name}-pune">
        <div class="area-header">
          <h2 id="${area.name}-pune">${area.name} Pune</h2>
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

/**
 * Generates a dynamic SEO description based on live traffic data.
 * Designed for SSR (Server-Side Rendering).
 */
function getDynamicDescription(chokepoints) {
  const now = new Date();
  // Get current hour in IST (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(now.getTime() + istOffset);
  const currentHour = istTime.getUTCHours();

  // Baseline description for off-peak hours
  const defaultDesc = "Check Pune traffic today with live status, congestion updates, and real-time chokepoint alerts. No login required.";

  // Only generate dynamic alert text between 9 AM and 6 PM
  if (currentHour >= 9 && currentHour < 18) {
    if (!chokepoints || chokepoints.length === 0) return defaultDesc;

    const critical = chokepoints.filter(cp => cp.traffic.status === 'CRITICAL').length;
    const high = chokepoints.filter(cp => cp.traffic.status === 'HIGH').length;

    if (critical === 0 && high === 0) {
      return `Pune Traffic Update: All major routes are currently smooth. Real-time monitoring across ${chokepoints.length} chokepoints. No login required.`;
    }

    const alertText = `Alert: ${critical} critical jams and ${high} high congestion points detected in Pune.`;
    return `${alertText} Get live updates for Hinjewadi, Mundhwa, and more. Updated every 10 mins.`;
  }

  return defaultDesc;
}

function generateSchema(chokepointData = []) {
  const now = new Date().toISOString();
  const localeTime = new Date().toLocaleTimeString('en-IN', { 
    hour: '2-digit', 
    minute: '2-digit', 
    hour12: true 
  });
  
  const todayDate = new Date().toLocaleDateString('en-CA');
  const todayStart = todayDate + "T00:00:00+05:30";
  const todayEnd = todayDate + "T23:59:59+05:30";
  
  // Extract chokepoint names for the ItemList
  const listItems = chokepointData.map((cp, index) => ({
    "@type": "ListItem",
    "position": index + 1,
    "name": cp.name
  }));

  const schema = [
    // 1. SERVICE & LOCAL BUSINESS SCHEMA
    {
      "@context": "https://schema.org",
      "@type": ["Service", "LocalBusiness"],
      "name": "Pune Traffic Live Alerts",
      "description": "Real-time traffic congestion monitoring for Pune. No login required.",
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
      "areaServed": "Pune, India"
    },
    // 2. LIVE BLOG POSTING (For real-time freshness)
    {
      "@context": "https://schema.org",
      "@type": "LiveBlogPosting",
      "headline": `Live Pune Traffic Updates at ${localeTime}`,
      "description": "Live status of Pune's major chokepoints updated every 10 minutes.",
      "coverageStartTime": todayStart,
      "datePublished": now,
      "liveBlogUpdate": {
        "@type": "BlogPosting",
        "headline": `Update: Pune Traffic status as of ${localeTime}`,
        "datePublished": now,
        "articleBody": "Current traffic status across 20+ chokepoints in Pune is being monitored."
      },
      "about": {
        "@type": "Event",
        "name": "Pune Traffic Monitoring",
        "startDate": todayStart,
        "endDate": todayEnd,
        "eventStatus": "https://schema.org/EventScheduled",
        "eventAttendanceMode": "https://schema.org/OnlineEventAttendanceMode",
        "location": {
          "@type": "VirtualLocation",
          "url": "https://punetraffic.com"
        }
      }
    },
    // 3. THE ITEMLIST (The "Dashboard" view for SEO)
    {
      "@context": "https://schema.org",
      "@type": "ItemList",
      "name": "Pune Traffic Chokepoints Monitored",
      "description": "List of major traffic chokepoints in Pune monitored for live congestion status.",
      "itemListElement": listItems
    },
    // 4. FAQ SCHEMA
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      "mainEntity": [
        {
          "@type": "Question",
          "name": "How often is the Pune traffic status updated?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "The dashboard is updated every 10 minutes, providing real-time data on chokepoints like Hinjewadi, Mundhwa, and University Chowk."
          }
        },
        {
          "@type": "Question",
          "name": "Is a login required to check Pune traffic today?",
          "acceptedAnswer": {
            "@type": "Answer",
            "text": "No login or signup is required. Our service is a free PWA for quick access by Pune commuters."
          }
        }
      ]
    },
    // 5. ORGANIZATION SCHEMA
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      "name": "Pune Traffic Live",
      "url": "https://punetraffic.com",
      "logo": "https://punetraffic.com/icons/icon-512.png",
      "description": "Pune Traffic Live is an independent real-time data initiative for Pune residents."
    }
  ];

  return `<script type="application/ld+json">${JSON.stringify(schema)}</script>`;
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
<meta name="description" content="${getDynamicDescription(chokepoints)}">
<meta name="viewport" content="width=device-width, initial-scale=1" />
<link rel="canonical" href="https://punetraffic.com/" />

<meta property="og:title" content="Live Pune Traffic Status & Alerts">
<meta property="og:description" content="No login, no ads. Just real-time traffic updates for Pune IT professionals.">
<meta property="og:image" content="/icons/icon-512.png"> 
<meta property="og:url" content="https://punetraffic.com">
<meta name="twitter:card" content="summary_large_image">

<!-- OneSignal -->
<link rel="preconnect" href="https://cdn.onesignal.com">
<link rel="preconnect" href="https://api.onesignal.com">
<link rel="dns-prefetch" href="https://cdn.onesignal.com">
<link rel="dns-prefetch" href="https://api.onesignal.com">
<script src="https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js" defer></script>
${generateSchema(chokepoints)}

<style>
${STYLESHEET}
</style>
</head>

<body>

<div id="ptr-indicator">↓ Pull to refresh</div>

<header class="hero">
  <h1>🚦 Pune Traffic – Live Status & Real-Time Alerts</h1>

  <p class="hero-text">
    We alert you <strong>only when Pune roads actually jam</strong> — not for small slowdowns.<br>
    Daytime alerts (9 AM – 6 PM). <strong>No login. No spam.</strong><br>
    <span class="mute-note">🔕 Mute for today anytime from the notification.</span><br>
    <a href="#" onclick="showDemoNotification(); return false;">🔔 See example traffic alert</a>
  </p>
</header>

<p class="message">Traffic status is based on observed travel delay, not momentary signal stops.</p>

<button id="quietBtn" class="quiet-btn">🔕 Set quiet hours</button>
<button id="refreshBtn" class="refresh-btn">Refresh ⟳</button>
<main>
  <div id="status"></div>
  <div id="grid" class="grid">
    ${renderedGrid}
  </div>
</main>

<footer style="padding: 2rem 1rem; background-color: #f9f9f9; border-top: 1px solid #eee;">
  <div style="margin-bottom: 2rem; max-width: 1200px; margin-left: auto; margin-right: auto;">
    <p style="color: #555; line-height: 1.6;">
      <strong>Pune Traffic Live</strong> is your real-time dashboard for navigating Pune’s evolving road network. 
      We provide up-to-the-minute traffic status updates across major IT corridors and residential hubs — from heavy congestion at 
      <strong>Hinjewadi IT Park</strong> and <strong>Bhumkar Chowk</strong> in the West to busy transit points like 
      <strong>Mundhwa Bridge</strong>, <strong>Kharadi</strong>, and <strong>Magarpatta</strong> in the East.
    </p>

    <p style="color: #555; line-height: 1.6;">
      As Pune expands with new Metro line construction, flyovers at <strong>University Chowk</strong>, and diversions at 
      <strong>Chandni Chowk</strong>, we monitor 20+ critical chokepoints every 10 minutes to deliver proactive traffic alerts. 
      Whether you’re commuting via the <strong>Mumbai–Pune Expressway</strong> service roads, navigating <strong>Nal Stop</strong>, 
      or checking road closures during monsoon waterlogging, our no-login, high-speed PWA helps you avoid peak-hour jams.
    </p>
  </div>

  <hr style="border: 0; border-top: 1px solid #ddd; margin: 2rem 0;">

  <div style="display: flex; flex-wrap: wrap; justify-content: space-between; max-width: 1200px; margin: 0 auto; gap: 2rem;">
    
    <div style="flex: 1; min-width: 200px;">
      <h4 style="margin-bottom: 1rem; color: #333;">Site Navigation</h4>
      <ul style="list-style: none; padding: 0; line-height: 2;">
        <li><a href="https://punetraffic.com" style="text-decoration: none; color: #007bff;">Live Traffic Map</a></li>
        <li><a href="https://blog.punetraffic.com" style="text-decoration: none; color: #007bff;">PuneTraffic Blog</a></li>
      </ul>
    </div>

    <div style="flex: 1; min-width: 200px;">
      <h4 style="margin-bottom: 1rem; color: #333;">Legal & Trust</h4>
      <ul style="list-style: none; padding: 0; line-height: 2;">
        <li><a href="https://blog.punetraffic.com/about-us" style="text-decoration: none; color: #007bff;">About Us</a></li>
        <li><a href="https://blog.punetraffic.com/contact-us" style="text-decoration: none; color: #007bff;">Contact Us</a></li>
        <li><a href="https://blog.punetraffic.com/privacy-policy" style="text-decoration: none; color: #007bff;">Privacy Policy</a></li>
        <li><a href="https://blog.punetraffic.com/terms-and-conditions" style="text-decoration: none; color: #007bff;">Terms & Conditions</a></li>
      </ul>
    </div>

    <div style="flex: 1; min-width: 200px;">
        <section id="data-methodology">
          <h2>How Pune traffic data is monitored</h2>
          <p>
            Traffic conditions are monitored every 10 minutes across 20+ Pune chokepoints
            using real-time movement patterns and delay ratios acquired from various Traffic Insight Sources. Alerts are triggered only
            when sustained congestion is detected.
          </p>
        </section>

      <h4 style="margin-bottom: 1rem; color: #333;">Community</h4>
      <p style="font-size: 0.9rem; color: #666;">Helping Pune commute better since 2024. Join our mission to reduce road congestion.</p>
      <p style="font-size: 0.85rem; color: #999; margin-top: 1rem;">© 2026 PuneTraffic.com. All rights reserved.</p>
    </div>

  </div>
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


.hero {
  padding: 16px 20px;
  background: #0f172a; /* dark navy */
  color: #e5e7eb;
  text-align: center;
}

.hero h1 {
  font-size: 1.3rem;
  font-weight: 700;
  margin-bottom: 10px;
}

.hero-text {
  font-size: 0.95rem;
  line-height: 1.5;
  color: #d1d5db;
}

.hero-text strong {
  color: #ffffff;
}

.mute-note {
  display: inline-block;
  margin-top: 6px;
  font-size: 0.85rem;
  color: #9ca3af;
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

#pt-modal {
  position: fixed;
  inset: 0;
  z-index: 9999;
}

.pt-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
}

.pt-modal-box {
  position: relative;
  background: #0f172a;
  color: #e5e7eb;
  max-width: 360px;
  width: 90%;
  margin: 20vh auto;
  padding: 18px;
  border-radius: 14px;
  text-align: center;
}

.pt-modal-box h3 {
  margin-bottom: 10px;
}

.pt-modal-body {
  font-size: 0.9rem;
  line-height: 1.4;
}

.pt-modal-actions {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.pt-btn {
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: none;
  font-size: 0.9rem;
}

.pt-btn.primary {
  background: #16a34a;
  color: #fff;
}

.pt-btn.secondary {
  background: #1f2933;
  color: #d1d5db;
}

.demo-notification {
  position: fixed;
  top: -120px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 24px);
  max-width: 420px;
  background: #111827;
  color: #e5e7eb;
  border-radius: 14px;
  padding: 14px 16px;
  box-shadow: 0 10px 30px rgba(0,0,0,0.35);
  z-index: 10001;
  transition: top 0.4s ease;
}

.demo-notification.show {
  top: 12px;
}

.demo-title {
  font-size: 0.85rem;
  font-weight: 700;
  margin-bottom: 4px;
}

.demo-body {
  font-size: 0.9rem;
  line-height: 1.4;
}

.demo-footer {
  margin-top: 6px;
  font-size: 0.75rem;
  color: #9ca3af;
}


`
