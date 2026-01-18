(() => {
  let startY = 0;
  let pulling = false;
  let refreshing = false;

  const indicator = document.getElementById("ptr-indicator");

  if (!indicator) {
    console.warn("Pull-to-refresh: indicator not found");
    return;
  }

  window.addEventListener("touchstart", (e) => {
    if (window.scrollY === 0 && !refreshing) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  window.addEventListener("touchmove", (e) => {
    if (!pulling || refreshing) return;

    if (e.touches[0].clientY - startY > 70) {
      indicator.classList.add("active");
    }
  }, { passive: true });

  window.addEventListener("touchend", async () => {
    if (!pulling || refreshing) return;

    if (indicator.classList.contains("active")) {
      refreshing = true;
      indicator.classList.remove("active");
      indicator.classList.add("loading");
      indicator.textContent = "⏳ Refreshing traffic…";

      try {
        if (typeof window.refreshChokepoints === "function") {
          await window.refreshChokepoints(); // 🔥 invoke app.js
        } else {
          console.error("Pull-to-refresh: load() not found");
        }
      } catch (err) {
        console.error("Pull-to-refresh failed", err);
      }

      indicator.textContent = "↓ Pull to refresh";
      indicator.classList.remove("loading");
      refreshing = false;
    }

    pulling = false;
  });
})();
