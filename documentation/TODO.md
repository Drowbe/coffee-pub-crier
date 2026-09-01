# TODO

**Audience:** us.

The work Crier will do. An entry says what and why, the file it touches, and how it will be
verified. When it is done it is deleted, and lives in the CHANGELOG.

---

## Re-copy the publisher files once Blacksmith has committed

The five publisher files were copied from Blacksmith's working tree while three of them
(`tools/wiki-sync.mjs`, `tools/check-docs-structure.mjs`, `.github/workflows/sync-wiki.yml`) were
uncommitted there, so they were verified against that working tree rather than against `HEAD`.
`check-docs-structure.mjs` has moved again since; chasing a working tree that is still changing is
what the hub-commits-first rule exists to stop.

- **Where to start:** `tools/` and `.github/workflows/`, once Blacksmith's copies are committed.
- **Verify:** re-copy all five, then compare staged blobs against the hub's `HEAD` --
  `git show ":<file>" | md5sum` against `git -C ../coffee-pub-blacksmith show "HEAD:<file>" | md5sum`
  -- and confirm five matches. Then `node tools/check-docs-structure.mjs` and
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

## Recapture the settings screenshots

The two settings captures the repository carried were taken before the settings were reorganised and
named controls that no longer exist -- "Show Combatant Cards", "Card Layout", "Card Style", "Icon
Style", "New Turn Sound", "Display 'New Round' Cards", "Label Format" -- and one of them rendered an
unresolved localisation key on screen. They were deleted rather than republished.

- **Where to start:** capture the Crier section of Foundry's module settings as WebP into
  `documentation/assets/`, then reference them from
  `documentation/userguides/userguide-getting-started.md`.
- **Verify:** every control named in the getting-started guide appears in a capture with the same
  wording.

## Walk the getting-started guide in a running world

The guide was written from the module's English strings and its source. The setting names are
accurate; the on-screen order of the sections and the wording Foundry renders around them have not
been checked by hand.

- **Where to start:** `documentation/userguides/userguide-getting-started.md`.
- **Verify:** open the settings window and read every quoted label against it, then walk the death
  save and NPC-name-hiding steps as a player.

## Confirm the three card screenshots still match the current cards

`crier-screen-card-blue.webp`, `crier-screen-card-storm-deathsaving.webp` and
`crier-screen-round.webp` date from January 2025 and predate the move to Blacksmith parts. They are
plausible but unverified, and they are what the README and the wiki front door show.

- **Where to start:** `documentation/assets/`.
- **Verify:** post each card in a running world and compare. Recapture or delete any that no longer
  match.
