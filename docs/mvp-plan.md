# Ultimate Line Caller One-Game Prototype

## Summary

Build a touch-first React/Vite web app for iPad that validates the core sideline flow: create a roster, assign each player to one of two gender categories, select seven players for a point, log whether we or the opponent scored, and show score plus player point counts.

The current spreadsheet has a broader tournament system with `Template`, `G1`-`G7`, `Tourn_Summary`, and `Print_Stats` sheets. It handles ratio rows, point columns, score formulas, O/D counts, stats, and timeout notes. This prototype intentionally implements only the smallest useful slice.

Stack:

- React + TypeScript + Vite
- Plain CSS, no UI framework
- Local browser storage only
- Vitest for logic tests
- Local dev server from the Mac, opened on iPad over same Wi-Fi

## Key Changes

- Create a standalone app at `/Users/sumon/code/ultimate-line-caller`.
- Core screens:
  - `Roster Setup`: add/edit/delete players, set category as `MMP` or `FMP`, mark active/inactive.
  - `Game Setup`: choose starting possession and point-one ratio, either `4 MMP / 3 FMP` or `3 MMP / 4 FMP`.
  - `Point Logger`: show current score, point number, current O/D, required ratio, selected line, and grouped player buttons.
  - `Summary`: show each player's total points played and O/D split.
- Core actions:
  - Select/unselect players for the current line.
  - Warn if line does not have exactly seven players.
  - Warn if selected line does not match the required gender ratio.
  - Log point as `Us scored` or `Opponent scored`.
  - Undo last point.
  - Persist roster/game state across page reloads.
- Derived behavior:
  - Score comes from logged point outcomes.
  - First point O/D comes from game setup.
  - After we score, next point starts on defense.
  - After the opponent scores, next point starts on offense.
  - Point counts come from logged line selections.
  - Suggestions show lowest-total active players in each category, but the user still manually chooses the line.

## Out Of Scope

- Multi-game tournament summary
- Export/share
- Goals, assists, blocks, turns
- Timeouts
- Field side tracking
- Half-cap / hard-cap logic
- Native iPad packaging
- Electron

## Interfaces And Types

Use these TypeScript shapes as the first implementation contract:

```ts
type GenderCategory = "MMP" | "FMP";
type Possession = "offense" | "defense";
type PointOutcome = "us" | "opponent";

type Player = {
  id: string;
  name: string;
  genderCategory: GenderCategory;
  active: boolean;
};

type GameSettings = {
  startingPossession: Possession;
  startingMmpCount: 3 | 4;
};

type PointLogEntry = {
  id: string;
  pointNumber: number;
  linePlayerIds: string[];
  startingPossession: Possession;
  requiredMmpCount: 3 | 4;
  outcome: PointOutcome;
  createdAt: string;
};

type AppState = {
  players: Player[];
  gameSettings: GameSettings | null;
  pointLog: PointLogEntry[];
};
```

Persist `AppState` as one versioned localStorage key, e.g. `ultimate-line-caller:v1`.

## Test Plan

- Score derives correctly from point outcomes.
- Next possession derives correctly after each point.
- Required MMP/FMP ratio alternates each point from the configured start.
- Player total counts and O/D counts derive from point log.
- Undo removes the last point and recalculates score/counts.
- Invalid lines are detected: fewer/more than seven, wrong ratio, inactive player.
- Manual iPad flow:
  - Add at least 10 MMP and 10 FMP players.
  - Start a game.
  - Select a valid seven-player line.
  - Log `Us scored`; confirm score, next O/D, and player counts update.
  - Log `Opponent scored`; confirm score and next O/D update.
  - Reload page; confirm state remains.
  - Undo; confirm score/counts revert.

## Setup

Local setup on the Mac:

```bash
cd /Users/sumon/code/ultimate-line-caller
npm create vite@latest . -- --template react-ts
npm install
npm install -D vitest
npm run dev -- --host 0.0.0.0
```

Mac testing:

```text
http://localhost:5173
```

iPad testing:

- Put iPad and Mac on the same Wi-Fi.
- Find the Mac's local IP.
- Open `http://<mac-local-ip>:5173`.

No Xcode, Electron, App Store account, backend, database, or Google API setup is needed for this prototype.

## Assumptions

- Use spreadsheet terminology `MMP` and `FMP` for now.
- A line is always exactly seven players.
- Mixed ratio alternates every point between `4/3` and `3/4`.
- One active game exists at a time.
- Local browser storage is acceptable for the prototype.

