import { bossDetailsOpen } from "./bossDetails.js";
import { IDS } from "./constants.js";
import { openModal } from "./modal.js";
import { BOSS_INFO } from "./boss-info.js";
import { bossDetails } from "./state.js";

export function renderBossGrid() {
  const grid = document.getElementById(IDS.bossGrid);
  if (!grid) return;
  grid.innerHTML = "";

  const keys = Object.keys(BOSS_INFO);
  keys.forEach(k => {
    const b = BOSS_INFO[k];
    const card = document.createElement("div");
    card.className = "bossCard";
    card.dataset.bossId = b.id;
    card.innerHTML = `<img src="${b.img}" alt="${b.name}"><div class="bossName">${b.name}</div>`;
    grid.appendChild(card);

  });

grid.addEventListener("click", (e) => {
  const card = e.target.closest(".bossCard");
  if (!card) return;

  bossDetailsOpen(card.dataset.bossId);

  const modal = document.getElementById(IDS.bossModal);
  const content = modal?.querySelector(".modalContent");
  const details = document.getElementById("bossDetails");

  if (content && details) {
    content.scrollTo({
      top: details.offsetTop,
      behavior: "smooth"
    });
  }
});

}