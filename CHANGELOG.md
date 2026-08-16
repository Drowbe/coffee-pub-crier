# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [13.2.1]

### Added
- **Turn cards keep up**: Hit points, death-save pips and the blood over a portrait now follow the actor. When health or death saves change, the announcing GM rewrites the card through `chatCards.update()` and every client re-renders, so a card stops describing the moment it was posted — in its stored HTML as well as on screen, which is what chat search and exports read. A snapshot was tolerable while nothing on the card could be clicked; a death-save button whose own pips never move is not.

## [13.2.0]

### Added

- **Clickable death saves**: A character rolling death saves gets a skull between the two rows of pips, and whoever owns that character can roll from the card. The handler checks ownership itself — hiding a control is presentation, not authorization — and a render pass settles in each reader's own browser whether the button is live, so the person who can roll sees a beating skull and everyone else a still one.

- **Class and speed on small cards**: The Small layout is one `subject` part carrying portrait, classes and levels, walking speed and the health bar. Speed uses dnd5e's own localized unit, so a metric table reads `9 m`.
- **Audiences for card content**: Health, Ability Scores, Status & Conditions and Turn Penalties each choose who they appear for — Do Not Show, Players, NPCs and Monsters, or Players, NPCs, and Monsters. Health and abilities were previously hard-coded to player characters with no way to say otherwise.

### Changed

- **Cards are composed, not templated**: Every card is now described as data and rendered by Blacksmith's chat cards API. Crier ships no card templates and no card stylesheets — `templates/` and `styles/` are gone, along with the `styles` entry in the manifest. Improving a part in Blacksmith improves cards already sitting in the log, and Foundry's chat markup becomes Blacksmith's problem rather than Crier's.
- **Themes are stored as ids**: Theme settings held CSS class names and had to be translated on every read. They hold Blacksmith theme ids now, and a world's existing values are migrated on load.
- **One question per setting**: An enable checkbox paired with a second setting that only mattered when it was ticked has become one choice in each case — the pair made "off" look like a state you had to assemble. `Announce Turns` + `Turn Card Layout` are **Turn Cards** (Do Not Announce / Large / Small); the two combat checkboxes are **Combat Cards** (Do Not Announce / Start Only / End Only / Start and End); `Announce New Rounds` is **Round Cards**; `Show Status & Conditions` + `Show Status & Conditions For` are one audience; and the two missed-turn toggles are **Missed Turn Reminders** (Do Not Remind / Chat Card Only / Chat Card and Notification). Existing choices are carried across on load.
- **Sections read alike**: Combat, Round and Turn each collapse to one section that opens the same way — whether the card is posted at all, then label, icon, theme and sound. The three `Hide …` toggles became `Show …`.
- **A player character is `actor.type === 'character'`**: Health and abilities were gated on a check that asked whether a world actor existed with the token's name. Two notions of "player" in one file are now one.
- **Portrait blood follows health**: It has no audience of its own, because a splattered portrait beside no health bar tells half the story.
- **Health reads the combatant's own actor**: Statistics came from a world actor looked up by name, which is the wrong document for any unlinked token.
- **No heading over the penalties**: `notes` rules itself off from what precedes it, so a divider above it drew the line twice.
- **Text, not markup**: Card text is escaped by Blacksmith and `**bold**` is the only emphasis. A world that had put HTML in its turn-label override will see the tags rather than obey them.

### Fixed

- **Round and combat cards ignored their theme**: The settings dropdown called a Blacksmith method that no longer exists, fell back to three retired `theme-announcement-*` ids, and every round and combat card rendered as Tan whatever the setting said.
- **Round cards showed a translation key**: The round label asked for `RoundCycling` where the string is `roundCycling`. Foundry's lookup is case-sensitive, so an unlabelled round card rendered `coffee-pub-crier.RoundCycling` instead of `Round 3`.
- **Monsters no longer roll death saves**: A non-player actor at zero hit points reads as dead. dnd5e's NPC schema carries a `death` field and would happily roll against it, but no table plays that way — and health became something an NPC card can show.
- **NPC obfuscation survived the render**: The GM's copy of an obfuscated card had its real name restored by a `renderChatMessageHTML` hook. A parts card re-renders from its stored composition a tick after Foundry paints it, and that swap discards anything a hook decorated. It is a registered render pass now.
- **A failed post no longer counts as delivered**: Blacksmith's `post()` logs and returns null rather than throwing. Crier marks a lifecycle event delivered, advances the round number and plays a sound once delivery returns, so a silent null would have consumed the event and lost the card with it.
- **Test harness**: Both suites gated on the four announcement settings by name and threw on the first read once those were merged.

### Removed

- **Portrait Background and Portrait Scale**: Both existed because transparent token art dissolved into the card and needed a ground and room to breathe. Blacksmith already sits every card image on a ground pitched at the tile fill, and the two layouts pick appropriate parts rather than scaling one image.
- **Hide Player Name**: Who is running a character is not what a turn card is for. The setting and the name are both gone.
- **Dead code**: The unreachable third turn layout, three no-op message-intercept functions, the inline-style workaround that existed only to paint the portrait tile, and a per-card actor lookup whose result was never used.


