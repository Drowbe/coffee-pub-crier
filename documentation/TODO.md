# TODO

**Audience:** us.

The work Crier will do. An entry says what and why, the file it touches, and how it will be
verified. When it is done it is deleted, and lives in the CHANGELOG.

---

## A turn card may name the prototype token rather than the canvas token

Reported from play on 2026-08-27, not yet confirmed against a current build.

- **Where to start:** the name resolution feeding the turn card in `scripts/crier.js`.
- **Verify:** rename a placed token so it differs from its prototype, run its turn, and confirm the
  card shows the canvas name.
