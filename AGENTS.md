# Ultimate Line Caller Agent Instructions

## Project Context

This repo is moving from the current version 0.1 prototype toward the 1.0
release described in `docs/1.0-direction-checklist.md`.

Before starting feature work:

- Read `docs/1.0-direction-checklist.md`.
- Identify the relevant 1.0 milestone/stage.
- Use the stage branch naming convention from the checklist.
- Keep `main` as the latest accepted work that should build and be usable.
- Cut production releases from tags such as `v1.0.0`, with GitHub Releases for
  release notes.

## v1.0 Feature Branch Protocol

For each v1.0 feature branch:

1. Identify the feature or milestone being implemented.
2. Add tests for the intended behavior before implementation.
3. Run the relevant test command and confirm the new tests fail for the expected
   reason.
4. Implement the smallest feature change that makes the tests pass.
5. Run `npm test`.
6. Run `npm run build`.
7. Update `docs/1.0-direction-checklist.md` for completed items.
8. Summarize the work with:
   - tests added
   - initial failing-test result
   - implementation completed
   - final verification result

Do not skip the failing-test step unless the change is docs-only, visual-only,
or test infrastructure work.

## Visual And UI Work Caveat

For visual redesign, CSS polish, layout, animation, and touch-interaction work,
the strict failing-test-first loop may not fit every change.

Use this modified loop instead:

1. Add behavior or integration tests where the UI change has testable behavior.
2. Add or update manual QA acceptance checks for visual layout, iPad/touch flow,
   responsiveness, reduced motion, and accessibility.
3. If using screenshots or browser inspection, record what was checked.
4. Implement the visual/UI change.
5. Run `npm test` and `npm run build`.
6. Manually verify the affected UI states and update the 1.0 checklist.

For 1.0 UI redesign work, explicitly consider and use the installed Hallmark,
Emil design-engineering, and Apple design skills where applicable.

## Testing Defaults

- Prefer pure model tests for business rules, derived state, migration,
  import/export, stats, and aggregation.
- Add integration/component tests when UI behavior becomes complex enough to
  justify the dependency.
- Keep tests focused on behavior that should remain stable across refactors.
- Do not over-test CSS implementation details; verify visual polish with manual
  QA, screenshots, and device checks.

## Current Commands

```bash
npm test
npm run build
```
