# MapleTracker

A personal boss-run tracker for MapleStory. Log your weekly boss clears across multiple characters, track meso earnings, and save item drops — all stored locally in your browser.

![MapleTracker](public/images/comm_stonks.png)

## Features

- **Character Roster** — Add characters by name and region; pulls live stats (level, job, legion, world) from the Nexon API
- **Boss Tracking** — Bosses with multiple difficulty levels, meso calculations, and item drops
- **Party Support** — Auto-calculates meso-per-member for party sizes 1–6
- **Presets** — Save and load boss configurations per character for quick weekly setup
- **Weekly Logs** — Summarize and archive each week's runs with total meso and drops earned
- **Multi-Character** — Switch between characters and track bosses independently for each
- **Local Storage** — All data is saved in your browser; no account or server database required

## Getting Started

### Prerequisites

- Node.js `>=18 <=22`

### Install & Run

```bash
# Install dependencies
npm install

# Development (live-reload enabled)
npm run dev

# Production
npm start
```

The app runs at `http://localhost:3000` by default.

## Usage

1. **Add a character** on the main roster page (`/`) — enter the character name and select your region (NA or EU)
2. Go to the **Boss Tracker** (`/bosses.html`) and select which characters to display
3. Click a boss card to log a clear — choose difficulty, party size, and any item drops
4. Completed bosses are greyed out; edit or re-submit at any time
5. Use **Save Preset** to store your usual boss list for a character
6. At the end of the week, click **Log Week** to archive the summary, then reset for the next reset

## Tech Stack

- **Backend**: Node.js, Express v5
- **Frontend**: Vanilla JS (ES6 modules), HTML5, CSS3
- **Data**: Browser localStorage
- **External API**: [Nexon MapleStory Ranking API](https://www.nexon.com) (no auth required)