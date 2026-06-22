# Function And Method Explainer

This document explains the first-party functions, component helpers, test helpers,
and notable framework method calls in the Ultimate Line Caller app. Generated
files in `dist/` and dependencies in `node_modules/` are intentionally excluded.

## `src/App.tsx`

`samplePlayers`

- A seed list of placeholder roster entries split into `MMP` and `FMP`
  categories. It is data, not a function, but it feeds `createSampleRoster`.

`createSampleRoster()`

- Converts `samplePlayers` into real `Player` records.
- Adds a generated `player_...` id with `createId("player")`.
- Marks every sample player as active.
- Used by the sample-roster button to quickly populate the app for testing or
  demos.

`classNames(...names)`

- Small CSS-class helper.
- Accepts strings plus falsey values such as `false`, `null`, or `undefined`.
- Removes falsey entries and joins the remaining class names with spaces.
- Used where CSS classes are conditional, such as selected/inactive player
  buttons.

`App()`

- The root React component for the whole app.
- Owns the main state:
  - `state`: persisted `AppState`, loaded from local storage on first render.
  - `newPlayerName`: text currently typed into the add-player input.
  - `newPlayerCategory`: category for the next player being added.
  - `draftSettings`: starting possession and first-point ratio before a game
    starts.
  - `selectedLineIds`: player ids selected for the current point.
- Persists `state` to local storage with a `useEffect` every time it changes.
- Derives display data from domain helpers:
  - player summaries from `summarizePlayers`.
  - score from `getScore`.
  - point number from `getPointNumber`.
  - current possession from `getCurrentPossession`.
  - required ratio from `getRequiredMmpCount`.
  - validation messages from `validateLine`.
  - suggested line from `getSuggestedLine`.
- Renders the score band, roster editor, game setup/line caller, count table,
  and point log.

`addPlayer()`

- Trims `newPlayerName`.
- Does nothing when the name is empty.
- Appends a new active `Player` with a generated id and the currently selected
  `newPlayerCategory`.
- Clears the name input after adding.

`updatePlayer(id, patch)`

- Applies a partial update to one player.
- Keeps all other players unchanged.
- Used by the roster name input, category select, and active checkbox.

`deletePlayer(id)`

- Removes the player from the currently selected line.
- Removes the player from the roster.
- Removes that player's id from any historical `pointLog` line selections so
  old log entries do not point at a deleted player.

`startGame()`

- Copies the current `draftSettings` into `state.gameSettings`.
- Clears any existing point log, making this a fresh game.
- Clears the current line selection.

`resetGame()`

- Clears the point log.
- Sets `gameSettings` back to `null`, which puts the app back into pre-game
  setup mode.
- Clears the current line selection.

`togglePlayerForLine(player)`

- Ignores inactive players.
- If the player is already selected, removes them from the selected line.
- If seven players are already selected, drops the oldest selected player and
  adds the new one.
- Otherwise appends the player to the selected line.

`logPoint(outcome)`

- Does nothing unless a game has started and the current selected line is valid.
- Builds a `PointLogEntry` with `createPointLogEntry`, passing the current game
  settings, existing point log, selected line, and point outcome.
- Appends the new point to the log.
- Clears the selected line for the next point.

`undoLastPoint()`

- Removes the last point from `pointLog`.
- All score, possession, ratio, and player-count displays then recalculate from
  the shorter log.

`loadSampleRoster()`

- Replaces the roster with a freshly generated sample roster.
- Clears the point log because the old log may refer to replaced player ids.
- Clears the selected line.

`resetEverything()`

- Deletes the saved local-storage state with `clearSavedState`.
- Resets the in-memory app state to an empty roster, no game settings, and no
  point log.
- Clears the selected line.

Inline form and button handlers

- The add-player form's `onSubmit` prevents the browser's default form submit
  and calls `addPlayer`.
- Roster input/select/checkbox handlers call `updatePlayer` with the changed
  field.
