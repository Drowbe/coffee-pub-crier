# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [13.0.9]

### Added

- **Turn penalty report**: Turn cards can now include a **While This Lasts** block under the status list, showing what the combatant's afflictions cost them right now — summed roll penalties, bleed damage, and rounds remaining.
- **Summed roll penalties**: Numeric ActiveEffect changes are totalled per stat across every listed effect and rendered as one line (`−3 to attack rolls · −2 to ability checks`) covering attack rolls, damage rolls, AC, ability checks, and saving throws.
- **Bleed preview**: Bibliosoph `outcomeBurst` ticks are resolved from percent-of-max-HP into the actual HP loss for this turn, matching Bibliosoph's own arithmetic.
- **Relief countdown**: Effects driving a penalty or a tick list how long they have left, soonest first.
- **Turn-card setting**: Added a default-on **Show Turn Penalties** toggle; the existing **Show Active Effects For** selector now governs both blocks.

### Fixed

- **Premature cards**: Neither the round card nor the turn card posts before combat has started and every combatant has rolled initiative. The check was previously skipped for the rest of the round once the round was marked initialized, so a combatant added mid-round — reinforcements, a summon, a late arrival — was waved through and announced a turn order that was about to re-sort. The round card was not checked at all.
- **Missing cards after the last roll**: Cards blocked by an unsettled order are now held and posted when the order settles, rather than dropped. Rolling initiative writes to Combatant documents, so `updateCombat` never fires for it, and Foundry's follow-up turn update diffs to nothing when the current combatant keeps its slot — a blocked card was waiting on an event that never came. New `updateCombatant` and `deleteCombatant` hooks release them.
- **Round card posting before the round had been rolled for**: On tables that reroll initiative every round, the clearing happens in reaction to the round update, so at the instant Crier was notified the combatants still carried the *outgoing* round's initiative. The round card builds quickly, won that race, and announced a round nobody had rolled for — ahead of the end-of-round summary. Round changes are now held briefly and reconsidered once the dust settles.
- **Two turn cards at the top of a round**: After the last initiative came in, Crier posted for whoever `combat.combatant` was at that moment — but Foundry keeps whoever was current *before* the rolls, who may now be anywhere in the new order. The tracker corrects the pointer to the top slot a beat later, which read as another turn change, so a second card followed for the combatant who actually acts first. The settle window now covers the correction, and one card posts for the right combatant.
- **Turn card vanishing for a whole round**: The same race, opposite outcome. The turn card builds slowly — settings, portrait, effects, `enrichHTML` — so by the time it reached its own initiative check the clearing had landed, the check correctly refused it, and it was then dropped because nothing was holding it. Cards that cannot be delivered are now put back on hold and post when the order settles.
- **Turn card arriving without its round card**: A held round card kept the context of whichever change came last, and `postNewRound()` reads that context's `roundShift` to tell a real round change from a turn update. A turn re-sort landing between the round change and the last initiative roll overwrote it, so the round card tested as "not a round change" and silently vanished while the turn card posted. Each held card now keeps the context of the change that called for it.
- **Held cards dropped by a settled update**: If the order settled via a turn update rather than an initiative roll, the held record was discarded and only the current change's cards posted. Held and current cards are now merged.
- **Card ordering**: The round card is published before the turn card is built, not merely queued ahead of it.
- **Gate placement**: The combat-started and all-initiatives-rolled checks now live in `postNewTurnCard()`, the single funnel every turn card passes through, instead of in one of its callers.
- **Premature announcement from `preUpdateCombat`**: Removed a branch that tried to post the first turn card from a *pre*-update hook, ahead of the change it described. It watched for initiative in a Combat update, where initiative never appears.
- **Suppressed cards no longer consume turn state**: A card blocked by either check leaves `lastCombatant` untouched, so the next card that does post still sees the correct previous combatant.
- **Round flag persistence**: `roundInitialized` is a world-scoped setting, so only GM clients write it now; player clients previously rejected the write unhandled and drifted from their local cache.

