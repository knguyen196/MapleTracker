import { getActiveCharKey, getRoster, loadVisibleChars, saveVisibleChars,
         getRunsForChar, saveRunsForChar, setActiveChar, savePresetForChar, loadPresetForChar } from "./storage.js";
import { capitalize, formatInt } from "./utils.js";
import { BOSS_INFO } from "./boss-info.js";
import { bossDetails } from "./state.js";
import { resetBossModal, bossDetailsOpen, setDifficulty, updateMesoDisplay } from "./bossDetails.js";
import { markDoneBossesForChar } from "./bossGrid.js";

const BOSS_ORDER = [
  "Zakum",
  "Magnus",
  "Hilla",
  "Papulatus",
  "Piere",
  "Von Bon",
  "Crimson Queen",
  "Vellum",
  "Pink Bean",
  "Cygnus",
  "Lotus",
  "Damien",
  "Guardian Angel Slime",
  "Lucid",
  "Will",
  "Gloom",
  "Verus Hilla",
  "Darknell",
  "Chosen Seren",
  "Kalos the Guardian",
  "First Adversary",
  "Kaling",
  "Limbo",
  "Baldrix",
  "Princess No",
  "Akechi Mitsuhide",
  "Black Mage"
]

const MONTHLY_BOSSES = [
  "Black Mage"
];

const BOSS_MAX = 180;

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

  const runs = getRunsForChar(charKey);
  const maxBosses = 14;
  const remaining = Math.max(0, maxBosses - runs.length);

  const addBtn = document.createElement("button");
  addBtn.className = "charBoardAddBtn";
  addBtn.textContent = "Add Bosses";
  addBtn.addEventListener("click", () => {
    if (remaining <= 0) {
      return;
    }
    bossDetails.state.charKey = charKey;
    setActiveChar(charKey);
    resetBossModal();
    markDoneBossesForChar(charKey);
    document.getElementById("bossModal")?.setAttribute("aria-hidden", "false");
  });

  if (remaining <= 0) {
    addBtn.disabled = true;
    addBtn.title = "Maximum number of boss runs reached.";
  }

  const removeBtn = document.createElement("button");
  removeBtn.className = "charBoardRemoveBtn";
  removeBtn.textContent = "Remove";
  removeBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    removeCharFromBoard(charKey);
  });

  header.append(left, addBtn);

  const presetBar = document.createElement("div");
  presetBar.className = "charBoardPresetBar";

  const savePresetBtn = document.createElement("button");
  savePresetBtn.className = "savePresetBtn";
  savePresetBtn.textContent = "Save preset";
  savePresetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const currentRuns = getRunsForChar(charKey);
    if (!currentRuns.length) {
      alert("No boss runs to save as a preset.");
      return;
    }


    const preset = currentRuns.map(r => ({
      bossId: r.bossId,
      difficulty: r.difficulty,
      partySize: r.partySize,
    }));

    savePresetForChar(charKey, preset);
    alert("Preset saved for this character.");
  });

  const loadPresetBtn = document.createElement("button");
  loadPresetBtn.className = "loadPresetBtn";
  loadPresetBtn.textContent = "Load preset";
  loadPresetBtn.addEventListener("click", (e) => {
    e.stopPropagation();
    const preset = loadPresetForChar(charKey);
    if (!preset || !preset.length) {
      alert("No preset found for this character yet.");
      return;
    }

    const newRuns = [];
    const now = Date.now();
    let i = 0;

    preset.forEach(p => {
      const boss = BOSS_INFO[p.bossId];
      if (!boss) return;
      const d = boss.difficulties?.[p.difficulty];
      if (!d) return;

      const partySize = Math.max(1, Math.min(p.partySize || 1, d.maxPartySize || 6));
      const total = Number(d.meso || 0);
      const per = Math.floor(total / partySize);

      newRuns.push({
        ts: now + (i++),
        bossId: p.bossId,
        bossName: boss.name,
        difficulty: p.difficulty,
        partySize,
        mesoTotal: total,
        mesoPer: per,
        gotDrops: [],
      });
    });

    saveRunsForChar(charKey, newRuns);
    renderBossBoard();
  });

  presetBar.append(savePresetBtn, loadPresetBtn);

  const totals = document.createElement("div");
  totals.className = "charBoardTotal";
  totals.innerHTML = `
    Total meso: <span class="charMesoTotal">0</span><br>
    Bosses: <span class="charBossCount">0</span>/14
  `;

  const runsList = document.createElement("div");
  runsList.className = "charBoardRunsList";

  section.append(header, presetBar, totals, runsList, removeBtn);
  renderRuns(section, charKey);
  return section;
}


