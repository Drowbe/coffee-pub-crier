# Coffee Pub Crier - Architecture Documentation

## Overview

Coffee Pub Crier owns configurable combat-start, round-start, turn-start, and combat-end chat announcements. It integrates with the Blacksmith API for presentation and utilities while keeping announcement lifecycle behavior in Crier.

## Core Components

### 1. Module Structure
- **Main Script**: `scripts/crier.js` - Core functionality
- **Settings**: `scripts/settings.js` - Module configuration
- **Constants**: `scripts/const.js` - Module constants
- **Templates**: `templates/turns.hbs` and `templates/rounds.hbs` - Handlebars templates for cards
- **Styles**: `styles/default.css` with component imports such as `styles/turns.css` - Visual styling

### 2. Blacksmith API Integration

The module uses the Blacksmith External API for:
- **Global Objects**: Direct access to `BlacksmithUtils`, `BlacksmithModuleManager`, `BlacksmithHookManager`, `BlacksmithConstants`
- **Hook Management**: Uses `BlacksmithHookManager.registerHook()` for proper lifecycle management
- **Logging**: Uses `BlacksmithUtils.postConsoleAndNotification()` for consistent logging
- **Settings**: Uses `BlacksmithUtils.getSettingSafely()` for safe setting retrieval
- **Sound**: Uses `BlacksmithUtils.playSound()` with Blacksmith constants

## Core Logic Flow

### 1. Initialization
```javascript
Hooks.once('init') → BlacksmithModuleManager.registerModule()
Hooks.once('ready') → Register hooks, load templates, initialize per-combat state
```

### 2. Combat Change Detection

The module uses the `updateCombat` hook to detect combat changes, and the combatant hooks to notice when a held announcement can go out:

```javascript
updateCombat hook → processCombatChange() → {
    if (!isOrderSettled) → hold the due cards, return
    else                 → announceCombatChange({roundCard, turnCard})
}

updateCombatant (initiative) ┐
deleteCombatant             ─┴→ flushHeldAnnouncement() → announceCombatChange()
```

### 3. Round Initialization System

No card — round or turn — is posted until combat has started and every combatant has rolled initiative. `isOrderSettled(combat)` is that condition, and it reads live combat state:

- `allInitiativesRolled(combat)` — true when the tracker is non-empty and no combatant is missing a finite initiative. `0` and negative values are real rolls; `null`, `undefined`, `NaN`, and unparseable values are not.
- `combatantsMissingInitiative(combat)` — who is being waited on, for the debug log.

A combatant added mid-round has no initiative, so cards pause until it rolls. This is deliberate: the turn we would announce is about to be re-sorted out from under it. `postNewTurnCard()` re-checks the same condition, since it is the one funnel every turn card passes through and no caller should be able to route around it.

#### Holding and releasing

Cards blocked by an unsettled order are **held, not dropped**. Per-combat maps record due cards and settle timers, so activity in another combat cannot overwrite them. A per-combat promise queue serializes build/post work.

The release is the part that is easy to get wrong. Rolling initiative writes to **Combatant** documents, so `updateCombat` never fires for it; Foundry's own follow-up `combat.update({turn})` inside `rollInitiative` diffs down to nothing whenever the current combatant keeps its slot, and fires no hook either. `flushHeldAnnouncement()` therefore hangs off the combatant hooks instead:

- `updateCombatant` — when an `initiative` change settles the order
- `deleteCombatant` — when the combatant being waited on leaves the tracker

Without those, a card held at the top of a fight waits for an event that never arrives.

#### The settle window

A round change on a reroll-every-round table is not one event, it is a cascade, and every step of it arrives *after* the `updateCombat` that announces the round:

```
updateCombat {round: N, turn: 0}     ← Crier hears about it here
  → tracker clears initiative for the new round
  → each combatant rolls (Combatant updates, not Combat)
  → tracker sets turn to slot 0, because Foundry kept whoever
    was current before the rolls — who may now be anywhere
```

