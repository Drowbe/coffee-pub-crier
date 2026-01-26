# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).


## [Unreleased]

### Added
- **Blacksmith chat cards**: Round and turn cards now use the Coffee Pub Blacksmith chat card framework (`.blacksmith-card`, themes, `card-header`, `section-content`). Internal layout (portraits, HP, abilities, death saves) is unchanged.
- **Round card theme mapping**: Round Card Style setting choices show Blacksmith theme names; styles map to `theme-default`, `theme-announcement-green`, `theme-announcement-red`, etc.
- **Turn card theme mapping**: Turn Card Style setting choices show Blacksmith theme names; styles map to `theme-default`, `theme-green`, `theme-red`, `theme-blue`, etc.

### Changed
- **Round cards**: Template uses Blacksmith structure (hide-header span, `blacksmith-card` + theme, `card-header` with icon). Round icon and message come from template; `createNewRoundCard` passes `roundCardStyle`, `roundIconStyle`, and `theme`.
- **Turn cards**: Template wrapped in `blacksmith-card` + theme; title blocks use `card-header`, body uses `section-content`. Full, small, and none layouts preserved.
- **CSS**: Turn card styles scoped to `.blacksmith-card.crier`. Wrapper-level chrome (background, border) removed; Blacksmith themes provide card styling. HP bars, abilities, death saves, image-stack, and token backgrounds kept and scoped.
- **Settings**: Round and Turn Card Style dropdowns use `getRoundCardThemeChoices()` and `getTurnCardThemeChoices()` instead of Blacksmith constants.

### Deprecated
- **Legacy round card CSS**: Previous round card rules (`.round-cycling-*`, etc.) commented out in `module.css`; migration date noted.
- **Legacy turn card chrome**: Per-theme wrapper/title/description colors (DARK, RED, GREEN, BLUE blocks) removed in favour of Blacksmith themes.


## [13.0.3]

### Removed
- **Verbose Debug Code**: Removed development console.log statements from settings registration, module constants initialization, and removed the global `testCrierBlacksmith()` test function
- **Routine Operation Debug Messages**: Removed verbose debug messages that were firing during normal operation:
  - "HOOK: updateCombat hook called" (fired on every combat update)
  - "HOOK: preUpdateCombat - checking initiatives after update"
  - "GENERATE CARDS: About to render template" (fired every card generation)
  - "GENERATE CARDS: Template rendered"
  - "GENERATE CARDS: Skipping - same combatant as last"
  - "CREATE NEW ROUND CARD: About to render template" (fired every round)
  - "PROCESS TURN: Creating chat messages" (fired every turn)

### Technical
- **Cleaner Console Output**: Console output is now much quieter during normal operation, with only error messages and gated debug logs (when debug mode is enabled) appearing

## [13.0.2]

### Fixed
- **NPC Portrait Images**: NPCs and creatures now use portrait images when "Portrait" style is selected, matching player behavior. Previously, NPCs were incorrectly using token images even when portrait style was selected.

## [13.0.1]

### Changed
- **Hidden Monster Cards**: Turn cards are no longer displayed for monsters that are hidden in the combat tracker
- **Hidden Canvas Tokens**: Turn cards are no longer displayed for NPC tokens that are hidden on the canvas (player cards always show regardless of canvas visibility)

## [13.0.0] - v13 Migration Complete

### Important Notice
- **v13 MIGRATION COMPLETE:** This version completes the migration to FoundryVTT v13
- **Breaking Changes:** This version requires FoundryVTT v13.0.0 or later
- **v12 Support Ended:** v12.1.4-FINAL was the last version supporting FoundryVTT v12

### Changed
- **Minimum Core Version:** Updated to require FoundryVTT v13.0.0
- **Module Version:** Bumped to 13.0.0 to align with FoundryVTT v13
- **Compatibility:** Module now exclusively supports FoundryVTT v13

### Migration Changes
- **jQuery Removal:** Added jQuery detection pattern for `renderChatMessage` hook to handle native DOM elements
- **Font Awesome Migration:** Updated all Font Awesome 5 class prefixes (`fas`) to Font Awesome 6 (`fa-solid`)
  - Updated templates: `templates/turns.hbs` (4 instances)
  - Updated JavaScript: `scripts/crier.js` (2 instances)
  - Updated CSS: `styles/module.css` (10 selectors across all card themes)
- **Hook Parameter Handling:** Updated `chatMessageEvent` to properly handle native DOM elements from v13 hooks

### Technical
- **Native DOM:** All DOM manipulation now uses native DOM APIs
- **Font Awesome 6:** All icons now use FA6 class prefixes compatible with FoundryVTT v13
- **Backward Compatibility:** Module is NOT compatible with FoundryVTT v12 - users must upgrade to v13

## [12.1.4] - Final v12 Release

### Important Notice
- **FINAL v12 RELEASE:** This is the final build of Coffee Pub Crier compatible with FoundryVTT v12
- **v13 Migration:** All future builds will require FoundryVTT v13 or later
- **Breaking Changes:** Users must upgrade to FoundryVTT v13 to use future versions of this module

