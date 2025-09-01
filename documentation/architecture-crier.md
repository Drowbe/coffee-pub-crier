# Coffee Pub Crier - Architecture Documentation

## Overview

Coffee Pub Crier is a FoundryVTT module that automatically posts turn and round cards to the chat when combat changes occur. It integrates with the Blacksmith API for enhanced functionality and follows FoundryVTT's combat lifecycle.

## Core Components

### 1. Module Structure
- **Main Script**: `scripts/crier.js` - Core functionality
- **Settings**: `scripts/settings.js` - Module configuration
- **Constants**: `scripts/const.js` - Module constants
- **Templates**: `templates/turns.hbs` and `templates/rounds.hbs` - Handlebars templates for cards
- **Styles**: `styles/module.css` - Visual styling

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
Hooks.once('ready') → Register hooks, load templates, initialize lastCombatant
```

### 2. Combat Change Detection

The module uses the `updateCombat` hook to detect combat changes:

```javascript
updateCombat hook → processCombatChange() → {
    if (roundChanged) → Create round card + set roundInitialized = false
    if (turnChanged) → Check roundInitialized flag → Create turn card
}
```

### 3. Round Initialization System

**Key Innovation**: The `roundInitialized` flag prevents premature turn cards.

#### Round Change Logic:
1. Set `roundInitialized = false`
2. Create round card (if enabled)
3. Exit (don't process turn changes)

#### Turn Change Logic:
1. If `roundInitialized = false`:
   - Check if all initiatives are rolled
   - If not: Skip turn card creation
   - If yes: Set `roundInitialized = true` and create turn card
2. If `roundInitialized = true`:
   - Create turn card immediately (ignore initiative checks)

### 4. State Management

#### Global Variables:
- `lastCombatant`: Tracks the last combatant to prevent duplicate messages
- `roundInitialized`: Boolean flag indicating if current round has all initiatives rolled (persistent setting)
- `turnTemplate`, `roundTemplate`: Loaded Handlebars templates

#### Persistent State:
- `roundInitialized` is stored as a hidden FoundryVTT setting that persists across sessions
- Local cache is maintained for performance, synced with persistent setting
- Automatically resets to `false` on round changes

#### State Transitions:
```
Round Change → roundInitialized = false
All Initiatives Rolled → roundInitialized = true
Turn Changes (when initialized) → Create turn cards
```

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

### 2. Round Cards
- Triggered by round changes
- Uses `createNewRoundCard()` → Handlebars template
- Shows current round number and styling

## Edge Case Handling

### 1. New Combatant Added Mid-Round
- If `roundInitialized = true`: Honor actual turn order, show turn cards normally
- If `roundInitialized = false`: Wait for all initiatives before showing any turn cards

### 2. Initiative Roll Timing
- Turn cards only appear after all combatants have rolled initiative
- Prevents multiple turn cards during initiative rolling phase

### 3. Combat State Changes
- Tracks `lastCombatant` to prevent duplicate messages
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