Judging at any point before the end of that cascade gets it wrong, so three rules keep Crier out of it:

1. **A round change is never judged on the spot.** It is held for `ORDER_SETTLE_DELAY_MS` (250 ms) and reconsidered when that expires.
2. **A change arriving while a window is open joins it** rather than announcing on its own, and restarts the clock. The window closes when things have been quiet for 250 ms.
3. **A card that cannot be delivered goes back on hold.** Building a card awaits settings, portraits, effects and `enrichHTML`, and the order can come apart during it. `announceCombatChange()` checks the expected round and active combatant immediately before each chat write and re-holds unposted work.

None of this is a guess at the answer — `isOrderSettled()` still has to pass when the window closes, and the combatant hooks still cover anything slower than the delay. Turn advances outside a window announce immediately, with no delay.

All three failure modes were observed in play. Without rule 1 the round card — which builds quickly — won the race and announced a round nobody had rolled for, ahead of the end-of-round stats. Without rule 3 the turn card — which builds slowly — lost the same race, was correctly refused at the funnel, then vanished because nothing held it. Without rule 2 the turn card posted for the pre-roll combatant and the tracker's correction then read as a second turn change: two cards, one turn.

#### `roundInitialized`

A persisted record that the order settled during this round, kept in step on every turn change. It is **not** a gate — an earlier version used it as one, and because it only reset on a round change, any combatant added mid-round was waved through unchecked. It is written only by a GM client; the setting is world-scoped, so a player writing it rejects unhandled and drifts from the local cache.

### 4. State Management

#### Runtime state:
- `lastCombatants`: Per-combat previous-combatant state used for duplicate and missed-turn detection
- `heldAnnouncements` / `announceTimers`: Per-combat unsettled work
- `deliveryQueues`: Per-combat serialization for hook and timer work
- `deliveredLifecycleEvents`: Deduplication for overlapping end/delete hooks
- `roundInitialized`: Boolean flag indicating if current round has all initiatives rolled (persistent setting)
- `turnTemplate`, `roundTemplate`: Loaded Handlebars templates

#### Persistent State:
- `roundInitialized` is stored as a hidden FoundryVTT setting that persists across sessions
- Local cache is maintained for performance, synced with persistent setting
- Automatically resets to `false` on round changes

#### State Transitions:
```
Round Change      → roundInitialized = false
Turn Change       → roundInitialized = allInitiativesRolled(combat)
Any Turn Card     → posted only if combat.started && allInitiativesRolled(combat)
```

Combat lifecycle cards use `combatStart` and both `endCombat`/`deleteCombat`. Only the highest-role active GM posts these table-wide events. Ending a combat clears held round/turn work; the end/delete pair is deduplicated. Sounds run only after the corresponding chat message is successfully created.

## Hook Registration

Hooks are registered in the `ready` phase using Blacksmith's hook manager:

```javascript
const updateCombatHookId = BlacksmithHookManager.registerHook({
    name: 'updateCombat',
    description: 'Coffee Pub Crier: Process turn changes and post messages',
    context: MODULE.ID,
    priority: 2,
    callback: (combat, update, context, userId) => { ... }
});
```

## Card Generation Process

### 1. Turn Cards
- Triggered by turn changes (when round is initialized)
- Uses `postNewTurnCard()` → `generateCards()` → Handlebars template
- Includes combatant info, token data, and styling
- Optionally builds a read-only Status and Conditions list from the combatant actor at card-post time

#### Status and Conditions

`buildActiveEffectGroups(actor)` includes active Bibliosoph outcomes, temporary effects, effects carrying status IDs, and effects whose localized names match registered dnd5e conditions. Disabled and suppressed effects are excluded.

The template renders all qualifying rows beneath one **Status and Conditions** heading. Each row contains:

- A compact effect icon with enriched rules text on hover
- A single-line effect name
- A single-line detail containing the localized type, context, and remaining duration