export function renderRuns(boardList, charKey) {
  const totals = boardList.querySelector(".charBoardTotal");
  const list = boardList.querySelector(".charBoardRunsList");
  if (!totals || !list) return;

  const runs = getRunsForChar(charKey);

  runs.sort((a,b) => {

    const indexA = BOSS_ORDER.indexOf(a.bossName);
    const indexB = BOSS_ORDER.indexOf(b.bossName);

    if (indexA === -1 && indexB === -1){
      return 0;
    }

    if (indexA === -1) return 1;

    if (indexB === -1) return -1;

    return indexA - indexB;

  });

  const mesoSpan = totals.querySelector(".charMesoTotal");
  const bossCountSpan = totals.querySelector(".charBossCount");

  const countedRuns = runs.filter(r => !MONTHLY_BOSSES.includes(r.bossName));

  const tot = runs.reduce((s, r) => s + (Number(r.mesoPer) || 0), 0);
  if (mesoSpan) mesoSpan.textContent = formatInt(tot);
  if (bossCountSpan) bossCountSpan.textContent = countedRuns.length;

  if (!runs.length) {
  if (mesoSpan) mesoSpan.textContent = "0";
  if (bossCountSpan) bossCountSpan.textContent = "0";
  list.innerHTML = `<div class="noRunsMsg">No boss runs recorded for this character.</div>`;
  return;
}


  const frag = document.createDocumentFragment();
  runs.forEach(run => {
    const div = document.createElement("div");
    div.className = "bossRunEntry";
    div.dataset.ts = String(run.ts);
    const boss = BOSS_INFO[run.bossId];
    div.innerHTML = `
      <div class="runEntryTitle">
      <img class="runEntryBossImg" src="${boss.img}" alt="${run.bossName}">
      <span>${run.bossName}</span>
      </div>
      <div class="runEntryMeta">${capitalize(run.difficulty)} | Party size: ${run.partySize}</div>
      <div class="runEntryMeso">${formatInt(run.mesoPer)}</div>
      <div class="runEntryDrops"></div>
      <div class="runEntryActions">
      <button class="runEntryEditBtn">Edit</button>
      <button class="runEntryUndoBtn">x</button>
      </div>
    `;

    const dropsWrap = div.querySelector(".runEntryDrops");
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

  let totalMeso = 0;
  let totalRuns = 0;

  (visible || []).forEach(k => {
    const runs = getRunsForChar(k);
    totalRuns += runs.length;
    totalMeso += runs.reduce((s, r) => s + (Number(r.mesoPer) || 0), 0);
  });

  let footer = document.getElementById("bossGrandTotal");
  if (!footer) {
    footer = document.createElement("div");
    footer.id = "bossGrandTotal";
    footer.className = "bossGrandTotal";
    (section || board.parentElement || document.body).appendChild(footer);
  }

  footer.innerHTML = `
    Grand Total Meso: <strong>${totalMeso.toLocaleString()}</strong> |
    Bosses: <strong>${totalRuns}/${BOSS_MAX}</strong>
  `;
  
}

document.getElementById("bossBoard")?.addEventListener("click", (e) => {
  const undoBtn = e.target.closest(".runEntryUndoBtn");
  const editBtn = e.target.closest(".runEntryEditBtn");
  if (!undoBtn && !editBtn) return;

  const card = e.target.closest(".bossRunEntry");
  const board = e. target.closest(".charBossBoard");
  const ts = Number(card?.dataset.ts);
  const charKey = board?.dataset.charKey;
  if (!ts || !charKey) return;

  const runs = getRunsForChar(charKey);
  const idx = runs.findIndex(r => r.ts === ts);
  if (idx < 0) return;

  if (undoBtn) {
    runs.splice(idx, 1);
    saveRunsForChar(charKey, runs);
    renderRuns(board, charKey);
    renderBossBoard();
    return;
  }

  if (editBtn) {
    const run = runs[idx];
    bossDetails.state.charKey = charKey;
    bossDetails.state.editTs = ts;

    bossDetailsOpen(run.bossId);

    bossDetails.diff.value = run.difficulty;
    setDifficulty(run.difficulty);
    bossDetails.party.value = String(run.partySize);
    updateMesoDisplay();

    const checks = document.querySelectorAll("#bossDrops input[name='bossDrop']");
    checks.forEach(chk => {
      chk.checked = !!(run.gotDrops || []).includes(chk.value);
    });

    document.getElementById("bossModal")?.setAttribute("aria-hidden","false");
  }
});