- Game setup segmented-control handlers update `draftSettings`.
- Line action handlers fill the selected line with `suggestedLine` or clear it.
- Result buttons call `logPoint("us")` or `logPoint("opponent")`.

`Segmented({ value, options, onChange, disabled })`

- Reusable segmented-control component.
- Renders each option as a button.
- Marks the button matching `value` as active.
- Calls `onChange(option.value)` when a segment is clicked.
- Disables the whole control when `disabled` is true.

`StatusTile({ label, value })`

- Small display component for top-band stats such as point number, possession,
  ratio, and active player count.

`PlayerGroup({ title, players, selectedLineIds, suggestedLineIds, summaries, onToggle })`

- Renders one category group, either `MMP` or `FMP`.
- Builds a `summaryById` lookup so each player button can show total, offense,
  and defense counts.
- Shows how many players in the group are active.
- Renders each player as a button with conditional classes:
  - `selected` when already on the current line.
  - `suggested` when included in the suggested line but not selected.
  - `inactive` when unavailable.
- Calls `onToggle(player)` when an active player button is clicked.

`possessionLabel(possession)`

- Converts internal possession values to compact display labels.
- Returns `O` for `"offense"` and `D` for `"defense"`.

## `src/domain.ts`

`emptyState`

- The canonical empty `AppState`.
- Used when there is no saved state or saved state cannot be trusted.

`createId(prefix)`

- Creates ids like `player_<uuid>` or `point_<uuid>`.
- Uses `crypto.randomUUID()` when the browser supports it.
- Falls back to a timestamp plus random base-36 suffix.

`oppositeMmpCount(count)`

- Flips the mixed-ratio MMP count.
- Returns `3` when given `4`, and `4` when given `3`.

`getRequiredMmpCount(pointNumber, startingMmpCount)`

- Calculates the required MMP count for a point.
- Odd-numbered points use the configured starting count.
- Even-numbered points use `oppositeMmpCount`.
- The FMP count is always `7 - requiredMmpCount`.

`getScore(pointLog)`

- Reduces all logged points into `{ us, opponent }`.
- Increments `us` for points where `outcome === "us"`.
- Increments `opponent` for every other logged outcome.

`getCurrentPossession(gameSettings, pointLog)`

- Determines whether the next point starts on offense or defense.
- If no points have been logged, uses `gameSettings.startingPossession`.
- After a point we scored, the next point starts on defense.
- After an opponent point, the next point starts on offense.

`getPointNumber(pointLog)`

- Returns the next point number.
- It is always `pointLog.length + 1`.

`countLineCategories(players, linePlayerIds)`

- Builds a player lookup by id.
- Counts selected player ids by `genderCategory`.
- Ignores unknown ids because they do not resolve to a player.
- Returns an object shaped like `{ MMP, FMP }`.

`validateLine(players, linePlayerIds, requiredMmpCount)`

- Checks whether the selected line can be logged.
- Reports an error when the line is not exactly seven players.
- Reports an error when the MMP count does not match `requiredMmpCount`.
- Reports an error when the FMP count does not match `7 - requiredMmpCount`.
- Reports an error if any selected player is inactive.
- Returns an empty array for a valid line.

`summarizePlayers(players, pointLog)`

- Computes one `PlayerSummary` per player.
- Counts total logged points played by checking whether each point includes the
  player's id.
- Splits those totals into offense and defense counts based on each logged
  point's `startingPossession`.
- Sorts active players before inactive players.
- Within that, sorts lower total counts first, then by player name.

`getSuggestedLine(players, pointLog, requiredMmpCount)`

- Starts from `summarizePlayers`, filtered to active players only.
- Picks the lowest-total active MMP players needed for the current ratio.
- Picks the lowest-total active FMP players needed for the current ratio.
- Returns the chosen player ids in MMP-then-FMP order.

`createPointLogEntry(params)`

