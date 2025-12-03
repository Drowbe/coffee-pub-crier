# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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