## [13.1.1]

### Changed

- **Status rows now come from Blacksmith**: The effect list is built from `blacksmith.api.effects.getDisplayEffects()` rather than from Crier's own copy of Bibliosoph's logic. Crier had been classifying `outcomeBurst` flags, indexing condition names, formatting durations and re-deriving the "via …" back-link itself — roughly 230 lines reimplementing decisions that belong to the modules that own them. One call replaces all of it, and rows gain severity and a live bleed (`Injury · Moderate · Blinded · 2 HP/turn · 29 minutes`) that Crier never had to learn how to compute.
- **One row per penalty**: Roll penalties are still summed per stat, but two different stats no longer share a line. Joining them with a middot borrowed the separator the effect rows use for facets of a single thing, so `−3 to ability checks · −1 to saving throws` read as one statement rather than two independent penalties.
- **Block heading**: **Lingering Injuries and Conditions** is now **Penalties and Duration**, which describes what is actually under it. The old heading promised a second list of conditions directly beneath the first one and delivered arithmetic — and because the two blocks toggle independently, it had to make sense with no effect list above it.
- **Hover target**: The tooltip moved from the effect icon to the whole row. Names and details ellipsize in a narrow chat sidebar, and the tooltip is how a clipped row gets read, so the text being cut off is a likelier target than the icon beside it.

### Fixed

- **GM-authored effect text leaked to the table**: Turn cards enriched every effect description into their hover tooltips with no permission check. A turn card is composed once by the announcing GM and stored as ChatMessage content, then delivered verbatim to everyone — so a permission-aware check would have run as the GM and passed anyway. Descriptions are now explicitly disabled for this surface; the visible detail line carries type, severity, condition, bleed and duration, none of which is GM-only.
- **Relief countdown ordered by the wrong unit**: Remaining time was sorted on a raw number that means rounds for combat-based effects and seconds for everything else, so a 20-round effect could sort ahead of something that lifts sooner. Ordering now converts through the unit the API reports alongside the value.
- **Durations on lingering wounds**: Crier's own duration formatter read Foundry's duration field as an effect's lifetime. Bibliosoph has since re-modelled lingering injuries so that field governs only the bleed phase, leaving the wound itself permanent until treated. Blacksmith's formatter is now the single source, so a wound that is still bleeding correctly shows no countdown instead of an invented one.

### Removed

- **Bleed preview row**: The summed *Bleeding — N HP* line is gone from the penalty block. It reimplemented Bibliosoph's damage floor locally and accumulated across effects against falling HP where Bibliosoph computes each against current HP, so the total could disagree with the effects it summarized. The number now appears per effect as `2 HP/turn`, phrased by the module that owns the arithmetic.

## [13.1.0]

### Added

- **Complete combat lifecycle announcements**: Crier can independently announce combat start, new rounds, turns, and combat end, with configurable labels and sounds. Start means the combat actually started; deleting an unstarted setup does not announce an end.
- **Reusable test harness**: `testing/test-harness.js` is now the launcher for live Foundry suites. The lifecycle timing suite is isolated by combat ID, refuses to disturb an active encounter, verifies exact card order, and cleans up only its own messages.
- **Dedicated combat template**: Combat-start and combat-end cards now render through `templates/combat.hbs` instead of borrowing the round-card template.
- **Combat announcement appearance**: Added dedicated theme and icon pickers for combat-start and combat-end cards instead of inheriting the round-card appearance.

### Fixed

- **Transactional delivery**: Round/turn identity is rechecked at the final chat-write boundary. Delivery markers and sounds now follow successful message creation, so rendering or chat failures do not consume an announcement.
- **Multiple combats**: Held cards, settle timers, queues, and previous-combatant state are isolated by combat ID.
- **End cleanup**: Foundry v13 combat deletion—including the confirmed `Combat#endCombat()` path—cancels obsolete held round/turn work and produces one end card; deleting an unstarted setup remains silent.
- **Combat-start timing**: Treats Foundry's `combatStart` hook as authoritative even though Foundry emits it immediately before applying the round-one update.
- **Top-of-round turns**: Round changes now schedule the current turn card even when Foundry diffs an unchanged `turn: 0` out of the update payload.
- **Loaded-world timing tests**: The harness waits for expected deliveries with a bounded timeout, preventing slow effect enrichment from spilling cards into the next assertion.
- **Foundry v13 chat rendering**: Uses `renderChatMessageHTML` instead of the deprecated `renderChatMessage` hook.
- **Settings organization and terminology**: Round and turn controls now sit under explicit Appearance, Announcement, Content, and Missed Turns subsections. Visible labels consistently use Announce, Theme, Icon, Sound, and Label terminology; the legacy nonfunctional Compact Messages control is hidden.

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
