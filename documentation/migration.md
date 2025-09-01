Migration Plan: Coffee Pub Crier → Blacksmith Global API (v12.2+)

References
- Blacksmith External API Documentation: https://github.com/Drowbe/coffee-pub-blacksmith/wiki/Blacksmith-API

Scope
- Complete the migration from the deprecated async API style (await BlacksmithAPI.getX) to the global objects style (BlacksmithXxx, BLACKSMITH/BlacksmithConstants).
- Keep behavior and settings intact. No unrelated refactors. Maintain fallbacks where appropriate.

Current Assessment
- Mixed usage patterns:
  - Still using await BlacksmithAPI.getUtils()/getModuleManager() in multiple places.
  - Also using direct globals (e.g., BlacksmithModuleManager) in one ready hook.
- Settings registration pulls choices through ModuleManager.BLACKSMITH; should use constants provider (BlacksmithConstants or BLACKSMITH) directly.
- Sound resolution mixes constants via ModuleManager with hard-coded module paths; should prefer constants/Asset Lookup Tool and keep fallbacks.
- Hooks are registered through Hooks.on; recommended to use BlacksmithHookManager for priority, context, and cleanup.
- Lifecycle readiness: explicit BlacksmithAPI.waitForReady() present; per docs, prefer bridge import and HookManager with contexts instead.
- Error handling present with try/catch; can standardize following docs’ safe pattern.

Phased Migration Plan

Phase 0: Preconditions
1) Ensure Blacksmith is a library dependency in module.json (already present).
2) Keep the bridge import at the module entry point (scripts/crier.js):
   import { BlacksmithAPI } from '/modules/coffee-pub-blacksmith/api/blacksmith-api.js';
   Rationale: Ensures global objects are initialized and timing issues are handled by the bridge (see docs).

Phase 1: Replace async API calls with global objects
Goal: Remove reliance on await BlacksmithAPI.getX and waitForReady.
Edits:
- scripts/crier.js
  - getSettingSafely: use BlacksmithUtils.getSettingSafely(MODULE.ID, key, default) directly. Keep existing fallback to game.settings.
  - Wrapper helpers (getActorId, getTokenId, getTokenImage, getPortraitImage, playSound): access BlacksmithUtils directly when available; keep current fallbacks.
  - Remove await BlacksmithAPI.getUtils() and await BlacksmithAPI.getModuleManager(). Replace with BlacksmithUtils and BlacksmithModuleManager respectively.
  - Remove BlacksmithAPI.waitForReady(); rely on bridge import and Foundry hooks.
- scripts/settings.js
  - Remove calls to BlacksmithAPI.getModuleManager()/getUtils(). Use global objects directly.

Phase 2: Use constants provider for choices/defaults
Goal: Standardize on constants object for themes, icons, sounds, backgrounds.
Edits:
- scripts/settings.js
  - Replace blacksmithModuleManager?.BLACKSMITH?.arrThemeChoices, arrIconChoices, arrSoundChoices, arrBackgroundImageChoices with:
    - Preferred: BlacksmithConstants?.arrThemeChoices (and corresponding arrays)
    - Compatible: BLACKSMITH?.arrThemeChoices (and corresponding arrays)
  - Replace default theme: BlacksmithConstants?.strDefaultCardTheme (fallback to BLACKSMITH?.strDefaultCardTheme, then current default).

Phase 3: Sound resolution via constants / Asset Lookup Tool
Goal: Resolve sound ids through constants/tool; preserve path passthrough and module-local fallbacks.
Edits:
- scripts/crier.js
  - resolveSoundPath(name):
    - If name startsWith('modules/') or 'sounds/': return as-is.
    - Else try constants: BlacksmithConstants?.arrSoundChoices?.[name] || BLACKSMITH?.arrSoundChoices?.[name].
    - Optionally, if Asset Lookup Tool is available, search by type: 'sound' and tag/id == name; use first match’s path.
    - Fallback: existing module-local hardcoded paths; finally return original name.

Phase 4: HookManager migration (contexts and cleanup)
Goal: Register hooks via BlacksmithHookManager to gain priority control and auto-cleanup.
Edits:
- scripts/crier.js
  - Replace Hooks.on('preUpdateCombat', fn) with BlacksmithHookManager.on('preUpdateCombat', fn, { id: MODULE.ID, context: 'combat' }).
  - Replace Hooks.on('updateCombat', fn) accordingly.
  - Replace Hooks.on('renderChatMessage', fn) accordingly.
  - Keep function bodies intact; only change registration mechanism.

Phase 5: Lifecycle alignment
Goal: Register module during init; do non-critical setup in ready; avoid waitForReady.
Edits:
- scripts/crier.js
  - Move module registration to init using BlacksmithHookManager.once('init', ...) or Hooks.once('init', ...) and call BlacksmithModuleManager.registerModule(MODULE.ID, { name, version }).
  - Keep template loading and GM testing exposure in ready.

Phase 6: Error handling standardization
Goal: Consistent safe operations per docs.
Actions:
- Add a small helper that mirrors the docs’ safeOperation pattern when interacting with optional Blacksmith features, or keep current try/catch but centralize logging via BlacksmithUtils.postConsoleAndNotification when available.

Phase 7: Verification & QA
Checklist:
- Settings UI shows dynamic choices for themes, icons, sounds, backgrounds; defaults are correct.
- Round and Turn messages render as before (layouts, icons, backgrounds, portraits, health overlays).
- Sound ids resolve to playable paths; direct paths still work; module-local fallbacks still work.
- Obfuscation options behave as before.
- Console tools (BlacksmithAPIHooks(), BlacksmithAPIHookDetails()) show hooks registered under this module’s contexts.

File-by-File Tasks
- scripts/crier.js
  - Replace getUtils/getModuleManager with globals; remove waitForReady.
  - Update getSettingSafely and helpers to use BlacksmithUtils directly.
  - Update resolveSoundPath to constants/lookup-based resolution.
  - Register hooks via BlacksmithHookManager with { id: MODULE.ID, context: 'combat' }.
  - Ensure module registration during init.
- scripts/settings.js
  - Use BlacksmithConstants or BLACKSMITH for choices and defaults.
  - Remove any BlacksmithAPI.getX calls.
- scripts/const.js, scripts/common.js
  - No migration changes required.
- module.json
  - Keep coffee-pub-blacksmith as a library dependency. No other changes.

Compatibility & Rollback
- Keep all current fallbacks (game.settings direct access, Foundry AudioHelper, module-local assets) to ensure graceful behavior if Blacksmith is unavailable.
- If BlacksmithConstants is not present, fall back to BLACKSMITH (docs state both are available during migration).

Acceptance Criteria
- Zero user-facing regressions in settings or runtime behavior.
- No usage of await BlacksmithAPI.getX or BlacksmithAPI.waitForReady remains.
- All hooks registered via BlacksmithHookManager with module id/context.
- All dynamic choices sourced from constants provider; defaults align with constants.
- Sounds resolve from ids via constants/lookup; pass-through paths and fallbacks still function.

Time Estimate
- Phases 1–3: 2–4 hours
- Phase 4: 1–2 hours
- Phase 5–6: 1 hour
- QA: 1 hour

Notes
- FoundryVTT v12 target; avoid v13-specific APIs. The plan keeps code compatible with v12 and positions for v13 by using the Blacksmith global API as recommended in the docs.