### Changed

- **Readable durations**: Effect durations now read in the unit that means something at the table — rounds up to a minute, then minutes, hours, and days — instead of raw seconds. A ten-minute fumble reads `10 minutes` rather than `582 Seconds`, and never as "97 rounds remain". Applies to the status rows as well, so both blocks agree.
- **Cleaner names**: Bibliosoph's `Critical:` and `Fumble:` name prefixes are stripped in the penalty block too, matching the status rows above.

### Technical

- **Display-only by design**: Crier reports ticks and never applies them — Bibliosoph applies them on `updateCombat` for the active GM.
- **Single effect pass**: `collectDisplayEffects()` filters the actor's effects once and feeds both the status list and the penalty report.
- **Empty-block suppression**: Formula bonuses (`1d4`) are excluded from totals, and the block is omitted entirely when penalties cancel out or nothing is costing the combatant anything.


## [13.0.8]

### Added

- **Status and Conditions reminders**: Turn cards can now include a compact, read-only list of the combatant's active injuries, criticals, fumbles, conditions, buffs, and other temporary effects.
- **Effect details**: Each row shows a 34px effect icon, effect name, localized type (`Injury`, `Critical`, `Fumble`, or `Effect`), conveyed condition or source context, and remaining duration when available.
- **Rules tooltips**: Hovering an effect icon displays enriched rules text, including dnd5e descriptions stored as `@Embed` content.
- **Turn-card settings**: Added a default-on **Show Active Effects & Conditions** toggle and a **Show Active Effects For** selector with Players, NPCs & Monsters, and Both options.

### Changed

- **Unified status section**: All qualifying effects appear under one **Status and Conditions** heading rather than separate category headings.
- **Bibliosoph integration**: Bibliosoph `outcomeBurst` effects retain their injury, critical, and fumble identity while remaining display-only; loose conditions can identify the injury that conveyed them.
- **Compact layout**: Status rows use fixed icon and text columns, consistent top alignment, and single-line ellipsis for long names and details.

### Technical

- **Effect filtering**: Excludes disabled and suppressed effects while including Bibliosoph outcomes, temporary effects, effects carrying status IDs, and hand-authored effects whose names match registered dnd5e conditions.
- **Actor targeting**: The Players/NPCs selector classifies dnd5e `character` actors as players and other actor types as NPCs or monsters.


## [13.0.7]

### Fixed

- **Blacksmith registration**: Register with Blacksmith only after `await BlacksmithAPI.waitForReady()`, using `game.modules.get('coffee-pub-blacksmith').api` (`registerModule` / `ModuleManager.registerModule`) with a `BlacksmithModuleManager` fallback. Removes `Cannot read properties of null (reading 'registerModule')` when Crier’s `ready` runs before Blacksmith exposes globals.
- **Token portrait tiles**: Background textures now use **Blacksmith merged asset `path`** (via `api.assetLookup.dataCollections.backgroundImages` and `foundry.utils.getRoute`), matching the **Image Background** setting’s stored `value` instead of a duplicate file map in Crier.
- **Chat HTML sanitization**: Foundry strips inline `style` from message content, so tile URLs are stored on the message as **`flags.coffee-pub-crier.tokenBackgroundImageUrl`** and applied in **`renderChatMessage`** to `.crier-token-frame` with the DOM API so cobblestone (and other tiles) actually render.

### Changed

- **Turn card template**: Portrait area uses a `.crier-token-frame` wrapper; **themecolor** still uses `.crier-token-background-themecolor` only (no tile file).

### Removed

- **Legacy token tile CSS**: Removed per-choice `url(../images/tile-*.webp)` rules and the old class-per-tile image map; Crier no longer ships parallel tile assets for those backgrounds (Blacksmith is the source of truth).

## [13.0.6]

### Fixed

