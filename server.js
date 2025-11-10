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

const JOB_IDs = {
  "206|12": "Hayato", "207|12": "Kanna", "225|12": "Lynn", "4|12": "Night Lord",
  "2|12": "Arch Mage (F/P)", "31|12": "Demon Slayer", "23|12": "Mercedes",
  "1|12": "Hero", "204|12": "Kaiser", "33|12": "Wild Hunter", "221|12": "Adele",
  "227|12": "Sia", "209|22": "Demon Avenger", "212|12": "Shade", "215|12": "Blaster",
  "218|12": "Ark", "35|12": "Mechanic", "226|12": "Mo Xuan", "5|32": "Cannon Master",
  "14|12": "Night Walker", "21|12": "Aran", "2|32": "Bishop", "2|22": "Arch Mage (I/L)",
  "32|12": "Battle Mage", "208|12": "Xenon", "3|22": "Marksman", "15|12": "Thunder Breaker",
  "1|22": "Paladin", "1|32": "Dark Knight", "5|12": "Buccaneer", "5|22": "Corsair",
  "210|12": "Zero", "3|12": "Bowmaster", "223|12": "Lara", "205|12": "Angelic Buster",
  "3|32": "Pathfinder", "222|12": "Kain", "203|12": "Luminous", "214|12": "Kinesis",
  "24|12": "Phantom", "217|12": "Illium", "22|17": "Evan", "216|12": "Cadena",
  "12|12": "Blaze Wizard", "13|12": "Wind Archer", "220|12": "Hoyoung",
  "4|22": "Shadower", "224|12": "Khali", "4|34": "Blade Master", "11|12": "Dawn Warrior",
  "202|12": "Mihile"
};

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

    const jobIDOut = overallRow?.jobID ?? null;
    const jobDetailOut = overallRow?.jobDetail ?? null;

    let jobNameOut = null;
    if (jobIDOut != null && jobDetailOut != null) {
      jobNameOut = getJobName(jobIDOut, jobDetailOut) || `Job ${jobIDOut} (Detail ${jobDetailOut})`;
    } else if (jobIDOut != null) {
      jobNameOut = `Job ${jobIDOut}`;
    }

    const resBody = {
      characterName: overallRow?.characterName || name,
      level: overallRow?.level ?? null,
      totalExp: overallRow?.exp ?? null,
      legionLevel: legionRow?.legionLevel ?? null,
      worldName: worldNameOut,
      jobID: jobIDOut,
      jobDetail: jobDetailOut,
      jobName: jobNameOut,
      characterImg: overallRow?.characterImgURL || legionRow?.characterImgURL || null
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

// Handy health check for hosts
app.get("/api/health", (_req, res) => res.json({ ok: true }));

// Start server (bind 0.0.0.0 for hosting providers)
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => console.log(`listening on http://localhost:${PORT}`));
