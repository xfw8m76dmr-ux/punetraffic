(() => {
  const quietBtn = document.getElementById("quietBtn");
  const modal = document.getElementById("quietModal");
  const startSel = document.getElementById("quietStart");
  const endSel = document.getElementById("quietEnd");
  const saveBtn = document.getElementById("saveQuiet");

  if (!quietBtn || !modal) return;

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

  quietBtn.addEventListener("click", () => {
    modal.style.display = "flex";
  });

  modal.addEventListener("click", (e) => {
    if (e.target === modal) modal.style.display = "none";
  });

  saveBtn.addEventListener("click", () => {
    const start = Number(startSel.value);
    const end = Number(endSel.value);

    localStorage.setItem(
      "quiet_hours",
      JSON.stringify({ start, end })
    );

    updateQuietLabel(start, end);
    modal.style.display = "none";
  });

  // Init
  buildTimeOptions();

  const saved = localStorage.getItem("quiet_hours");
  if (saved) {
    const { start, end } = JSON.parse(saved);
    startSel.value = start;
    endSel.value = end;
    updateQuietLabel(start, end);
  }
})();
