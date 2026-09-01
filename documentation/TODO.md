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
## A configured table can get silence

Reported from play on 2026-08-27. Turn and round announcements were enabled and no cards posted for
the whole session. The conditions are not known.

- **Where to start:** the hold-and-release path in `scripts/crier.js` -- `isOrderSettled()`,
  `enqueueCombatWork()`, and `flushHeldAnnouncement()`. A silent table is most likely a hold that
  never released.
- **Verify:** run a combat in a world where it reproduced, with Crier's debug logging on, and confirm
  a turn card posts for every combatant.

## A turn card may name the prototype token rather than the canvas token

Reported from play on 2026-08-27, not yet confirmed against a current build.

- **Where to start:** the name resolution feeding the turn card in `scripts/crier.js`.
- **Verify:** rename a placed token so it differs from its prototype, run its turn, and confirm the
  card shows the canvas name.

## Walk the remaining getting-started claims in a running world

Every setting name, option and section heading in the guide has been checked against the screenshots
captured on 2026-09-01, and the section order matches. Two behavioural claims have not been walked.

- **Where to start:** `documentation/userguides/userguide-getting-started.md`, the death save and
  NPC name sections.
- **Verify:** as a player who owns a downed character, roll a death save from the card and confirm
  the pips update for everyone; then set **NPC Name Visibility** to something other than *Show names
  for everyone* and confirm a player sees `???` while the GM sees the real name.
