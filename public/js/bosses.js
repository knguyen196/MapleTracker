import { renderBossGrid } from "./bossGrid.js";
import { renderBossBoard, renderCharAdd } from "./board.js";
import { logCurrentWeek, resetWeeklyLogs } from "./weekly.js";
import { IDS } from "./constants.js";
import { getRoster } from "./storage.js";
import { wireModals, openModal } from "./modal.js";

window.addEventListener("load", () => {
  const activeKey = localStorage.getItem("mapleActiveKey");
  const roster = getRoster();
  const activeChar = roster.find(r => r.key === activeKey);
  const charDisplay = document.getElementById("currentActiveChar");
  if (activeChar && charDisplay) {
    charDisplay.innerHTML = `<img src="${activeChar.characterImg}" alt="Active char img">`;
  } else if (charDisplay) {
    charDisplay.textContent = "No active character.";
  }
});

window.addEventListener("DOMContentLoaded", () => {

  wireModals();
  renderBossGrid();
  renderCharAdd();
  renderBossBoard();


  document.getElementById(IDS.logWeekBtn)?.addEventListener("click", logCurrentWeek);


  document.getElementById(IDS.showWeeklyLogBtn)?.addEventListener("click", () => {
    openModal(IDS.weeklyLogModal);
  });


  document.getElementById(IDS.resetWeeklyLogsBtn)?.addEventListener("click", resetWeeklyLogs);


  document.getElementById(IDS.resetBossPageBtn)?.addEventListener("click", () => {
    if (!confirm("Clear current boss runs and visible characters?")) return;

    const toRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("bossRuns_")) toRemove.push(k);
    }
    toRemove.forEach(k => localStorage.removeItem(k));

    localStorage.removeItem("visibleChars");
    localStorage.removeItem("mapleActiveKey");

    const charDisplay = document.getElementById("currentActiveChar");
    if (charDisplay) charDisplay.textContent = "No active character.";

    renderBossBoard();
    renderCharAdd();
    alert("Boss page cleared. Weekly logs were kept.");
  });
});