- **Foundry v13**: Round and turn card templates now load via `foundry.applications.handlebars.getTemplate` instead of the deprecated global `getTemplate`, which removes compatibility warnings during `ready` (global removal planned for Foundry v15).

## [13.0.5]

- **Turn cards**: 
  - Completed migration to Blacksmith framework

### Added
- **Cursor subagents**: Project-specific subagents in `.cursor/agents/` for Cursor Agent delegation
  - **verifier** – Validates completed work, runs tests, and reports what passed vs what’s incomplete
  - **performance-and-memory** – Optimizes runtime performance and identifies or fixes potential memory leaks (listeners, timers, subscriptions, long-lived refs)
  - **README** – Documents subagent format (YAML frontmatter, name/description, prompt body), project vs user scope, and when to use subagents vs skills

## [13.0.4]

### NOTE: Early draft release of unified themes.

### Added
- **Blacksmith Chat Cards API Integration**: Full integration with Blacksmith's Chat Cards API for dynamic theme management
  - Round cards use `getAnnouncementThemeChoicesWithClassNames()` - only announcement themes available
  - Turn cards use `getCardThemeChoicesWithClassNames()` - only card themes available
  - Settings store CSS class names directly (e.g., `theme-default`, `theme-blue`) eliminating ID-to-class conversion
- **Blacksmith chat cards**: Round and turn cards now use the Coffee Pub Blacksmith chat card framework (`.blacksmith-card`, themes, `card-header`, `section-content`). Internal layout (portraits, HP, abilities, death saves) is unchanged.

### Changed
- **Round cards**: 
  - Template uses Blacksmith structure (hide-header span, `blacksmith-card` + theme, `card-header` with icon)
  - Round Card Style dropdown now shows **only announcement themes** (Announcement Green, Announcement Red, Announcement Blue)
  - Default changed from legacy `cardsgreen` to `theme-announcement-green`
- **Turn cards**: 
  - Template wrapped in `blacksmith-card` + theme; title blocks use `card-header`, body uses `section-content`
  - Turn Card Style dropdown shows **only card themes** (Default, Blue, Green, Red, Orange)
  - Default changed from legacy `cardsdark` to `theme-default`
  - Full, small, and none layouts preserved
- **Missed turn cards**: Now use Blacksmith framework (`blacksmith-card theme-orange`) with hide-header span. Removed JavaScript manipulation of Foundry's `.message-header`; no longer overriding core chat template styles.
- **CSS**: 
  - All styles scoped to `.blacksmith-card .section-content` only - no styling of `.card-header` or wrapper
  - Removed all legacy theme-specific CSS (cardsdark, cardsgreen, etc.)
  - Generic attribute selector `[class^="crier-cards-user-"]` replaces theme-specific classes
  - Wrapper-level chrome (background, border) removed; Blacksmith themes provide card styling
  - HP bars, abilities, death saves, image-stack, and token backgrounds kept and scoped
- **Settings**: 
  - Round and Turn Card Style dropdowns dynamically populated from Blacksmith Chat Cards API
  - Theme choices use CSS class names as keys (no ID conversion needed)
  - Settings registration now async to await API theme choices
- **Theme Mapping**: 
  - Simplified `mapRoundCardStyleToTheme()` and `mapTurnCardStyleToTheme()` functions
  - Removed all legacy key mapping code (cardsdark, cardsgreen, etc.)
  - Functions now only handle CSS class names (pass-through) or convert theme IDs via API

### Removed
- **All legacy theme code**: Removed legacy theme keys (cardsdark, cardsgreen, cardsred, cardsblue, cardsbrown, cardsminimalred, cardsminimalplain, cardssimple) from settings and mapping functions
- **Legacy theme fallbacks**: Removed legacy theme entries from fallback functions
- **Legacy CSS**: Removed all theme-specific CSS tied to old style names

### Fixed
- **Initialization error**: Fixed "setting is not registered" error by awaiting `registerSettings()` before accessing settings
- **Settings timing**: Added proper async/await handling for settings registration to ensure API theme choices are available

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
