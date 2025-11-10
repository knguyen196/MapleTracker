// Declare array to hold character roster
let roster = loadRoster();
let activeKey = loadActiveKey();
//Declaring active key

// Grab references from DOM
let addBtn = document.getElementById("addCharBtn");
let charInput = document.getElementById("charName");
let charList = document.getElementById("charactersList");
let activeChar = document.getElementById("activeChar");
let regionSel = document.getElementById("region");
let cardsList = document.getElementById("cardsList");


// Initial rendering of character list
renderCharacters();
let initialActive = roster.find(x => x.key === activeKey);
if (initialActive && activeChar) {
  activeChar.textContent = `Active character: ${initialActive.characterName}`;
}

// Adds event listener to "Add Character" button
addBtn.addEventListener("click", function() {
    let name = (charInput.value || "").trim();
    if (!name) {
        // Check for duplicates
        alert("Please enter a valid character name.");
        return;
    }
    let region = getRegion();
    fetchProfile(name, region);
});

function fetchProfile(name, region){
    let url = new URL("/api/profile", window.location.origin);
    url.searchParams.set("name", name);
    url.searchParams.set("region", region);

    setLoading(true);

    fetch(url.toString())
    .then(function(res) {
        if (!res.ok){
            throw new Error(res.status + " " + res.statusText);
    }
    return res.json();
})
    .then(function(m) {
        console.log("Fetched profile:", m);
        setLoading(false);
        addToRoster(m, region);
        charInput.value = "";
    })

    .catch(function(err){
        setLoading(false);
        alert("Error fetching profile: " + err.message);
    });
}

// Adds character to roster
function addToRoster(m, region){
    let key = makeKey(m.characterName, region);
    
    let exists = false;
    for (let i = 0; i < roster.length; i++){
        if (roster[i].key === key){
            exists = true;
            break;
        }
    }
    if (exists){
        alert("Character already in roster.");
        return;
    }

    let charData = {
        key: key,
        region: region,
        characterName: m.characterName || "Unknown",
        level: m.level || null,
        totalExp: m.totalExp || null,
        legionLevel: m.legionLevel || null,
        worldName: m.worldName || null,
        jobName: m.jobName || null,
        jobID: m.jobID || null,
        jobDetail: m.jobDetail || null,
        characterImg: m.characterImg || null
    };

    roster.push(charData);
    saveRoster();
    renderCharacters();
}


function renderCharacters(){

    cardsList.innerHTML = "";

    //If roster is empty, shows a message
    if (!roster.length){
        let empty = document.createElement("div");
        empty.textContent = "No characters added yet";
        cardsList.appendChild(empty);
        return;
    }

    // Loops through each character in the roster
    for (let i = 0; i < roster.length; i++){
        let r = roster[i];

        let charCard = document.createElement("div");
        charCard.className = "charCard";
        if (activeKey && activeKey === r.key) {
            charCard.classList.add("active");
        }

        charCard.addEventListener("click", function(){
            let current = cardsList.querySelector(".active");
            if (current) {
                current.classList.remove("active");
            }
            this.classList.add("active");
            activeKey = r.key;
            saveActiveKey(activeKey);
            activeChar.textContent = `Active character: ${r.characterName}`;
        });

        if (r.characterImg){
            let charIMG = document.createElement("img");
            charIMG.className = "characterImg";
            charIMG.src = r.characterImg;
            charIMG.alt = "Character Image";
            charCard.appendChild(charIMG);
        }

        let charInfo = document.createElement("div");
        charInfo.className = "charInfo";
        let cardTitle = document.createElement("div");
        cardTitle.className = "cardTitle";
        cardTitle.textContent = r.characterName || "Unknown";
        charInfo.appendChild(cardTitle);

        let lvlandExp = document.createElement("div");
        lvlandExp.innerHTML =
            "Level " + safeNum(r.level) + "<br>EXP " + safeNum(r.totalExp); 
        charInfo.appendChild(lvlandExp);

        if (r.legionLevel != null) {
        let legionDiv = document.createElement("div");
        legionDiv.textContent = "Legion Level: " + safeNum(r.legionLevel);
        charInfo.appendChild(legionDiv);
        }

        let worldJob = document.createElement("div");
        let parts = [];
        if (r.worldName) parts.push(r.worldName);
        
        let mappedName = r.jobName;
        if (mappedName) {
            parts.push(mappedName);
        } else if (r.jobID != null) {
            let label = "Job " + r.jobID;
        if (r.jobDetail != null) {
            label = label + " (Detail " + r.jobDetail + ")";
        }
        parts.push(label);
    }
        let regionText;
        regionText = r.region.toUpperCase();
        parts.push(regionText);
        worldJob.textContent = parts.join(" • ");
        charInfo.appendChild(worldJob);
    
    charCard.appendChild(charInfo);

    let removeBtn = document.createElement("button");
    removeBtn.className = "removeBtn";
    removeBtn.type = "button";
    removeBtn.textContent = "🗑️";
    removeBtn.addEventListener("click", (e) =>{
        e.stopPropagation();
        let removingActive = activeKey === r.key;
        makeRemoveHandler(r.key)();
        if (removingActive){
            if (roster && roster.length > 0){
                activeKey = roster[0].key;
            } else {
                activeKey = null;
            }
            saveActiveKey(activeKey);
            let nextActive = null;
            for (let i = 0; i < roster.length; i++){
                if (roster[i].key === activeKey){
                    nextActive = roster[i];
                    break;
                }
            }
            if (nextActive){
                activeChar.textContent = "Active character: " + nextActive.characterName;
            } else {
                activeChar.textContent = "Active Character:";
            }
            renderCharacters();
        }
    });
    charCard.appendChild(removeBtn);
    cardsList.appendChild(charCard);
    }
}

