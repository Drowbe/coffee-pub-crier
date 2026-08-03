# Crier Test Harness

Create a Foundry **Script Macro** containing:

```js
await import(`/modules/coffee-pub-crier/testing/test-harness.js?v=${Date.now()}`);
```

The cache-busting query makes each macro click reopen the latest harness. The harness is the single launcher for Crier's live Foundry suites; add future suites to the `tests` catalog in `test-harness.js`.

## Current suites

- `test-turn-timing.js` — combat lifecycle, initiative settling, round-before-turn ordering, held turn delivery, safe unstarted deletion, and one combat-end announcement.

The timing suite refuses to run over an active combat on the current scene. Its recorder filters by the temporary combat ID, and cleanup deletes only messages recorded for that combat.
