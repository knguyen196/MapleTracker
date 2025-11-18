const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();


if (process.env.NODE_ENV !== "production") {
  app.use(cors());
  const livereload = require("livereload");
  const connectLivereload = require("connect-livereload");
  app.use(connectLivereload());

  const lr = livereload.createServer();
  lr.watch(path.join(__dirname, "public"));
  lr.server.once("connection", () => setTimeout(() => lr.refresh("/"), 100));
}


app.use(express.static(path.join(__dirname, "public")));


const NEXON_HEADERS = { Accept: "application/json", "User-Agent": "MapleTracker/1.0" };

const WORLD_LIST = { 45: "Kronos", 1: "Bera", 70: "Hyperion", 19: "Scania", 46: "Solis", 30: "Luna" };

function getJobName(jobID, jobDetail) {
  if (jobID == null || jobDetail == null) return null;
  return JOB_IDs[`${jobID}|${jobDetail}`] || null;
}

function takeRanks(resp) {
  if (resp && resp.data && Array.isArray(resp.data.ranks)) return resp.data.ranks;
  console.warn("Unexpected API shape: no data.ranks");
  return [];
}

function findByExactName(rows, name) {
  const target = (name || "").toLowerCase();
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    if (r.characterName && r.characterName.toLowerCase() === target) return r;
  }
  return null;
}

app.get("/api/profile", async function (req, res) {
  try {
    const name = req.query.name;
    const region = req.query.region ? String(req.query.region) : "na";

    if (!name) return res.status(400).json({ error: "Missing ?name=" });

    const BASE = `https://www.nexon.com/api/maplestory/no-auth/ranking/v2/${region}`;

    let overallRow = null;

    // Non-heroic worlds
    try {
      const nonHeroic = await axios.get(BASE, {
        headers: NEXON_HEADERS,
        params: { type: "overall", id: "weekly", reboot_index: 0, page_index: 1, character_name: name },
        timeout: 15000
      });
      const rows = takeRanks(nonHeroic);
      overallRow = findByExactName(rows, name) || overallRow;
    } catch {}

    // Heroic worlds
    if (!overallRow) {
      try {
        const heroic = await axios.get(BASE, {
          headers: NEXON_HEADERS,
          params: { type: "overall", id: "weekly", reboot_index: 1, page_index: 1, character_name: name },
          timeout: 15000
        });
        const rows = takeRanks(heroic);
        overallRow = findByExactName(rows, name) || overallRow;
        console.log("PROFILE lookup:", { name, region, hit: !!overallRow });
      } catch {}
    }

    if (!overallRow) return res.status(404).json({ error: "Character not found" });

    // Legion
    let legionRow = null;
    try {
      const legionResp = await axios.get(BASE, {
        headers: NEXON_HEADERS,
        params: { type: "legion", id: overallRow.worldID, page_index: 1, character_name: name },
        timeout: 15000
      });
      legionRow = findByExactName(takeRanks(legionResp), name);
    } catch {}

    // Build response
    const worldNameOut =
      overallRow?.worldID != null ? (WORLD_LIST[overallRow.worldID] || `World ${overallRow.worldID}`) : null;

    const jobNameOut = overallRow?.jobName;

  const resBody = {
    characterName: overallRow?.characterName || name,
    level: overallRow?.level ?? null,
    totalExp: overallRow?.exp ?? null,
    legionLevel: legionRow?.legionLevel ?? null,
    worldName: worldNameOut,
    jobID: overallRow?.jobID ?? null,
    jobDetail: overallRow?.jobDetail ?? null,
    jobName: jobNameOut,
    characterImg: overallRow?.characterImgURL || legionRow?.characterImgURL || null,
};

    console.log("PROFILE response:", {
      characterName: resBody.characterName,
      level: resBody.level,
      totalExp: resBody.totalExp,
      worldName: resBody.worldName,
      jobID: resBody.jobID,
      jobDetail: resBody.jobDetail,
      jobName: resBody.jobName
    });

    return res.json(resBody);
  } catch (err) {
    if (err && err.response) {
      return res.status(err.response.status).json({
        error: err.response.statusText,
        details: err.response.data
      });
    }
    return res.status(500).json({ error: "Internal server error", details: String(err) });
  }
});


app.get("/api/health", (_req, res) => res.json({ ok: true }));


const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`listening on http://localhost:${PORT}`));