// Displays number in a more readable format
function safeNum(x) {
  if (x === null || typeof x === "undefined") {
    return "--";
  }
  let n = Number(x);
  if (isNaN(n)) {
    return String(x);
  }
  return n.toLocaleString();
}

// Generates a unique key for each character based on name and region
function makeKey(name, region){
    let nameKey = (name || "").toLowerCase();
    let regionKey = (region || "").toLowerCase();
    return nameKey + "|" + regionKey;
}

function makeRemoveHandler(key){
    return function() {
    for (let i = 0; i < roster.length; i++){
        if (roster[i].key === key){
            roster.splice(i, 1);
            saveRoster();
            renderCharacters();
            break;
            }
        }
    };
}

// Fetches character profile from localstorage
function loadRoster(){
    try {
        let raw = localStorage.getItem("mapleRoster");
        if (!raw){
            return [];
        }
        let data = JSON.parse(raw);
        if (!Array.isArray(data)){
            return [];
    }
    return data;
}catch (e){
    return [];
    }
}

// Saves character roster to localstorage
function saveRoster(){
    try{
    localStorage.setItem("mapleRoster", JSON.stringify(roster));
    } catch (e){
    }
}

function setLoading(on){
    let id = "loadingRow";
    let el = document.getElementById(id);
    if (on){
        if (!el){
            el = document.createElement("div");
            el.id = id;
            el.textContent = "Loading...";
            cardsList.prepend(el);
        }
    } else {
        if (el && el.parentNode){
            el.parentNode.removeChild(el);
        }
    }
}

function getRegion(){
    let val = "na";
    if (regionSel && regionSel.value){
        val = regionSel.value;
    }

    val = String(val).toLowerCase();
    return val;
}

function saveActiveKey(key) {
  try { localStorage.setItem("mapleActiveKey", key || ""); } catch {}
}
function loadActiveKey() {
  try { return localStorage.getItem("mapleActiveKey") || null; } catch { return null; }
}

// Refresh related functions

function upsertRosterEntry(m, region){
    let key = makeKey(m.characterName, region);
    let found = false;
    for (let i =0; i< roster.length; i++){
        if (roster[i].key === key){

                roster[i] ={
                    ...roster[i],
                    ...m,
                    lastFetchedAt: Date.now(),
                    key,
                    region
             };
                found = true;
                break;
    }
}
    if (!found){
        addToRoster(m, region);
    } else {
        saveRoster();
        renderCharacters();
    }
}

function refreshProfile(name, region){
    let url = new URL("/api/profile", window.location.origin);
    url.searchParams.set("name", name);
    url.searchParams.set("region", region);

    return fetch(url.toString())
    .then(function(res) {
        if (!res.ok){
            throw new Error(res.status + " " + res.statusText);
        }
        return res.json();
    })
    .then(function(m){
        upsertRosterEntry(m, region);
        return m;
    })
    .catch(function(err){
        console.warn("Error refreshing for", name , region, err.message);
    });
}
    (async () => {
        if (roster && roster.length){
            console.log ("Initial refresh on app load");
            for (let i =0; i< roster.length; i++){
                let r = roster[i];
                await refreshProfile(r.characterName, r.region);
                await new Promise(res => setTimeout(res, 400));
            }
        console.log("Initial refresh done");
        }
    })();
