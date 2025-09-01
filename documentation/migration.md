## Migration Plan: Coffee Pub Crier → Blacksmith Global API (v12.2+)

### References
- Blacksmith External API Documentation: [Blacksmith API Wiki](https://github.com/Drowbe/coffee-pub-blacksmith/wiki/Blacksmith-API)

### Scope
- Migrate from deprecated async API calls (`await BlacksmithAPI.getX`) to global objects (`BlacksmithXxx`, `BLACKSMITH`/`BlacksmithConstants`).
- Preserve existing behavior and settings. No unrelated refactors. Keep fallbacks.

### Assessment (current state)
- Mixed usage patterns:
  - `await BlacksmithAPI.getUtils()` and `getModuleManager()` still used.
  - Direct globals (e.g., `BlacksmithModuleManager`) used in one place.
- Settings choices sourced via `ModuleManager.BLACKSMITH`; should use constants directly.
- Sound resolution mixes constants with hard-coded paths; should prefer constants/Asset Lookup Tool with fallbacks.
- Hooks use `Hooks.on`; recommended to use `BlacksmithHookManager` with contexts.
- Readiness: `BlacksmithAPI.waitForReady()` in use; prefer bridge import and contexts per docs.
- Error handling exists; can be standardized with the documented safe pattern.

### Phased Migration Plan

#### Phase 0: Preconditions
1. Ensure Blacksmith is a library dependency in `module.json` (already present).
2. Keep the bridge import at the entry point `scripts/crier.js`:
   - `import { BlacksmithAPI } from '/modules/coffee-pub-blacksmith/api/blacksmith-api.js';`
   - Ensures global objects/timing per docs.

#### Phase 1: Replace async API calls with global objects
- Goal: Remove reliance on `await BlacksmithAPI.getX` and `waitForReady`.
- Edits:
  - `scripts/crier.js`
    - `getSettingSafely`: call `BlacksmithUtils.getSettingSafely(MODULE.ID, key, default)` directly. Keep fallback to `game.settings`.
    - Helpers (`getActorId`, `getTokenId`, `getTokenImage`, `getPortraitImage`, `playSound`): use `BlacksmithUtils` directly when available; retain fallbacks.
    - Replace `await BlacksmithAPI.getUtils()` → `BlacksmithUtils`; `await BlacksmithAPI.getModuleManager()` → `BlacksmithModuleManager`.
    - Remove `BlacksmithAPI.waitForReady()`.
  - `scripts/settings.js`
    - Remove `BlacksmithAPI.getModuleManager()`/`getUtils()`; use global objects directly.

#### Phase 2: Use constants provider for choices/defaults
- Goal: Standardize themes/icons/sounds/backgrounds on constants provider.
- Edits (`scripts/settings.js`):
  - Replace `blacksmithModuleManager?.BLACKSMITH?.arr*Choices` with:
    - Preferred: `BlacksmithConstants?.arr*Choices`
    - Compatible: `BLACKSMITH?.arr*Choices`
  - Defaults: `BlacksmithConstants?.strDefaultCardTheme` (fallback to `BLACKSMITH?.strDefaultCardTheme`, then current default).

#### Phase 3: Sound resolution via constants / Asset Lookup Tool
- Goal: Resolve sound ids through constants/tool; keep path passthrough and module-local fallbacks.
- Edits (`scripts/crier.js` `resolveSoundPath(name)`):
  - If `name` starts with `modules/` or `sounds/`: return as-is.
  - Else: try `BlacksmithConstants?.arrSoundChoices?.[name]` or `BLACKSMITH?.arrSoundChoices?.[name]`.
  - Optionally use asset lookup by type `sound` and tag/id `name`; use first match path.
  - Fallbacks: existing module-local paths; finally return original `name`.

#### Phase 4: HookManager migration (contexts and cleanup)
- Goal: Register hooks via `BlacksmithHookManager` for priority and auto-cleanup.
- Edits (`scripts/crier.js`):
  - Replace `Hooks.on('preUpdateCombat', ...)` → `BlacksmithHookManager.on('preUpdateCombat', fn, { id: MODULE.ID, context: 'combat' })`.
  - Replace `Hooks.on('updateCombat', ...)` and `Hooks.on('renderChatMessage', ...)` similarly.
  - Keep function bodies; only change registration.

#### Phase 5: Lifecycle alignment
- Goal: Register module during `init`; non-critical setup in `ready`; avoid `waitForReady`.
- Edits (`scripts/crier.js`):
  - Move module registration to `init` (via `BlacksmithHookManager.once('init', ...)` or `Hooks.once('init', ...)`) and call `BlacksmithModuleManager.registerModule(...)`.
  - Keep template loading and GM test function exposure in `ready`.

#### Phase 6: Error handling standardization
- Goal: Consistent safe operations per docs.
- Action: Add a small helper mirroring the docs’ safeOperation pattern, or centralize try/catch and logging through `BlacksmithUtils.postConsoleAndNotification` when available.

#### Phase 7: Verification & QA
- Checklist:
  - Settings UI shows dynamic choices for themes, icons, sounds, backgrounds; defaults correct.
  - Round and Turn messages render as before (layouts, icons, backgrounds, portraits, health overlays).
  - Sound ids resolve to playable paths; direct paths and module fallbacks still work.
  - Obfuscation options behave as before.
  - Console tools (`BlacksmithAPIHooks()`, `BlacksmithAPIHookDetails()`) show hooks registered under module contexts.

### Migration Checklist (small, discrete steps)

#### Preconditions
- [x] Verify `module.json` has `coffee-pub-blacksmith` as a library dependency.
- [x] Confirm bridge import exists at top of `scripts/crier.js`.

#### Quick Start Steps (Blacksmith API Documentation)
- [x] Step 1: Add Blacksmith as library dependency in `module.json`.
- [x] Step 2: Import bridge file `import { BlacksmithAPI } from '/modules/coffee-pub-blacksmith/api/blacksmith-api.js'`.
- [x] Step 3: Register module during `init` hook using `BlacksmithModuleManager.registerModule()`.
- [x] Step 4: Test integration with console commands (testing function available globally).
- [x] Step 5: Test integration (GMs can run `testCrierBlacksmith()` in console).
- [x] Step 6: Start using the API (using globals directly).

#### Globals migration (scripts/crier.js)
- [x] Replace `await BlacksmithAPI.getUtils()` calls with `BlacksmithUtils`.
- [x] Replace `await BlacksmithAPI.getModuleManager()` calls with `BlacksmithModuleManager`.
- [x] Remove `BlacksmithAPI.waitForReady()` usage.
- [x] Update `getSettingSafely` to call `BlacksmithUtils.getSettingSafely` directly.
- [x] Update `postConsoleAndNotification` to use `BlacksmithUtils.postConsoleAndNotification` when available.
- [x] Update `getActorId` to prefer `BlacksmithUtils.getActorId` (keep fallback).
- [x] Update `getTokenId` to prefer `BlacksmithUtils.getTokenId` (keep fallback).
- [x] Update `getTokenImage` to prefer `BlacksmithUtils.getTokenImage` (keep fallback).
- [x] Update `getPortraitImage` to prefer `BlacksmithUtils.getPortraitImage` (keep fallback).
- [x] Update `playSound` to prefer `BlacksmithUtils.playSound` (keep fallback).
- [x] Remove legacy wrapper functions (getBlacksmithUtils, postConsoleAndNotification, playSound).
- [x] Follow Quick Start pattern from Blacksmith API documentation.

#### Constants and choices (scripts/settings.js)
- [ ] Replace theme choices with `BlacksmithConstants?.arrThemeChoices` (fallback `BLACKSMITH?.arrThemeChoices`).
- [ ] Replace icon choices with `BlacksmithConstants?.arrIconChoices` (fallback `BLACKSMITH?.arrIconChoices`).
- [ ] Replace sound choices with `BlacksmithConstants?.arrSoundChoices` (fallback `BLACKSMITH?.arrSoundChoices`).
- [ ] Replace background choices with `BlacksmithConstants?.arrBackgroundImageChoices` (fallback `BLACKSMITH?.arrBackgroundImageChoices`).
- [ ] Use `BlacksmithConstants?.strDefaultCardTheme` for default theme (fallback to `BLACKSMITH?.strDefaultCardTheme`).
- [ ] Remove any lingering `BlacksmithAPI.getX` calls in `settings.js`.

#### Sound resolution (scripts/crier.js)
- [ ] Update `resolveSoundPath` to use constants/asset lookup for ids.
- [ ] Preserve passthrough for full paths and existing module-local fallbacks.

#### Hook registration and lifecycle (scripts/crier.js)
- [ ] Register `preUpdateCombat` via `BlacksmithHookManager` with `{ id: MODULE.ID, context: 'combat' }`.
- [ ] Register `updateCombat` via `BlacksmithHookManager` with context.
- [ ] Register `renderChatMessage` via `BlacksmithHookManager` with context.
- [ ] Move module registration to `init` and keep templates/test exposure in `ready`.

#### Error handling
- [ ] Add/use a shared safe operation helper consistent with docs, or centralize try/catch logging.

#### QA (verify after each focused step or small batch)
- [ ] Settings UI renders; choice lists populated and defaults correct.
- [ ] Round/Turn messages render and behave as before.
- [ ] Sound selection by id and by path both work; volume honored.
- [ ] Obfuscation and personalization toggles work as before.
- [ ] Console diagnostics show hooks registered with module contexts.

### File-by-File Summary
- `scripts/crier.js`
  - Replace `getUtils/getModuleManager` with globals; remove `waitForReady`.
  - Use `BlacksmithUtils` directly in helper wrappers.
  - Update `resolveSoundPath` to constants/lookup-based resolution.
  - Register hooks via `BlacksmithHookManager` with `{ id: MODULE.ID, context: 'combat' }`.
  - Register module during `init`.
- `scripts/settings.js`
  - Use `BlacksmithConstants`/`BLACKSMITH` for choices/defaults.
  - Remove all `BlacksmithAPI.getX` calls.
- `scripts/const.js`, `scripts/common.js`
  - No migration changes required.
- `module.json`
  - Keep `coffee-pub-blacksmith` as a library dependency.

### Acceptance Criteria
- No user-facing regressions in settings or runtime behavior.
- No usage of `await BlacksmithAPI.getX` or `BlacksmithAPI.waitForReady` remains.
- All hooks registered via `BlacksmithHookManager` with module id/context.
- All dynamic choices sourced from constants provider; defaults align with constants.
- Sounds resolve from ids via constants/lookup; pass-through paths and fallbacks still function.

### Time Estimate
- Phases 1–3: 2–4 hours
- Phase 4: 1–2 hours
- Phase 5–6: 1 hour
- QA: 1 hour

### Notes
- Target FoundryVTT v12; be friendly toward v13 by using Blacksmith globals as recommended in the docs.

