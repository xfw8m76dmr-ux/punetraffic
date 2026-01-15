(() => {
  const quietBtn = document.getElementById("quietBtn");
  const modal = document.getElementById("quietModal");
  const startSel = document.getElementById("quietStart");
  const endSel = document.getElementById("quietEnd");
  const saveBtn = document.getElementById("saveQuiet");

  if (!quietBtn || !modal) return;

  // Reveal button after 5 seconds
  setTimeout(() => {
    quietBtn.classList.add("visible");
  }, 5000);

  /*************************************************
   * IndexedDB helpers
   *************************************************/
  const DB_NAME = "pta_prefs";
  const STORE = "prefs";
  const KEY = "quiet_hours";

  function openDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, 1);

      req.onupgradeneeded = () => {
        req.result.createObjectStore(STORE);
      };

      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async function saveQuietHours(start, end) {
    const db = await openDB();
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put({ start, end }, KEY);
  }

  async function loadQuietHours() {
    const db = await openDB();
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(KEY);

    return new Promise((resolve) => {
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  }

  /*************************************************
   * UI helpers
   *************************************************/
  function buildTimeOptions() {
    for (let h = 0; h < 24; h++) {
      const hour12 = h % 12 || 12;
      const ampm = h < 12 ? "AM" : "PM";
      const label = `${hour12} ${ampm}`;

      startSel.add(new Option(label, h));
      endSel.add(new Option(label, h));
    }
  }

  function formatHour(h) {
    const hour12 = h % 12 || 12;
    const ampm = h < 12 ? "AM" : "PM";
    return `${hour12} ${ampm}`;
  }

  function updateQuietLabel(start, end) {
    quietBtn.textContent =
      `🔕 Quiet hours set to ${formatHour(start)} – ${formatHour(end)}`;
  }

  /*************************************************
   * Events
   *************************************************/
  quietBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  saveBtn.addEventListener("click", async () => {
    const start = Number(startSel.value);
    const end = Number(endSel.value);

    await saveQuietHours(start, end);
    updateQuietLabel(start, end);
    modal.style.display = "none";
  });

  /*************************************************
   * Init
   *************************************************/
  buildTimeOptions();

  loadQuietHours().then((prefs) => {
    if (!prefs) return;

    startSel.value = prefs.start;
    endSel.value = prefs.end;
    updateQuietLabel(prefs.start, prefs.end);
  });
})();
