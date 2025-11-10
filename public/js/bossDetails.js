import { bossDetails } from "./state.js";
import { capitalize, formatInt } from "./utils.js";
import { BOSS_INFO } from "./boss-info.js";

export function bossDetailsOpen(bossId) {
  const boss = BOSS_INFO[bossId];
  if (!boss) return;

  bossDetails.state.bossId = bossId;
  bossDetails.img.src = boss.img;
  bossDetails.img.alt = boss.name;
  bossDetails.name.textContent = boss.name;

  bossDetails.diff.innerHTML = "";
  const diffs = Object.keys(boss.difficulties || {});
  if (!diffs.length) { bossDetails.root.hidden = true; return; }

  diffs.forEach(dk => {
    const opt = document.createElement("option");
    opt.value = dk; opt.textContent = capitalize(dk);
    bossDetails.diff.appendChild(opt);
  });
  setDifficulty(diffs[0]);
  bossDetails.root.hidden = false;
}

export function setDifficulty(diffKey) {
  const boss = BOSS_INFO[bossDetails.state.bossId];
  if (!boss) return;
  const d = boss.difficulties?.[diffKey] || {};
  bossDetails.state.diffKey = diffKey;

  const maxP = Math.max(1, d.maxPartySize ?? 6);
  bossDetails.party.innerHTML = "";
  for (let i = 1; i <= maxP; i++) {
    const opt = document.createElement("option");
    opt.value = String(i); opt.textContent = String(i);
    bossDetails.party.appendChild(opt);
  }
  updateMesoDisplay();

  const drops = Array.isArray(d.drops) ? d.drops : [];
  bossDetails.dropsWrap.hidden = drops.length === 0;
  bossDetails.drops.innerHTML = "";
  drops.forEach((dr, idx) => {
    const lbl = document.createElement("label");
    lbl.className = "bossDrop";
    lbl.innerHTML = `
      <input type="checkbox" name="bossDrop" value="${dr.name}" id="drop_${idx}">
      <img src="${dr.img}" alt="${dr.name}">
      <span>${dr.name}</span>`;
    bossDetails.drops.appendChild(lbl);
  });
}

export function updateMesoDisplay() {
  const boss = BOSS_INFO[bossDetails.state.bossId];
  const d = boss?.difficulties?.[bossDetails.state.diffKey] || {};
  const party = Math.max(1, Math.min(Number(bossDetails.party.value) || 1, d.maxPartySize || 6));
  const total = Number(d.meso || 0);
  const per = Math.floor(total / party);
  bossDetails.mesoTotal.textContent = formatInt(total);
  bossDetails.mesoPer.textContent = formatInt(per);
}

bossDetails.diff?.addEventListener("change", () => {
  setDifficulty(bossDetails.diff.value);
});
bossDetails.party?.addEventListener("change", updateMesoDisplay);
bossDetails.party?.addEventListener("input", updateMesoDisplay);