- Creates one immutable point-log record for a logged point.
- Calculates the next point number from the existing log.
- Copies `linePlayerIds` so later UI changes do not mutate the saved point.
- Stores the starting possession for that point.
- Stores the required MMP count for that point.
- Stores the outcome and creation timestamp.

## `src/storage.ts`

`STORAGE_KEY`

- Versioned browser local-storage key for this prototype:
  `ultimate-line-caller:v1`.

`isState(value)`

- Runtime type guard for loaded JSON.
- Confirms the value is an object with:
  - `players` as an array.
  - `pointLog` as an array.
  - a `gameSettings` property.
- It is intentionally lightweight; it protects against completely wrong shapes
  but does not deeply validate every nested field.

`loadState()`

- Reads the saved JSON string from `localStorage`.
- Returns `emptyState` when nothing is saved.
- Parses the saved JSON and returns it only when `isState` accepts it.
- Catches storage or JSON parsing failures and falls back to `emptyState`.

`saveState(state)`

- Serializes the full `AppState` as JSON.
- Writes it to `localStorage` under `STORAGE_KEY`.

`clearSavedState()`

- Removes the app's saved local-storage entry.

## `src/types.ts`

This file defines TypeScript types only. It has no runtime functions or methods.

`GenderCategory`

- The two roster categories supported by the app: `"MMP"` and `"FMP"`.

`Possession`

- The two point-start states: `"offense"` and `"defense"`.

`PointOutcome`

- The two scoring outcomes for a point: `"us"` and `"opponent"`.

`Player`

- Roster entry shape: id, display name, gender category, and active flag.

`GameSettings`

- Per-game setup: starting possession and whether point one starts with 3 or 4
  MMP.

`PointLogEntry`

- Historical record for one logged point.
- Includes the selected line, point number, starting possession, required ratio,
  outcome, and timestamp.

`AppState`

- Persisted top-level app state: roster, optional game settings, and point log.

`PlayerSummary`

- Derived count row for a player: total points, offense points, and defense
  points.

## `src/main.tsx`

`createRoot(document.getElementById("root")!).render(...)`

- Finds the `#root` element from `index.html`.
- Creates a React root for that DOM node.
- Renders the app inside React `StrictMode`.
- Imports `styles.css` so Vite includes the app stylesheet.

There are no first-party functions declared in this file.

## `src/styles.css`

This file defines styling only. It has no functions or methods.

The CSS classes are consumed by `App.tsx` components and cover the app shell,
sticky score band, panels, roster rows, segmented controls, player buttons,
validation states, result buttons, summary table, point log, and responsive
layouts.

## `src/vite-env.d.ts`

This file contains a Vite type-reference directive only. It has no functions or
methods.

The directive enables Vite-provided client types, such as `import.meta` typing,
for TypeScript.

## `src/domain.test.ts`

`players`

- Shared test roster with active MMP/FMP players and one inactive FMP player.

`settings`

- Shared test game settings: starting on offense with 4 MMP on point one.

`point(index, outcome, startingPossession, linePlayerIds)`

- Test helper that creates a deterministic `PointLogEntry`.
- Defaults to a valid 4 MMP / 3 FMP line.
- Lets individual tests override outcome, possession, and line selection without
  repeating the full point object every time.

`describe("domain logic", ...)`

- Groups the domain-layer unit tests.

Individual `it(...)` test cases

- `"derives score from point outcomes"` checks `getScore`.
- `"derives next possession from previous point result"` checks first-point,
  after-us-score, and after-opponent-score possession behavior.
- `"alternates ratio from the starting point"` checks `getRequiredMmpCount`.
- `"validates count, ratio, and inactive players"` checks line-size, ratio, and
  inactive-player validation messages.
- `"summarizes player total, offense, and defense counts"` checks
  `summarizePlayers`.
- `"creates a point log entry from the current game state"` checks
  `createPointLogEntry` for first and second points.

## `vite.config.ts`

`defineConfig({ plugins: [react()] })`

