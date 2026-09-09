# TODO

**Audience:** us.

The work Crier will do. An entry says what and why, the file it touches, and how it will be
verified. When it is done it is deleted, and lives in the CHANGELOG.

---

## Re-copy check-docs-structure.mjs once Blacksmith has committed it

Four of the five publisher files now match Blacksmith's `HEAD` and are settled. Only
`tools/check-docs-structure.mjs` is outstanding: it is still uncommitted in the hub and has moved
several times, so copying it now would mean chasing a working tree.

- **Where to start:** `tools/check-docs-structure.mjs`.
- **Verify:** re-copy, then `git show ":tools/check-docs-structure.mjs" | md5sum` against
  `git -C ../coffee-pub-blacksmith show "HEAD:tools/check-docs-structure.mjs" | md5sum` -- expect a
  match, giving five of five. Then `node tools/check-docs-structure.mjs` and
  `node tools/wiki-sync.mjs build`.

## A turn card may name the prototype token rather than the canvas token

Reported from play on 2026-08-27, not yet confirmed against a current build.

- **Where to start:** the name resolution feeding the turn card in `scripts/crier.js`.
- **Verify:** rename a placed token so it differs from its prototype, run its turn, and confirm the
  card shows the canvas name.
