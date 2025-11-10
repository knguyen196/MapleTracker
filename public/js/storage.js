import { VISIBLE_CHAR_KEYS, WEEKLY_ARCHIVE_KEY } from "./constants.js";

export function getRoster() {
  try { return JSON.parse(localStorage.getItem("mapleRoster")) || []; }
  catch { return []; }
}

export function getActiveCharKey() {
  return localStorage.getItem("mapleActiveKey") || null;
}
export function setActiveChar(charKey) {
  if (!charKey) return;
  localStorage.setItem("mapleActiveKey", charKey);

  const roster = getRoster();
  const char = roster.find(r => r.key === charKey);
  const el = document.getElementById("currentActiveChar");
  if (char && el) {
    el.innerHTML = `<img src="${char.characterImg}" alt="Active char img">`;
  }
}

export function saveVisibleChars(list) {
  localStorage.setItem(VISIBLE_CHAR_KEYS, JSON.stringify(list || []));
}
export function loadVisibleChars() {
  try { return JSON.parse(localStorage.getItem(VISIBLE_CHAR_KEYS)) || []; }
  catch { return []; }
}

export function runsKey(charKey) { return `bossRuns_${charKey}`; }
export function getRunsForChar(charKey) {
  try { return JSON.parse(localStorage.getItem(runsKey(charKey))) || []; }
  catch { return []; }
}
export function saveRunsForChar(charKey, runs) {
  localStorage.setItem(runsKey(charKey), JSON.stringify(runs));
}
export function clearAllRuns() {
  const toRemove = [];
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith("bossRuns_")) toRemove.push(k);
  }
  toRemove.forEach(k => localStorage.removeItem(k));
}

export function getWeeklyArchive() {
  try { return JSON.parse(localStorage.getItem(WEEKLY_ARCHIVE_KEY)) || []; }
  catch { return []; }
}
export function saveWeeklyArchive(list) {
  localStorage.setItem(WEEKLY_ARCHIVE_KEY, JSON.stringify(list || []));
}

export function getCharDisplayName(charKey) {
  const roster = getRoster();
  const char = roster.find(r => r.key === charKey);
  return char?.name || char?.characterName || charKey || "";
}
