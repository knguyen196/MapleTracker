const livereload = require("livereload");
const connectLivereload = require("connect-livereload");
const path = require("path");
const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
app.use(cors());
app.use(connectLivereload());
app.use(express.static(path.join(__dirname, "public")));

const liveReloadServer = livereload.createServer();
liveReloadServer.watch(path.join(__dirname, "public"));

liveReloadServer.server.once("connection", () => {
  setTimeout(() => liveReloadServer.refresh("/"), 100);
});

// Header for Nexon Requests
const NEXON_HEADERS = { Accept: "application/json", "User-Agent": "MapleTracker/1.0" };

const WORLD_LIST = { 45: "Kronos", 1: "Bera", 70: "Hyperion", 19: "Scania", 46: "Solis", 30: "Luna"};

const JOB_IDs = { "206|12": "Hayato", "207|12": "Kanna", "225|12": "Lynn", "4|12": "Night Lord", "2|12": "Arch Mage (F/P)", "31|12": "Demon Slayer", "23|12": "Mercedes",
                "1|12": "Hero", "204|12": "Kaiser", "33|12": "Wild Hunter", "221|12": "Adele", "227|12": "Sia", "209|22": "Demon Avenger", "212|12": "Shade", "215|12": "Blaster",
                "218|12": "Ark", "35|12": "Mechanic", "226|12": "Mo Xuan", "5|32": "Cannon Master", "14|12": "Night Walker", "21|12": "Aran", "2|32": "Bishop", "2|22": "Arch Mage (I/L)",
                "32|12": "Battle Mage", "208|12": "Xenon", "3|22": "Marksman", "15|12": "Thunder Breaker",  "1|22": "Paladin", "1|32": "Dark Knight", "5|12" : "Buccaneer", "5|22": "Corsair",
                "210|12": "Zero", "3|12": "Bowmaster", "223|12": "Lara", "205|12": "Angelic Buster", "3|32": "Pathfinder", "222|12": "Kain", "203|12": "Luminous", "214|12": "Kinesis",
                "24|12": "Phantom", "217|12": "Illium", "22|17": "Evan", "216|12": "Cadena", "12|12": "Blaze Wizard", "13|12": "Wind Archer", "220|12": "Hoyoung", "4|22": "Shadower",
                "224|12": "Khali", "4|34": "Blade Master", "11|12": "Dawn Warrior", "202|12": "Mihile"}

// Helper: Get job name based on ID and detail
function getJobName(jobID, jobDetail) {
  if (jobID == null || jobDetail == null) return null;
  let key = jobID + "|" + jobDetail;
  return JOB_IDs[key] || null;
}

// Extract ranks from API response
function takeRanks (resp){
    if (resp && resp.data && Array.isArray(resp.data.ranks)) {
        return resp.data.ranks;
}
    console.warn("Unexpected API shape: no data.ranks");
    return [];
}

// Function to find characer by the exact name
function findByExactName(rows, name){
    let target = (name || "").toLowerCase();
    for (let i = 0; i< rows.length; i++){
        let r = rows[i];
        if (r.characterName && r.characterName.toLowerCase() === target){
            return r;
    }
}
    return null;
}

