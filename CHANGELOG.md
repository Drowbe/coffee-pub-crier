# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).



## [12.1.0] - MAJOR UPDATE - Blacksmith API Migration

### Added
- **Blacksmith API Integration**: Complete integration with Coffee Pub Blacksmith central hub module
- **Module Registration**: Automatic registration with Blacksmith API for inter-module communication
- **Safe Settings Access**: `getSettingSafely()` helper function with Blacksmith API fallback support
- **Dynamic Choice Arrays**: Settings dropdowns now populated from Blacksmith's shared choice arrays
- **Real-time Updates**: `blacksmithUpdated` hook for automatic settings refresh when Blacksmith data changes
- **Comprehensive Utility Wrappers**: Local wrapper functions for all Blacksmith utilities with robust fallbacks
- **Sound Path Resolution**: `resolveSoundPath()` function for converting sound names to full file paths
- **Enhanced Debugging**: Extensive console logging and `testBlacksmithIntegration()` function for troubleshooting
- **Error State Handling**: Clear error messages in settings when Blacksmith integration fails

### Changed
- **Module Lifecycle**: Moved all initialization logic to proper FoundryVTT hooks (`init` for registration, `ready` for data access)
- **Settings Registration**: Removed nested hooks and implemented proper timing for Blacksmith data availability
- **Fallback Strategy**: Replaced fake fallback choices with honest error states in settings dropdowns
- **Dependency Management**: Migrated from custom `global.js` utilities to centralized Blacksmith API
- **Settings Access**: All `game.settings.get()` calls replaced with `getSettingSafely()` for crash prevention
- **Sound Management**: Updated all `playSound()` calls to use `resolveSoundPath()` for proper file path resolution
- **Choice Array Population**: Settings now dynamically populate from Blacksmith's comprehensive choice libraries

### Fixed
- **Startup Crashes**: Resolved `TypeError: Cannot read properties of undefined (reading 'isGM')` by fixing hook timing
- **Settings Display**: Fixed settings not appearing in FoundryVTT module settings UI
- **Audio Loading**: Resolved "Failed to load audio element" errors by implementing proper sound path resolution
- **Hook Timing**: Fixed critical timing issues between `init` and `ready` phases for proper module initialization
- **API Availability**: Implemented robust checks for Blacksmith API availability before attempting operations
- **Error Handling**: Added comprehensive try-catch blocks and availability checks throughout the codebase
- **Module Dependencies**: Ensured proper dependency checking and graceful degradation when Blacksmith is unavailable





## [0.1.0] - Initial Version

### Added
- **Initial Releasse**: Baseline release

### Changed
- **Initial Releasse**: Baseline release

### Fixed
- **Initial Releasse**: Baseline release