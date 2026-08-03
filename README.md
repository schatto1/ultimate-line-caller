# Ultimate Line Caller

Touch-first iPad web app idea for replacing the team's ultimate line-calling spreadsheet.

## Current Build: 0.1 Prototype

This directory contains the first sideline prototype:

- create a roster
- assign each player as `MMP` or `FMP`
- select seven players for a point
- log whether we or the opponent scored
- show score and player point counts
- undo the last point
- persist state locally in the browser

## Project Contents

- `src/App.tsx`: React UI and event handlers
- `src/model.ts`: shared types, local storage, and game rules
- `src/model.test.ts`: core behavior tests
- `docs/1.0-direction-checklist.md`: living direction and checklist for the 1.0 release
- `docs/v0.1-prototype/mvp-plan.md`: implementation-ready plan for the 0.1 prototype
- `docs/v0.1-prototype/architecture.md`: short note on the simplified 0.1 prototype app structure
- `docs/v0.1-prototype/spreadsheet-analysis.md`: notes from the legacy spreadsheet structure used for prototype planning
- `reference/ultimate-lines-sheet.xlsx`: exported copy of the current Google Sheet
- `tools/inspect-ultimate-lines-xml.py`: utility used to inspect the exported workbook

## Recommended Stack

- React + TypeScript + Vite
- Plain CSS for the first version
- Local browser storage only
- Vitest for calculation/state tests
- iPad testing through Safari on the same Wi-Fi as the dev machine

Installed packages are not app source. `node_modules/` is ignored for future
installs.

## Next Build Step

Install dependencies and run the app:

```bash
npm install
npm run dev -- --host 0.0.0.0
```

Then open `http://localhost:5173` on the Mac, or `http://<mac-local-ip>:5173` on the iPad.