### Changed
- **Documentation Updates:** Updated README.md and module.json to reflect v12.1.4 as the final v12 release
- **Compatibility Notice:** Added clear notice that v12.1.4 is the last version supporting FoundryVTT v12
- **Migration Preparation:** Module is now locked for v12 compatibility; v13 migration work will begin in next version

### Technical
- **Version Lock:** Module version locked at 12.1.4-FINAL for v12 compatibility
- **Future Development:** All development moving forward will target FoundryVTT v13 exclusively


## [12.1.3] - Stability & polish

### Changed
- **Turn-card caching**: Batched all `getSettingSafely` lookups behind a short-lived cache so each chat card pulls styling data once per render instead of 10+ async calls.
- **Telemetry gating**: Wrapped all verbose `BlacksmithUtils.postConsoleAndNotification(..., true)` calls in a debug guard so heavy payloads only build when Blacksmith’s global debug flag is on.
- **Animation lifetime**: Limited the missed-turn pulse and HP critical glow to 10 iterations so old chat cards stop animating forever.

### Fixed
- **Visibility + permissions**: Turn cards now determine `defaultVisible` using real document ownership instead of comparing against the helper function object.
- **Missed-turn settings**: `getSettingSafely` now receives the module ID when checking the notification toggle, preventing constant lookup errors.
- **Reliable chat posting**: `processTurn` now awaits each `ChatMessage.create`, matching `processCombatChange` and eliminating duplicate renders/Promise warnings.
- **Styling regression**: Restored the missed-turn chat interceptor so alerts once again use the Coffee Pub layout instead of default Foundry formatting.

## [12.1.2] - Beginning of migration to version 13

## [12.1.1] - Beginning of migration to version 13

### New
- **Modified Compatability**: Mod now on track to support FoundryVTT version 13

## [12.1.0] - MAJOR UPDATE - Blacksmith API Migration

### Added
- **Blacksmith API v12.2+ Integration**: Complete migration to new global object system
- **Module Registration**: Automatic registration with Blacksmith API for inter-module communication
- **Safe Settings Access**: `getSettingSafely()` helper function with Blacksmith API fallback support
- **Dynamic Choice Arrays**: Settings dropdowns now populated from Blacksmith's shared choice arrays
- **Comprehensive Testing**: Enhanced `testCrierBlacksmith()` function with detailed constant and integration testing
- **Constants Integration**: Full integration with Blacksmith's theme, icon, sound, and volume constants
- **Asset Lookup Support**: Ready for Blacksmith's new Asset Lookup Tool with tag-based searching
- **Enhanced Debugging**: Extensive console logging and comprehensive test coverage for troubleshooting

### Changed
- **API Migration**: Migrated from deprecated `await BlacksmithAPI.get*()` to direct global object access
- **Constants System**: Updated to use `BlacksmithAPIConstants()` function approach with `BlacksmithConstants` fallback
- **Settings Registration**: All settings now use Blacksmith constants for choices and defaults
- **Sound Management**: Updated sound playback to use Blacksmith volume constants (`SOUNDVOLUMENORMAL`, `SOUNDVOLUMESOFT`)
- **Hook Registration**: Migrated from `Hooks.on()` to `BlacksmithHookManager.registerHook()` with proper context and priority
- **Module Lifecycle**: Moved all initialization logic to proper FoundryVTT hooks (`init` for registration, `ready` for data access)
- **Fallback Strategy**: Replaced hardcoded fallbacks with Blacksmith constants before final hardcoded values
- **Template System**: Templates now receive all styling data through settings that use Blacksmith constants

### Fixed
- **Reference Errors**: Resolved `BLACKSMITH is not defined` errors by removing impossible fallbacks
- **Constants Access**: Fixed constant access patterns to use proper API function approach
- **Volume Constants**: Updated sound volume to use Blacksmith constants instead of hardcoded values
- **Settings Defaults**: All settings now use Blacksmith constants for proper default values
- **Hook Timing**: Fixed critical timing issues between `init` and `ready` phases for proper module initialization
- **API Availability**: Implemented robust checks for Blacksmith API availability before attempting operations
- **Error Handling**: Added comprehensive try-catch blocks and availability checks throughout the codebase
- **Module Dependencies**: Ensured proper dependency checking and graceful degradation when Blacksmith is unavailable

### Removed
- **Legacy API Calls**: Removed all `await BlacksmithAPI.getUtils()` and `await BlacksmithAPI.getModuleManager()` calls
- **Dead Code**: Removed impossible `|| BLACKSMITH` fallbacks that would never execute
- **Helper Functions**: Removed unnecessary wrapper functions in favor of direct API access
- **Hardcoded Fallbacks**: Replaced hardcoded values with Blacksmith constants where available





## [0.1.0] - Initial Version

### Added
- **Initial Releasse**: Baseline release

### Changed
- **Initial Releasse**: Baseline release

### Fixed
- **Initial Releasse**: Baseline release