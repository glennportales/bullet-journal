# Bullet Journal

A local-only Electron + SQLite application that implements a digital bullet journal with rapid logging, index, monthly/daily views, collections, trackers, and JSON export.

## Getting Started

1. Install dependencies:

```bash
npm install
```

2. Start the application:

```bash
npm start
```

The Electron window will open with a minimalist notebook interface. Data is stored locally inside your system's Electron user data directory.

## Features

- Rapid logging for tasks, events, and notes using bullet journal syntax.
- Daily and monthly log views with migration shortcuts.
- Searchable index sidebar for quick lookup of entries.
- Collections with entry assignment and quick overview.
- Boolean and numeric trackers with per-day logging.
- JSON export of entries, collections, and tracker history.
- Light/dark theme support respecting OS preference.

## Data Export

Use the **Export** button to save a JSON snapshot of your journal. The exported file contains entries, collections with their associated entries, and tracker values with timestamps.

## Development

- The SQLite database is created at runtime inside Electron's `userData` directory (`journal.db`).
- Database schema is defined in `src/db.js`.
- Renderer logic lives in `src/renderer.js` and communicates with the main process through the secure preload bridge (`preload.js`).

