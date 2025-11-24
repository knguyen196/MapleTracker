<!-- .github/copilot-instructions.md: Guidance for AI coding agents working on MapleTracker -->
# MapleTracker — quick instructions for AI coding agents

This repo is a small single-node Express app with a static frontend in `public/`. The server proxies profile lookups to Nexon's public ranking API and the frontend stores a local roster in `localStorage`. Keep changes minimal and focused: the app is small and intentionally plain (no bundlers or frameworks).

Key files
- `server.js` — Express server. Serves `public/` and exposes GET `/api/profile` which proxies Nexon ranking endpoints. Important constants:
  - `NEXON_HEADERS`, `WORLD_LIST`, `JOB_IDs` (job ID -> name map). Update `JOB_IDs` here when adding job name mappings.
- `public/index.html` + `public/script.js` — Roster UI. Uses `localStorage` keys `mapleRoster` (array) and `mapleActiveKey` (string). `script.js` implements `fetch('/api/profile?name=...&region=...')` and expects the JSON shape described below.
- `public/bosses.html` + `public/bosses.js` — Boss tracker UI. Boss definitions live in `BOSS_INFO` in `bosses.js` and images live in `public/images/`.

Big-picture architecture
- Static frontend in `public/` served by Express (`express.static`). No build step.
- Server acts as a thin proxy/adapter to Nexon's ranking API. It performs two-phase lookups (reboot_index 0 then 1) to find a character and optionally a legion lookup. The server normalizes the API shape into a small profile object returned to the client.
- Client stores roster locally and periodically refreshes profiles on load (throttled with small delays).

Developer workflows
- Install & run locally:
  ```bash
  npm install
  npm start      # runs node server.js, default PORT=3000
  ```
  The server uses `livereload` + `connect-livereload` (dev deps) to refresh the browser on public/ changes.
- Environment: server honors `PORT` environment variable.

API contract (what `/api/profile` accepts & returns)
- Query params: `?name=CharacterName&region=na|eu` (client sends lowercase region returned by `getRegion()` in `script.js`).
- Success JSON (fields client expects):
  - characterName (string), level (number|null), totalExp (number|null), legionLevel (number|null), worldName (string|null), jobID (number|null), jobDetail (number|null), jobName (string|null), characterImg (string|null)
- Errors: 404 for not-found, 4xx for upstream Nexon errors, 500 for server errors. Client shows alerts on fetch failure.

Project-specific conventions & patterns
- Key format: roster items use `key = (name).toLowerCase() + '|' + (region).toLowerCase()` — see `makeKey()` in `public/script.js`. Use this when editing roster logic.
- localStorage shape: `mapleRoster` is an array of objects with properties shown above (see `addToRoster()`/`upsertRosterEntry()` in `script.js`). When changing fields, update both `script.js` and any UI renderers.
- No ES modules or transpilation: files are loaded directly via `<script src=... defer>`. Keep code ES5/ES2015-compatible for broad Node/browser support.
- Job name mapping is done server-side (see `JOB_IDs`). Prefer updating the map there over client-side hacks.

Integration notes & gotchas
- Nexon API: requests include a custom `User-Agent` and 15s axios timeout. Upstream API shape can change; the server defensively checks `resp.data.ranks` before using it.
- `express-rate-limit` is listed in `package.json` but not currently used in `server.js`. If adding rate limiting for `/api/profile`, add it near the route registration.
- `livereload` is wired into the server; changes to `public/` trigger browser refresh during development.

Examples (concrete)
- Client call: `GET /api/profile?name=Alice&region=na`
- Example response (successful):
  ```json
  {
    "characterName":"Alice",
    "level":250,
    "totalExp":1234567890,
    "legionLevel":10,
    "worldName":"Kronos",
    "jobID":206,
    "jobDetail":12,
    "jobName":"Hayato",
    "characterImg":"https://example.com/avatar.png"
  }
  ```

Where to make common changes
- Add/rename boss definitions: `public/bosses.js` -> `BOSS_INFO` and add images to `public/images/`.
- Update profile normalization or job mapping: `server.js` (search for `JOB_IDs`, `WORLD_LIST`, and the `/api/profile` handler).
- Change roster UI/ordering: `public/script.js` (look for `renderCharacters`, `addToRoster`, `upsertRosterEntry`).

If anything in this doc is unclear or you'd like examples for a particular change (e.g. adding rate-limiting, caching Nexon results, or adding a new UI screen), tell me which area and I'll update this file with step-by-step edits.
