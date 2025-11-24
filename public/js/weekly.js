import { getRoster, getRunsForChar, getWeeklyArchive, saveWeeklyArchive, clearAllRuns } from "./storage.js";
import { formatInt } from "./utils.js";
import { renderBossBoard, renderCharAdd } from "./board.js";
import { WEEKLY_ARCHIVE_KEY } from "./constants.js";

export function logCurrentWeek() {
  const roster = getRoster();
  const archive = getWeeklyArchive();

  let totalMeso = 0;
  const charsRan = [];
  const allDrops = new Set();
  const seen = new Set();

  roster.forEach(char => {
    const runs = getRunsForChar(char.key);
    if (!runs || !runs.length) return;
    charsRan.push(char.name || char.characterName || char.key);
    seen.add(char.key);
    runs.forEach(r => {
      totalMeso += Number(r.mesoPer) || 0;
      (r.gotDrops || []).forEach(d => allDrops.add(d));
    });
  });

  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (!k || !k.startsWith("bossRuns_")) continue;
    const charKey = k.slice("bossRuns_".length);
    if (seen.has(charKey)) continue;
    const runs = getRunsForChar(charKey);
    if (!runs || !runs.length) continue;
    charsRan.push(charKey);
    runs.forEach(r => {
      totalMeso += Number(r.mesoPer) || 0;
      (r.gotDrops || []).forEach(d => allDrops.add(d));
    });
  }

  if (!charsRan.length) { alert("No boss runs recorded for any characters."); return; }

  archive.unshift({
    weekLoggedAt: new Date().toISOString(),
    totalMeso,
    characters: charsRan,
    drops: Array.from(allDrops),
  });
  saveWeeklyArchive(archive);

  clearAllRuns();
  renderBossBoard();
  renderCharAdd();
  alert("Weekly log saved successfully.");
}

export function renderWeeklyArchive() {
  const box = document.getElementById("weeklyLogBody");
  if (!box) return;

  const archive = getWeeklyArchive();
  if (!archive.length) { box.innerHTML = "<p>No weekly logs saved yet.</p>"; return; }

  box.innerHTML = archive.map((w, idx) => {
    const date = new Date(w.weekLoggedAt).toLocaleString();
    const drops = w.drops?.length ? `Drops: ${w.drops.join(", ")}` : "Drops: none";
    return `
      <div class="weeklyLogEntry">
        <strong>Week ${archive.length - idx}</strong> (${date})<br>
        Total Meso: ${formatInt(w.totalMeso)}<br>
        Characters: ${w.characters.join(", ")}<br>
        ${drops}
      </div>
      <hr>
    `;
  }).join("");
}

export function resetWeeklyLogs() {
  if (!confirm("Delete all saved weekly logs?")) return;
  localStorage.removeItem(WEEKLY_ARCHIVE_KEY);
  const box = document.getElementById("weeklyLogBody");
  if (box) box.innerHTML = "<p>No weekly logs saved yet.</p>";
}