- Vite helper call that provides typed configuration.
- Enables the React plugin so Vite can handle React JSX/TSX and React refresh in
  development.

There are no first-party functions declared in this file.

## `tools/inspect-ultimate-lines-xml.py`

This script inspects an exported `.xlsx` workbook by reading the underlying XML
files from the spreadsheet zip archive. It was used to understand the original
spreadsheet.

`XLSX`

- Absolute path to the workbook copy the script expects to inspect.

`NS`

- XML namespace map used in XPath-style lookups.

`col_index(cell_ref)`

- Extracts column letters from an Excel cell reference such as `AD12`.
- Converts those letters to a 1-based column number.
- Example: `A` becomes `1`; `Z` becomes `26`; `AA` becomes `27`.

`row_index(cell_ref)`

- Extracts the row number from an Excel cell reference.
- Example: `AD12` becomes `12`.

`load_shared_strings(zf)`

- Reads `xl/sharedStrings.xml` from the workbook archive.
- Collects all shared string entries into a list.
- Joins rich-text parts together when a string is split across multiple XML
  text nodes.
- Returns the list so cells with shared-string indexes can be rendered as text.

`load_sheet_map(zf)`

- Reads `xl/workbook.xml` to find sheet names and relationship ids.
- Reads `xl/_rels/workbook.xml.rels` to map relationship ids to worksheet XML
  paths.
- Returns a dictionary like `{ "Template": "xl/worksheets/sheet3.xml" }`.

`cell_value(cell, shared)`

- Extracts a readable value and optional formula from one worksheet cell XML
  element.
- Handles shared strings, inline strings, and raw values.
- Returns a tuple of `(rendered_value, formula_text_or_none)`.

`print_sheet(zf, shared, name, path, max_row=120, max_col=60)`

- Reads a worksheet XML file from the archive.
- Prints the sheet name, XML path, and declared dimension.
- Iterates over cells up to `max_row` and `max_col`.
- Converts each cell reference to row/column numbers with `row_index` and
  `col_index`.
- Prints non-empty cell values and formulas grouped by row.

Top-level `with zipfile.ZipFile(XLSX) as zf`

- Opens the workbook archive.
- Loads shared strings and the sheet-name-to-path map.
- Prints the sheet map.
- Prints selected sheets: `Template`, `G1`, `G2`, `Tourn_Summary`, and
  `Print_Stats`.

## `index.html`

This file has no app-defined functions.

Its important runtime role is to provide `<div id="root"></div>` for
`src/main.tsx`, then load `/src/main.tsx` as the browser module entry point.

## `package.json`

This file has no JavaScript functions, but it defines command scripts:

`npm run dev`

- Starts the Vite development server.

`npm run build`

- Runs the TypeScript project build with `tsc -b`, then creates a production
  Vite build.

`npm run preview`

- Serves the production build locally with Vite preview.

`npm test`

- Runs the Vitest test suite once with `vitest run`.

## `package-lock.json`

This file has no app-defined functions or methods. It locks the exact dependency
tree installed for the project so installs are reproducible.

## `tsconfig.json`

This file has no functions or methods. It is the root TypeScript project config
and points TypeScript at the app and Node-specific config files.

## `tsconfig.app.json`

This file has no functions or methods. It configures TypeScript checking for the
browser app source.

## `tsconfig.node.json`

This file has no functions or methods. It configures TypeScript checking for
Node-side project files such as `vite.config.ts`.

## `README.md`

This file has no app-defined functions or methods. It documents how to install,
run, build, and test the project.

## `docs/mvp-plan.md`

This file has no functions or methods. It describes the prototype scope,
interfaces, test plan, and assumptions.

## `docs/spreadsheet-analysis.md`

This file has no functions or methods. It summarizes the source spreadsheet's
tabs, workflow, preserved mechanics, and prototype slice.

## `reference/ultimate-lines-sheet.xlsx`

This binary workbook has no app-defined code functions. It is the exported source
spreadsheet used as reference material for the prototype.
