import { bossDetails } from "./state.js";
import { IDS } from "./constants.js";
import { BOSS_INFO } from "./boss-info.js";
import { getActiveCharKey, getRunsForChar, saveRunsForChar } from "./storage.js";
import { renderBossBoard } from "./board.js";
import { renderWeeklyArchive } from "./weekly.js"; // <-- important

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (id === IDS.weeklyLogModal) renderWeeklyArchive(); // populate only when opening weekly
  modal.setAttribute("aria-hidden", "false");
}

export function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.setAttribute("aria-hidden", "true");
}

export function wireModals() {
  document.getElementById(IDS.addBossBtn)
  ?.addEventListener("click", () => {
  bossDetails.state.charKey = getActiveCharKey();
  openModal(IDS.bossModal);
 });


  document.querySelectorAll("[data-modal-close]").forEach(btn => {
    btn.addEventListener("click", () => btn.closest(".modal")?.setAttribute("aria-hidden", "true"));
  });

  document.querySelectorAll(".modal").forEach(m => {
    m.addEventListener("click", e => {
      if (e.target === m) m.setAttribute("aria-hidden", "true");
    });
  });


  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      document.querySelectorAll(".modal[aria-hidden='false']")
        .forEach(m => m.setAttribute("aria-hidden", "true"));
    }
  });

  document.getElementById("modalBtnDone")?.addEventListener("click", () => {
    const charKey = bossDetails.state.charKey || getActiveCharKey();
    if (!charKey) {
      alert("Select a character first by clicking 'Add Bosses' on their card.");
      return;
    }
    const bossId = bossDetails.state.bossId;
    const diffKey = bossDetails.state.diffKey;
    if (!bossId || !diffKey) {
      alert("Pick a boss and difficulty first.");
      return;
    }

    const boss = BOSS_INFO[bossId];
    const d = boss?.difficulties?.[diffKey];
    if (!d) {
      alert("That boss/difficulty has no data.");
      return;
    }

    const partySize = Math.max(1, Math.min(Number(bossDetails.party.value) || 1, d.maxPartySize || 6));
    const total = Number(d.meso || 0);
    const per = Math.floor(total / partySize);

    const drops = Array.from(
      document.querySelectorAll("#bossDrops input[name='bossDrop']:checked")
    ).map(i => i.value);

    const runs = getRunsForChar(charKey);
    runs.push({
      ts: Date.now(),
      bossId,
      bossName: boss.name,
      difficulty: diffKey,
      partySize,
      mesoTotal: total,
      mesoPer: per,
      gotDrops: drops,
    });
    saveRunsForChar(charKey, runs);

    renderBossBoard();
    closeModal(IDS.bossModal);
  });
}
