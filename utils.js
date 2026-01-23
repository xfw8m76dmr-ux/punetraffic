// set source as PWA
(function () {
  try {
    if (sessionStorage.getItem('pwa_attributed')) return;

    // Detect PWA / standalone
    var isPWA =
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true;

    if (!isPWA) return;
    if (location.search.includes('utm_source=')) return;

    // Detect platform
    var isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
    var platform = isIOS ? 'ios' : 'chrome';

    var url = new URL(window.location.href);
    url.searchParams.set('utm_source', 'pwa');
    url.searchParams.set('utm_medium', 'app');
    url.searchParams.set('utm_campaign', platform); // chrome | ios

    window.history.replaceState({}, '', url.toString());

    sessionStorage.setItem('pwa_attributed', '1');
  } catch (e) {}
})();
