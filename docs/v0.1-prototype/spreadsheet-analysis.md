# Current Spreadsheet Analysis

> Version 0.1 prototype note: This document supported the version 0.1 prototype by analyzing the legacy spreadsheet workflow. It is preserved as historical context for the 1.0 roadmap.


Source sheet:

```text
https://docs.google.com/spreadsheets/d/1wDIutgBiVxci7bERO_iCAdgUxw1lgHA4/edit?gid=1156471560#gid=1156471560
```

An exported workbook copy is saved at `reference/ultimate-lines-sheet.xlsx`.

## Workbook Shape

Tabs found:

- `Tourn_Summary`
- `Sheet4`
- `Template`
- `G1`
- `G2`
- `G3`
- `G4`
- `G5`
- `G6`
- `G7`
- `Print_Stats`

## Current Spreadsheet Workflow

The spreadsheet is built around one tournament summary plus up to seven game tabs.

- `Tourn_Summary` aggregates player points played, O points, D points, O/D rating, hold/break efficiency, and per-game counts.
- Each game sheet has point columns from roughly `D` through `AD`.
- Rows near the top track starting O/D, score, half cap, and the required MMP/FMP ratio for each point.
- Player rows are split into two groups:
  - MMP players around rows `9`-`21`
  - FMP players around rows `25`-`37`
- Per-point line selection is represented by marking players in the point column.
- Score is derived from outcome rows:
  - `Goal`
  - `Assist`
  - `Opp Goal`
- Per-player point counts are calculated from the line-selection grid.
- Later rows track optional stats and timeout notes.

## Important Mechanics To Preserve Later

- Starting possession matters for point one.
- The next point's O/D state follows the previous point result.
- Required MMP/FMP ratio alternates by point.
- Each player needs total points played plus O-point and D-point counts.
- Tournament summary depends on accumulating counts across games.

## Prototype Slice

For the first app prototype, implement only:

- roster setup
- MMP/FMP assignment
- one active game
- line selection
- point outcome logging
- score derivation
- player point counts
- O/D split by player
- undo last point
- local persistence

Leave tournament aggregation, export, stats, timeout tracking, and cap logic for later.