// API endpoint to get profile information
app.get("/api/profile", async function (req, res) {
  try {
    // Inputs
    let name = req.query.name;

    let region;
    if (req.query.region) {
      region = req.query.region;
    } else {
      region = "na";
    }

    if (!name) {
      return res.status(400).json({ error: "Missing ?name=" });
    }

    let BASE = "https://www.nexon.com/api/maplestory/no-auth/ranking/v2/" + region;

    // Non heroic worlds (Bera & Scania)
    let overallRow = null;

    try {
        let nonHeroic = await axios.get(BASE, {
            headers: NEXON_HEADERS,
            params: { type: "overall", id: "weekly", reboot_index: 0, page_index: 1, character_name: name },
            timeout: 15000
        });

        let rowsNonHeroic = takeRanks(nonHeroic);
        let hitNonHeroic = findByExactName(rowsNonHeroic, name);
        if (hitNonHeroic) {
            overallRow = hitNonHeroic;
        }
    } catch (eNonHerioc) {}

    // Heroic worlds (Kronos & Hyperion)
    if (!overallRow) {
        try {
            let overallHeroic = await axios.get(BASE, {
                headers: NEXON_HEADERS,
                params: { type: "overall", id: "weekly", reboot_index: 1, page_index: 1, character_name: name },
                timeout: 15000
            });
            let rowsHeroic = takeRanks(overallHeroic);
            let hitHeroic = findByExactName(rowsHeroic, name);
            if (hitHeroic) {
                overallRow = hitHeroic;
                console.log("PROFILE lookup:", { name, region, hit: !!overallRow });
            }
        } catch (eHeroic) {}
    }
      if (!overallRow) {
      return res.status(404).json({ error: "Character not found" });
    }

    let legionRow = null;
    try {
        let legionResp = await axios.get(BASE, {
            headers: NEXON_HEADERS,
            params: { type: "legion", id: overallRow.worldID, page_index :1, character_name: name },
            timeout: 15000
        });
    let legionRows = takeRanks(legionResp);
    let legionHit = findByExactName(legionRows, name);
    if (legionHit) {
        legionRow = legionHit;
    }

} catch (eLegion) {}

    let worldNameOut = null;
    if (overallRow && typeof overallRow.worldID !== "undefined" && overallRow.worldID !== null){
        if (WORLD_LIST[overallRow.worldID]){
            worldNameOut = WORLD_LIST[overallRow.worldID];
        } else {
            worldNameOut = "World " + overallRow.worldID;
        }
    }

    let jobIDOut = null;
    if (overallRow && typeof overallRow.jobID !== "undefined" && overallRow.jobID !== null){
        jobIDOut = overallRow.jobID;
    }

    let jobDetailOut = null;
    if (overallRow && typeof overallRow.jobDetail !== "undefined" && overallRow.jobDetail !== null){
        jobDetailOut = overallRow.jobDetail;
    }

    let jobNameOut = null;
    if (overallRow && jobIDOut !== null && jobDetailOut !== null) {
        jobNameOut = getJobName(jobIDOut, jobDetailOut);
    if (!jobNameOut) {
        jobNameOut = "Job " + jobIDOut + " (Detail " + jobDetailOut + ")";
    }
    } else if (overallRow && jobIDOut !== null) {
        jobNameOut = "Job " + jobIDOut;
    }

    let levelOut = null;
    if (overallRow && typeof overallRow.level !== "undefined"){
        levelOut = overallRow.level;
    }
    
    let expOut = null;
    if (overallRow && typeof overallRow.exp !== "undefined"){
        expOut = overallRow.exp;
    }

    let legionLevelOut = null;
    if (legionRow && typeof legionRow.legionLevel !== "undefined"){
        legionLevelOut = legionRow.legionLevel;
    }

    let charName = null;
    if (overallRow && overallRow.characterName){
        charName = overallRow.characterName;
    } else {
        charName = name;
    }

    let charIMG = null;
    if (overallRow && overallRow.characterImgURL) {
        charIMG = overallRow.characterImgURL;
    } else if (legionRow && legionRow.characterImgURL) {
        charIMG = legionRow.characterImgURL;
    }
    console.log("PROFILE response:", {
    characterName: charName, level: levelOut, totalExp: expOut,
    worldName: worldNameOut, jobID: jobIDOut, jobDetail: jobDetailOut, jobName: jobNameOut
    });
    return res.json({
        characterName: charName,
        level: levelOut,
        totalExp: expOut,
        legionLevel: legionLevelOut,
        worldName : worldNameOut,
        jobID: jobIDOut,
        jobDetail: jobDetailOut,
        jobName: jobNameOut,
        characterImg: charIMG
    });

    } catch (err){
        if (err && err.response){
            return res.status(err.response.status).json({
                error: err.response.statusText,
                details: err.response.data
            });
        }
        return res.status(500).json({ error: "Internal server error", details: String(err) });
    }
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log("listening on http://localhost:" + PORT));