Bibliosoph `outcomeBurst` flags distinguish injuries, criticals, and fumbles. Unflagged dnd5e conditions and temporary effects use the `Effect` type. Long names and details are truncated visually without changing the content stored in the chat message.

#### While This Lasts

`buildTurnPenaltyReport(actor, effects)` reads the same effect set and reports what it costs the combatant on this turn. Up to three rows:

1. **Roll penalties.** Numeric `effect.changes` totalled per stat across every listed effect, over the five dnd5e paths in `TURN_PENALTY_STATS` (`system.bonuses.All.attack`, `system.bonuses.All.damage`, `system.attributes.ac.bonus`, `system.bonuses.abilities.check`, `system.bonuses.abilities.save`). One summed line — the number they are about to roll with. Formula bonuses such as `1d4` cannot be summed and are skipped; they still appear on their own effect row above.
2. **Bleed.** `flag.tick` is a percentage of max HP, resolved against the actor. The arithmetic mirrors Bibliosoph's `damageFor` — at least 1 HP, never the combatant's last point — and walks multiple ticks in order because Bibliosoph applies them sequentially against falling health.
3. **Time remaining.** `remainingTimeLabel(effect)`, listed soonest-first and only for effects that contributed a penalty or a tick above. Permanent effects contribute no row, and the whole block is dropped when nothing costs the combatant anything — penalties that cancel out leave no bare countdown behind.

`remainingTimeLabel()` reports each duration in the unit that means something at the table, and is shared with the status rows above so both blocks agree:

- Combat durations (`duration.type` of `turns`) use Foundry's own `duration.label` (`3 Rounds`), since Foundry's encoding of `remaining` for turn-based effects is its own.
- Time durations (`seconds`) — which is how Bibliosoph authors every affliction — read as rounds up to 60 seconds, then minutes, hours, and days. A flat `remaining / 6` would render a ten-minute wound as "97 rounds remain": true, and unusable.

The block is display-only and applies nothing. Bibliosoph owns applying, ticking, expiring, and treating; ticks land on its own `updateCombat` handler on the active GM. The report is gated by **Show Turn Penalties** and shares the **Show Active Effects For** audience selector.

### 2. Round Cards
- Triggered by round changes
- Uses `createNewRoundCard()` → Handlebars template
- Shows current round number and styling

## Edge Case Handling

### 1. New Combatant Added Mid-Round
- Turn cards pause until the new combatant has rolled, then resume in the actual turn order

### 2. Initiative Roll Timing
- Turn cards only appear after all combatants have rolled initiative
- Prevents multiple turn cards during initiative rolling phase

### 3. Combat State Changes
- Tracks previous-combatant state per combat to prevent duplicate messages
- Resets tracking on round changes
- Handles defeated combatants appropriately

## Template System

### Turn Template (`templates/turns.hbs`)
- Renders individual turn cards
- Includes combatant name, portrait, token info
- Uses Blacksmith styling constants

### Round Template (`templates/rounds.hbs`)
- Renders round announcement cards
- Shows current round number
- Uses Blacksmith styling constants

## Settings Integration

Settings are registered using Blacksmith's system:
- Turn card display toggle
- Active effects display toggle and Players/NPCs & Monsters/Both selector
- Round card display toggle
- Sound settings (using Blacksmith constants)
- Visual styling options

## Error Handling

- No fallbacks for Blacksmith API (Blacksmith is required dependency)
- Comprehensive logging for debugging
- Graceful handling of missing templates or data

## Performance Considerations

- Templates loaded once during initialization
- Minimal processing during combat updates
- Efficient state tracking with simple boolean flags
- Hook priority set to 2 for early execution

## Future Considerations

- The architecture supports easy addition of new card types
- Template system allows for easy visual customization
- Hook system allows for easy integration with other modules
- State management system can be extended for more complex scenarios
