# Changelog

All notable changes to Ultimate Line Caller will be documented here.

This project is moving from the current `0.1.0` prototype toward the `1.0.0`
release described in `docs/1.0-direction-checklist.md`.

## Unreleased

### Workflow

- Added a changelog for release-note tracking before larger v1.0 branches.
- Added a pull request checklist for v1.0 roadmap context, test-first notes,
  final verification, UI/manual QA, and data-safety checks.
- Pinned the local Node.js version with `.nvmrc`.
- Added branch-routing guidance so unrelated roadmap, documentation, and
  workflow changes land on `main` or on the relevant feature branch instead of
  the currently checked-out branch by accident.

### Deferred

- GitHub Actions CI is intentionally deferred for now.
- Static hosting selection is intentionally deferred for now; the current
  direction remains an HTTPS-hosted PWA with no backend for the first field-ready
  release.
- Added post-1.0 roadmap items for iPad field-performance budgeting, resource
  profiling, battery use, and thermal behavior.

## 0.1.0 - Prototype

- Built the first local-first sideline prototype for roster setup, seven-player
  line selection, point logging, score derivation, undo, and browser
  localStorage persistence.
