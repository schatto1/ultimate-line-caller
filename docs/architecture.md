# Architecture

The prototype intentionally has a small source surface:

- `src/App.tsx`: the React UI and event handlers
- `src/model.ts`: shared types, local storage, and game rules
- `src/model.test.ts`: tests for score, ratio, possession, validation, and counts
- `src/styles.css`: layout and visual styling

The app stores one active game in browser local storage. All score, O/D state,
ratio, suggestions, player counts, and point-log rows are derived from the
current roster plus `pointLog`.

Installed packages are not app source. `node_modules/` is ignored for future
installs and can be recreated with `npm install`.
