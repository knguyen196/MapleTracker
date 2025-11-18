import { getActiveCharKey, getRoster, loadVisibleChars, saveVisibleChars,
         getRunsForChar, saveRunsForChar, setActiveChar } from "./storage.js";
import { capitalize, formatInt } from "./utils.js";
import { BOSS_INFO } from "./boss-info.js";
import { bossDetails } from "./state.js";

export function renderCharAdd() {
  const select = document.getElementById("charAddSelect");
  const button = document.getElementById("charAddBtn");
  if (!select || !button) return;

  select.innerHTML = "";
  const roster = getRoster();
  const visible = new Set(loadVisibleChars());
  const notVisible = roster.filter(r => !visible.has(r.key));

  if (!notVisible.length) {
    select.innerHTML = `<option value="">No more characters to add</option>`;
    select.disabled = true; button.disabled = true;
  } else {
    notVisible.forEach(c => {
      const opt = document.createElement("option");
      opt.value = c.key; opt.textContent = c.name || c.characterName || c.key;
      select.appendChild(opt);
    });
    select.disabled = false; button.disabled = false;
  }

  const newBtn = button.cloneNode(true);
  button.parentNode.replaceChild(newBtn, button);

  newBtn.addEventListener("click", () => {
    const val = select.value;
    if (!val) return;
    const list = loadVisibleChars();
    if (!list.includes(val)) {
      list.push(val);
      saveVisibleChars(list);
      setActiveChar(val)
      renderBossBoard();
      renderCharAdd();
    }
  });
}

export function renderBossBoard() {
  const board = document.getElementById("bossBoard");
  if (!board) return;

  let visible = loadVisibleChars();
  const active = getActiveCharKey();
  if ((!visible || !visible.length) && active) {
    visible = [active];
    saveVisibleChars(visible);
 }

  board.classList.add("boardGrid");
  board.innerHTML = "";
  (visible || []).forEach(charKey => board.appendChild(buildCharBoard(charKey)));

  grandTotal(visible);
}

export function buildCharBoard(charKey) {
  const roster = getRoster();
  const char = roster.find(r => r.key === charKey);
  const name = char?.name || char?.characterName || charKey || "";
  const img = char?.characterImg || "";

  const section = document.createElement("section");
  section.className = "charBossBoard";
  section.dataset.charKey = charKey;

  const header = document.createElement("div");
  header.className = "charBoardHeader";

  const left = document.createElement("div");
  left.className = "charBoardHeaderLeft";
  left.innerHTML = `<img class="charBoardAvatar" src="${img}" alt="${name}"><div class="charBoardName">${name}</div>`;

  const addBtn = document.createElement("button");
  addBtn.className = "charBoardAddBtn";
  addBtn.textContent = "Add Bosses";
  addBtn.addEventListener("click", () => {
    bossDetails.state.charKey = charKey;
    setActiveChar(charKey);
    document.getElementById("bossModal")?.setAttribute("aria-hidden","false");
  });

  const removeBtn = document.createElement("button");
  removeBtn.className = "charBoardRemoveBtn";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeCharFromBoard(charKey);
  });

  header.append(left, addBtn);
  const totals = document.createElement("div");
  totals.className = "charBoardTotal";
  totals.textContent = "Total meso: 0";

  const runsList = document.createElement("div");
  runsList.className = "charBoardRunsList";

  section.append(header, totals, runsList, removeBtn);
  renderRuns(section, charKey);
  return section;
}

export function renderRuns(boardList, charKey) {
  const totals = boardList.querySelector(".charBoardTotal");
  const list = boardList.querySelector(".charBoardRunsList");
  if (!totals || !list) return;

  const runs = getRunsForChar(charKey);
  if (!runs.length) {
    totals.textContent = "Total meso: 0";
    list.innerHTML = `<div class="noRunsMsg">No boss runs recorded for this character.</div>`;
    return;
  }

  const tot = runs.reduce((s, r) => s + (Number(r.mesoPer) || 0), 0);
  totals.innerHTML = `Total meso: <strong>${formatInt(tot)}</strong>`;

  runs.sort((a,b) => b.ts - a.ts);

  const frag = document.createDocumentFragment();
  runs.forEach(run => {
    const div = document.createElement("div");
    div.className = "bossRunEntry";
    div.dataset.ts = String(run.ts);

    div.innerHTML = `
      <div class="runEntryTitle">${run.bossName}</div>
      <div class="runEntryMeta">${capitalize(run.difficulty)} | Party size: ${run.partySize}</div>
      <div class="runEntryMeso">${formatInt(run.mesoPer)}</div>
      <div class="runEntryDrops"></div>
      <div class="runEntryActions"><button class="runEntryUndoBtn">Undo</button></div>
    `;

    const dropsWrap = div.querySelector(".runEntryDrops");
    const boss = BOSS_INFO[run.bossId];
    const d = boss?.difficulties?.[run.difficulty];
    const dropDefs = Array.isArray(d?.drops) ? d.drops : [];
    (run.gotDrops || []).forEach(name => {
      const def = dropDefs.find(dr => dr.name === name);
      if (!def) return;
      const img = document.createElement("img");
      img.className = "runEntryDropImg";
      img.src = def.img; img.alt = name;
      dropsWrap.appendChild(img);
    });

    frag.appendChild(div);
  });
  list.replaceChildren(frag);
}

export function removeCharFromBoard(charKey) {
  const visible = loadVisibleChars().filter(k => k !== charKey);
  saveVisibleChars(visible);

  const active = getActiveCharKey();
  if (active === charKey) {
    if (visible.length) {
      setActiveChar(visible[0]);
    } else {
      localStorage.removeItem("mapleActiveKey");
      const el = document.getElementById("currentActiveChar");
      if (el) el.textContent = "No active character.";
    }
  }

  renderBossBoard();
  renderCharAdd();
}

export function grandTotal(visible) {
  const board = document.getElementById("bossBoard");
  const section = document.getElementById("bossSection");
  if (!board) return;

  let total = 0;
  (visible || []).forEach(k => {
    const runs = getRunsForChar(k);
    total += runs.reduce((s, r) => s + (Number(r.mesoPer) || 0), 0);
  });

  let footer = document.getElementById("bossGrandTotal");
  if (!footer) {
    footer = document.createElement("div");
    footer.id = "bossGrandTotal";
    footer.className = "bossGrandTotal";
    (section || board.parentElement || document.body).appendChild(footer);
  }
  footer.innerHTML = `Grand Total Meso: <strong>${total.toLocaleString()}</strong>`;
}


document.getElementById("bossBoard")?.addEventListener("click", (e) => {
  const btn = e.target.closest(".runEntryUndoBtn");
  if (!btn) return;
  const card = e.target.closest(".bossRunEntry");
  const board = e.target.closest(".charBossBoard");
  const ts = Number(card?.dataset.ts);
  const charKey = board?.dataset.charKey;
  if (!ts || !charKey) return;

  const runs = getRunsForChar(charKey);
  const idx = runs.findIndex(r => r.ts === ts);
  if (idx >= 0) {
    runs.splice(idx, 1);
    saveRunsForChar(charKey, runs);
    renderBossBoard();
  }
});
