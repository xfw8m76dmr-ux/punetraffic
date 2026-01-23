// set source as PWA
// PWA source attribution (URL-based, Zaraz-safe)
(function () {
  try {
    // Do not override existing UTMs
    if (location.search.includes('utm_source=')) return;

    // Detect platform
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);

    // Detect PWA / standalone mode
    var isPWA = isIOS
      ? navigator.standalone === true
      : window.matchMedia('(display-mode: standalone)').matches;

    if (!isPWA) return;

    // Platform for campaign
    var platform = 'desktop';
    if (isIOS) platform = 'ios';
    else if (/android/i.test(navigator.userAgent)) platform = 'android';

    // Append UTMs
    var url = new URL(window.location.href);
    url.searchParams.set('utm_source', 'pwa');
    url.searchParams.set('utm_medium', 'app');
    url.searchParams.set('utm_campaign', platform);

    // Update URL without reload
    window.history.replaceState({}, '', url.toString());
  } catch (e) {}
})();
