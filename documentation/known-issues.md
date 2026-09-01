# Known Issues

**Audience:** GMs running Crier, and contributors.

Known defects in the current release, with workarounds where there are any. This is the counterpart
to the CHANGELOG: the CHANGELOG records what was fixed, this records what is still broken. When an
item is fixed it moves to the CHANGELOG and leaves this list.

Security-sensitive issues are not listed here; they are handled privately until patched.

---

## Cards

### A configured table can get silence

Reported from play on 2026-08-27. Turn and round announcements were enabled in the module settings
and no cards posted for the session. The conditions that reproduce it are not yet known, so there is
no reliable workaround; reloading the client has not been confirmed to help.

Crier holds every card until combat has started and every combatant has a finite initiative, and
releases held work from the combatant hooks. A silent table is most likely a hold that never
released.

### A turn card can name the prototype token rather than the token on the canvas

Reported from play on 2026-08-27, and not yet confirmed against a current build. Where a token on
the canvas has been renamed after being placed, the turn card may announce the name the prototype
carries instead. Renaming the prototype token to match is the workaround if you hit it.
