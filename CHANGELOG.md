# Changelog

All notable changes to Ultimate Line Caller will be documented here.

This project is moving from the current `0.1.0` prototype toward the `1.0.0`
release described in `docs/1.0-direction-checklist.md`.

## Unreleased

### Model And Storage

- Added the v1.0 `schemaVersion: 2` app state envelope for teams, seasons,
  tournaments, and games.
- Added migration from the prototype `ultimate-line-caller:v1` localStorage key
  into the new `ultimate-line-caller:v2` state.
- Added selectors for the active team, season, tournament, game, active roster,
  and unavailable players.
- Changed roster deletion into player archiving so historical point summaries
  keep archived players and their logged points.

### Workflow

- Added a changelog for release-note tracking before larger v1.0 branches.
- Added a pull request checklist for v1.0 roadmap context, test-first notes,
  final verification, UI/manual QA, and data-safety checks.
- Pinned the local Node.js version with `.nvmrc`.

### Deferred

- GitHub Actions CI is intentionally deferred for now.
- Static hosting selection is intentionally deferred for now; the current
  direction remains an HTTPS-hosted PWA with no backend for the first field-ready
  release.

## 0.1.0 - Prototype

- Built the first local-first sideline prototype for roster setup, seven-player
  line selection, point logging, score derivation, undo, and browser
  localStorage persistence.
