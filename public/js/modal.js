import { bossDetails } from "./state.js";
import { IDS } from "./constants.js";
import { BOSS_INFO } from "./boss-info.js";
import { getActiveCharKey, getRunsForChar, saveRunsForChar } from "./storage.js";
import { renderBossBoard } from "./board.js";
import { renderWeeklyArchive } from "./weekly.js";

 const MONTHLY_BOSSES = [
    "Black Mage"
];

export function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  if (id === IDS.weeklyLogModal) renderWeeklyArchive();
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
    const maxBosses = 14;

    const nonMonthlyCount = runs.filter(r => !MONTHLY_BOSSES.includes(r.bossName)).length;
    const isMonthly = MONTHLY_BOSSES.includes(boss.name);

    if (!bossDetails.state.editTs && !isMonthly && nonMonthlyCount >= maxBosses) {
    alert("This character already has 14 weekly bosses logged.");
    return;
    }
    
    const newRun = {
      ts: bossDetails.state.editTs || Date.now(),
      bossId,
      bossName: boss.name,
      difficulty: diffKey,
      partySize,
      mesoTotal: total,
      mesoPer: per,
      gotDrops: drops,
    };

    if (bossDetails.state.editTs) {
      const idx = runs.findIndex(r => r.ts === bossDetails.state.editTs);
      if (idx >= 0) {
        runs[idx] = newRun;
      }
  } else {
    runs.push(newRun);
  }

  bossDetails.state.editTs = null;
  saveRunsForChar(charKey, runs);
  renderBossBoard();
  closeModal(IDS.bossModal);
});
}