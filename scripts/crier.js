// ================================================================== 
// ===== GET IMPORTS AND CONSTANTS ==================================
// ================================================================== 

// -- Import COMMON Functions --
import { wrapNumber, getDocData, getDefaultPermission, getProtoToken, getUsers, getPermissionLevels } from './common.js';

// -- Import MODULE variables --
import { MODULE, CRIER  } from './const.js';


// ================================================================== 
// ===== BEGIN: BLACKSMITH API REGISTRATIONS ========================
// ================================================================== 
import { BlacksmithAPI } from '/modules/coffee-pub-blacksmith/api/blacksmith-api.js';
Hooks.once('ready', () => {
    try {
        // Register your module with Blacksmith
        BlacksmithModuleManager.registerModule(MODULE.ID, {
            name: MODULE.NAME,
            version: MODULE.VERSION
        });
    } catch (error) {
        console.error('❌ Failed to register ' + MODULE.NAME + ' with Blacksmith:', error);
    }
});
// ================================================================== 
// ===== END: BLACKSMITH API REGISTRATIONS ==========================
// ================================================================== 






// -- Import special page variables --

// Register settings so they can be loaded below.
import { registerSettings } from './settings.js';

// -- Set Page variables --
// Grab the Templates
const turn_template_file = `modules/${MODULE.ID}/templates/turns.hbs`,
	round_template_file = `modules/${MODULE.ID}/templates/rounds.hbs`;

let turnTemplate, roundTemplate;
// Set the last combatant
const lastCombatant = {
	combatant: null,
	get tokenId() { return this.combatant?.token?.id; },
	spoke: false
};

// Track whether the current round has been properly initialized with all initiatives rolled
// This is now stored as a persistent setting, but we keep a local cache for performance
let roundInitialized = false;

// Helper functions to sync with persistent setting
function getRoundInitialized() {
    return game.settings.get(MODULE.ID, CRIER.roundInitialized);
}

function setRoundInitialized(value) {
    game.settings.set(MODULE.ID, CRIER.roundInitialized, value);
    roundInitialized = value; // Keep local cache in sync
}

const TURN_SETTINGS_CACHE_TTL = 5000;
const TURN_SETTING_KEYS = {
    turnLayout: CRIER.turnLayout,
    turnIconStyle: CRIER.turnIconStyle,
    turnCardStyle: CRIER.turnCardStyle,
    roundIconStyle: CRIER.roundIconStyle,
    roundCardStyle: CRIER.roundCardStyle,
    portraitStyle: CRIER.portraitStyle,
    tokenBackground: CRIER.tokenBackground,
    tokenScale: CRIER.tokenScale,
    hidePlayer: CRIER.hidePlayer,
    hideAbilities: CRIER.hideAbilities,
    hideHealth: CRIER.hideHealth,
    hideBloodyPortrait: CRIER.hideBloodyPortrait,
    turnLabel: CRIER.turnLabel,
    obfuscateNPCs: CRIER.obfuscateNPCs
};

let turnSettingsCache = null;
let turnSettingsCacheTimestamp = 0;

async function getTurnCardSettings() {
    const now = Date.now();
    if (!turnSettingsCache || (now - turnSettingsCacheTimestamp) > TURN_SETTINGS_CACHE_TTL) {
        const entries = [];
        for (const [name, key] of Object.entries(TURN_SETTING_KEYS)) {
            try {
                const value = await getSettingSafely(MODULE.ID, key);
                entries.push([name, value]);
            } catch (error) {
                BlacksmithUtils.postConsoleAndNotification(
                    MODULE.NAME,
                    `SETTINGS CACHE: Failed to load ${name}`,
                    { key, error: error?.message ?? error },
                    true,
                    true
                );
                entries.push([name, null]);
            }
        }
        turnSettingsCache = Object.fromEntries(entries);
        turnSettingsCacheTimestamp = now;
    }
    return turnSettingsCache;
}

// ================================================================== 
// ===== NEW BLACKSMITH INTEGRATION =================================
// ================================================================== 

// Helper function to safely access settings using new Blacksmith API
async function getSettingSafely(moduleId, settingKey, defaultValue = null) {
    return BlacksmithUtils.getSettingSafely(moduleId, settingKey, defaultValue);
}

function isDebugEnabled() {
    return typeof COFFEEPUB !== 'undefined' && COFFEEPUB?.blnDebugOn === true;
}

function debugLog(message, payloadFactory) {
    if (!isDebugEnabled()) return;
    const payload = typeof payloadFactory === 'function' ? payloadFactory() : payloadFactory;
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, message, payload ?? {}, true, false);
}



// REQUIRED: Access Blacksmith API and initialize your module
Hooks.once('ready', async () => {
    try {
        // Initialize templates
        debugLog('READY: Loading templates', () => ({ turn: turn_template_file, round: round_template_file }));
        
        // Check if foundry.utils.getTemplate exists
        debugLog('READY: Checking foundry.utils.getTemplate', () => ({
            hasFoundry: !!foundry,
            hasUtils: !!foundry?.utils,
            hasGetTemplate: !!foundry?.utils?.getTemplate
        }));
        
        try {
            if (foundry?.utils?.getTemplate) {
                turnTemplate = await foundry.utils.getTemplate(turn_template_file);
                debugLog('READY: Turn template loaded via foundry.utils.getTemplate', () => ({ success: !!turnTemplate, type: typeof turnTemplate }));
            } else {
                // Fallback to global getTemplate
                turnTemplate = await getTemplate(turn_template_file);
                debugLog('READY: Turn template loaded via global getTemplate', () => ({ success: !!turnTemplate, type: typeof turnTemplate }));
            }
        } catch (err) {
            debugLog('READY: Turn template failed', () => ({ error: err.message }));
        }
        
        try {
            if (foundry?.utils?.getTemplate) {
                roundTemplate = await foundry.utils.getTemplate(round_template_file);
                debugLog('READY: Round template loaded via foundry.utils.getTemplate', () => ({ success: !!roundTemplate, type: typeof roundTemplate }));
    } else {
                // Fallback to global getTemplate
                roundTemplate = await getTemplate(round_template_file);
                debugLog('READY: Round template loaded via global getTemplate', () => ({ success: !!roundTemplate, type: typeof roundTemplate }));
            }
        } catch (err) {
            debugLog('READY: Round template failed', () => ({ error: err.message }));
        }
        
        // Initialize last combatant
        lastCombatant.combatant = game.combat?.combatant ?? null;
        
        // Register settings now that Blacksmith is ready
        registerSettings();
        
        // Initialize round initialization flag from persistent setting (after settings are registered)
        roundInitialized = getRoundInitialized();
        
        // Register hooks via BlacksmithHookManager
        const preUpdateCombatHookId = BlacksmithHookManager.registerHook({
            name: 'preUpdateCombat',
            description: 'Coffee Pub Crier: Detect combat changes and calculate deltas',
            context: MODULE.ID,
            priority: 2,
            callback: async (combat, updateData, context) => {
                const roundDelta = updateData.round !== undefined ? updateData.round - combat.round : 0,
                    turnCount = combat.turns.length,
                    roundAdjust = roundDelta * turnCount,
                    forward = roundDelta >= 0,
                    turnDelta = updateData.turn !== undefined ? updateData.turn - combat.turn : 0,
                    // Messy calculation for round changes
                    turnDeltaWrapped = roundDelta == 0 ? turnDelta : wrapNumber(roundAdjust + turnDelta, forward ? 0 : -(turnCount - 1), forward ? turnCount - 1 : 0);

                // Add custom properties to the context object
                context.crier = {
                    turnShift: turnDeltaWrapped,
                    roundShift: roundDelta,
                    combat: combat.id,
                };

                // Check if this is an initiative update and if all initiatives are now rolled
                if (!getRoundInitialized() && updateData.initiative !== undefined) {
                    const combatantsArray = Array.from(combat.combatants.values());
                    const allHaveInitiative = combatantsArray.every(combatant => 
                        combatant.initiative !== null && combatant.initiative !== undefined
                    );
                    
                    // If all initiatives are now rolled, trigger turn card creation
                    if (allHaveInitiative) {
                        debugLog('HOOK: preUpdateCombat - all initiatives rolled, triggering turn card');
                        // Process turn change to create the first turn card
                        await processCombatChange(combat, updateData, context, game.user.id, true, false);
                    }
                }
            }
        });
        
        const updateCombatHookId = BlacksmithHookManager.registerHook({
            name: 'updateCombat',
            description: 'Coffee Pub Crier: Process turn changes and post messages',
            context: MODULE.ID,
            priority: 2,
            callback: (combat, update, context, userId) => {
                // Check if turn or round is being updated
                const hasTurnUpdate = update.turn !== undefined;
                const hasRoundUpdate = update.round !== undefined;
                
                // Get the current values from the combat object
                const currentTurn = combat.turn;
                const currentRound = combat.round;
                
                // Get the new values from the update object
                const newTurn = update.turn;
                const newRound = update.round;
                
                // Determine if there's an actual change
                // If update.turn exists, it means the turn was changed
                const turnChanged = hasTurnUpdate;
                const roundChanged = hasRoundUpdate;
                
                // Only process if there's an actual turn or round change
                if (turnChanged || roundChanged) {
                    // Reset lastCombatant tracking if a new round starts
                    if (roundChanged) {
                        debugLog('HOOK: New round detected, resetting lastCombatant and roundInitialized');
                        lastCombatant.combatant = null;
                        lastCombatant.spoke = false;
                        setRoundInitialized(false);
                    }
                    
                    // Process round changes (round cards) and turn changes (turn cards) separately
                    return processCombatChange(combat, update, context, userId, turnChanged, roundChanged);
                }
            }
        });
        
        const renderChatMessageHookId = BlacksmithHookManager.registerHook({
            name: 'renderChatMessage',
            description: 'Coffee Pub Crier: Intercept and modify chat messages',
            context: MODULE.ID,
            priority: 2,
            callback: (cm, html, options) => {
                debugLog('HOOK: renderChatMessage hook called', () => ({ messageId: cm.id }));
                return chatMessageEvent(cm, html, options);
            }
        });
        
    } catch (error) {
        console.error('❌ Coffee Pub Crier: Failed to initialize:', error);
    }
});

// ================================================================== 
// ===== REGISTER COMMON ============================================
// ================================================================== 

// Note: Settings and hooks will be registered in the ready hook when Blacksmith is ready

// ================================================================== 
// ===== FUNCTIONS ==================================================
// ================================================================== 


// ************************************
// ** HIDE CONTENT
// ************************************

/**
 * @param {Element} content
 */
function hideContent(content) {
	if (content) {
		content.replaceChildren();
		content.style.display = 'none';
	}
}

// ************************************
// ** INTERCEPT NEW TURN MESSAGE
// ************************************

/**
 * @param {ChatMessage} cm
 * @param {Element} html
 * @param {Element} main
 */

// DEBUG: I TURNED THIS OFF DUE TO A BUG BEFORE A GAME!!!!!
function interceptNewTurnMessage(cm, html, main) {
	// const compact = game.settings.get(MODULE.ID, CRIER.compact);
	// //const compact = true;
	// if (compact) main.classList.add('compact');
}


// ************************************
// ** INTERCEPT NEW ROUND MESSAGE
// ************************************
/**
 * @param {ChatMessage} cm
 * @param {Element} html
 * @param {Element} main
 */
function interceptNewRoundMessage(cm, html, main) {
    // Round cards now use Blacksmith framework - template handles structure
    // This function is kept for compatibility but no longer manipulates DOM
    // The template (rounds.hbs) now includes:
    // - hide-header span
    // - .blacksmith-card with theme
    // - .card-header with icon and message
    // - data attributes for combat/round
    
    // Data attributes are already in the template, so no migration needed
    // Blacksmith framework handles styling
    if (!main) return;
    // Ensure crier class is present (already added in chatMessageEvent, but keep for safety)
    main.classList.add('coffee-pub');
}

// ************************************
// ** Intercept MISSED TURNS
// ************************************

/**
 * @param {ChatMessage} cm
 * @param {Element} html
 * @param {Element} main
 */
function interceptMissedTurnMessage(cm, html, main) {
	// Missed turn cards now use Blacksmith framework - template handles structure
	// This function is kept for compatibility but no longer manipulates DOM
	// The template (created in createMissedTurnCard) now includes:
	// - hide-header span
	// - .blacksmith-card with theme-orange
	// - .card-header with icon and message
	// - Blacksmith framework handles styling
	
	// Data attributes are already in the template, so no migration needed
	// Blacksmith framework handles styling
	if (!main) return;
	// Ensure crier class is present (already added in chatMessageEvent, but keep for safety)
	main.classList.add('coffee-pub');
}

// ************************************
// ** LAST COMBAT FROM
// ************************************

function updateLastCombatantFromMsg(cm, flags) {
	lastCombatant.spoke = false;
	lastCombatant.combatant = game.combat?.getCombatantByToken(flags.token) ?? null;
}


// ************************************
// ** CHAT MESSAGE
// ************************************
/**
 * @param {ChatMessage} cm
 * @param {HTMLElement|JQuery|Array} html
 * @param {Object} _options
 */
function chatMessageEvent(cm, html, _options) {
	// v13: Detect and convert jQuery to native DOM if needed
	let nativeHtml = html;
	if (html && (html.jquery || typeof html.find === 'function')) {
		nativeHtml = html[0] || html.get?.(0) || html;
	}
	
	// If html was an array, extract first element
	if (Array.isArray(nativeHtml)) {
		nativeHtml = nativeHtml[0] || nativeHtml;
	}
	
	const isGM = game.user.isGM;
	const cmd = getDocData(cm);
	const flags = cmd.flags?.[MODULE.ID];

	if (!flags) {
		if (isGM && cmd.speaker?.token === lastCombatant.tokenId)
			lastCombatant.spoke = true;
		return;
	}

	const main = nativeHtml.closest('[data-message-id]');
	nativeHtml?.classList.add('crier', 'coffee-pub');

	if (flags.missedTurn){
	// They want to notify on missed turn and it has been missed
	// check compress and see chose the option to remove speaker and timestamp
		interceptMissedTurnMessage(cm, nativeHtml, main);
	} else if (flags.turnAnnounce || flags.token) {
		updateLastCombatantFromMsg(cm, flags);
		// check compress and see chose the option to remove speaker and timestamp
		//interceptNewTurnMessage(cm, nativeHtml, main);
	}
	else if (flags.roundCycling) {
		// check compress and see chose the option to remove speaker and timestamp
		interceptNewRoundMessage(cm, nativeHtml, main);
	}

	main?.querySelector('.whisper-to')?.remove();
	// De-obfuscate name for GM
	if (isGM && cm.getFlag(MODULE.ID, 'obfuscated')) {
		const combatId = cm.getFlag(MODULE.ID, 'combat'),
			combatantId = cm.getFlag(MODULE.ID, 'combatant'),
			combat = game.combats.get(combatId),
			combatant = combat?.combatants.get(combatantId);
		if (combatant?.token) {
			const name = nativeHtml.querySelector('.actor .name-box .name');
			if (name) name.textContent = combatant.token.name;
			nativeHtml.classList.add('obfuscated');
		}
	}
}

// ************************************
// ** MISSED TURN
// ************************************

let lastReported = {};

/* ----- MISSED TURN ----- */
async function createMissedTurnCard(data, context) {
    if (data.last?.spoke || data.last == null) return; // They spoke, nothing more to do.
    const preUpdate = context.crier;
    if (preUpdate?.combat === game.combats.active.id) {
        // Rolling back
        if (preUpdate.roundShift < 0 || preUpdate.turnShift < 0 && preUpdate.roundShift <= 0)
            return;
    }
    const { last, combat, combatant } = data;
    if (lastReported.combat !== undefined && combat.id !== lastReported.combat) return;
    if (last.token?.id === combatant?.token?.id) return; // Same character's turn?
    if (lastReported.id === last.token?.id) return;
    lastReported = { id: last.token?.id, combat: combat.id };
    const scene = combat.scene,
        actor = last.actor?.id,
        token = last.token?.id,
        alias = last.name;
    // Notify of MISSED TURN if the setting is enabled.
    const strMissedTurnPlayer = data.last.combatant.name;
	if (await getSettingSafely(MODULE.ID, CRIER.missedTurnNotification, false)) {
        ui.notifications.info("Did " + strMissedTurnPlayer + " miss their turn?", {permanent: false, console: false});
    }
    // Use Blacksmith framework for missed turn cards
    const content = `<span style="visibility: hidden">coffeepub-hide-header</span>
<div class="blacksmith-card theme-orange">
	<div class="card-header">
		<i class="fa-solid fa-fire"></i> Missed Turn
	</div>
	<div class="section-content">
		<span class="missed-combatant">${data.last.combatant.name}</span> <span class="missed-turn-text">may have missed a turn.</span>
	</div>
</div>`;
    const msgData = {
        content: content,
        rollMode: 'selfroll',
        whisper: [...game.users.filter(u => u.isGM)],
        speaker: { scene, actor, token, alias },
        flags: {
            [MODULE.ID]: { missedTurn: true, token, actor, combatant: last.combatant.id }
        },
        user: game.user.id,
    };
    return msgData;
}

// ************************************
// ** GENERATE CARDS
// ************************************

async function generateCards(info, context) {
	debugLog('GENERATE CARDS: Starting', () => ({ name: info.name }));
	
	// Noitify of MISSED TURN if the setting is enabled.
	const msgs = [];
	if (await getSettingSafely(MODULE.ID, CRIER.missedKey, true)) {
		const msg = await createMissedTurnCard(info, context);
		if (msg) msgs.push(msg);
	}

	if (getDocData(info.combatant).defeated) {
		debugLog('GENERATE CARDS: Skipping - combatant defeated');
		return msgs; // undesired
	}
	if (info.hidden) {
		debugLog('GENERATE CARDS: Skipping - combatant hidden');
		return msgs; // don't show card for hidden monsters
	}
	if (info.isNPC && info.tokenDoc?.hidden) {
		debugLog('GENERATE CARDS: Skipping - NPC token hidden on canvas');
		return msgs; // don't show card for NPCs hidden on canvas
	}
	if (info.last?.combatant != null && info.last.combatant.id === info.combatant.id) {
		return msgs; // don't report the same thing multiple times
	}

	const speaker = info.obfuscated ? { user: game.user.id } : ChatMessage.getSpeaker({ token: info.token?.document, actor: info.actor });
	const minPerm = getPermissionLevels().OBSERVER;
	const defaultVisible = info.hidden ? false : (getDefaultPermission(info.actor ?? info.tokenDoc ?? info.combatant) ?? 0) >= minPerm;

	if (!turnTemplate) {
		debugLog('GENERATE CARDS: ERROR - turnTemplate is not loaded');
		return msgs;
	}
	
	const renderedContent = turnTemplate(info, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true });
	
	const cardData = {
		content: renderedContent,
		speaker,
		rollMode: defaultVisible ? 'publicroll' : 'gmroll',
		whisper: defaultVisible ? [] : getUsers(info.actor, minPerm),
		flags: {
			[MODULE.ID]: {
				turnAnnounce: true,
				token: info.token?.id,
				round: info.round,
				turn: info.turn,
				combat: info.combat.id,
				combatant: info.combatant.id,
				obfuscated: info.obfuscated,
				turnCardStyle: info.turnCardStyle,
				turnIconStyle: info.turnIconStyle,
				roundCardStyle: info.roundCardStyle,
				roundIconStyle: info.roundIconStyle
			}
		},
	};

	ChatMessage.applyRollMode(cardData, !info.hidden ? 'publicroll' : 'gmroll')
	msgs.push(cardData);
	debugLog('GENERATE CARDS: Created card', () => ({ count: msgs.length }));
	return msgs;
}

// ************************************
// ** MAP ROUND CARD STYLE TO BLACKSMITH THEME
// ************************************
function mapRoundCardStyleToTheme(roundCardStyle) {
    // If already a new theme key (starts with 'theme-'), return as-is
    if (roundCardStyle?.startsWith('theme-')) {
        return roundCardStyle;
    }
    // Map legacy keys to new themes
    const themeMap = {
        'cardsdark': 'theme-default',
        'cardsgreen': 'theme-announcement-green',
        'cardsred': 'theme-announcement-red',
        'cardsblue': 'theme-announcement-blue',
        'cardsminimalred': 'theme-announcement-red',
        'cardsminimalplain': 'theme-default',
        'cardssimple': 'theme-default'
    };
    return themeMap[roundCardStyle] || 'theme-default';
}

// ************************************
// ** MAP TURN CARD STYLE TO BLACKSMITH THEME
// ************************************
function mapTurnCardStyleToTheme(turnCardStyle) {
    // If already a new theme key (starts with 'theme-'), return as-is
    if (turnCardStyle?.startsWith('theme-')) {
        return turnCardStyle;
    }
    // Map legacy keys to new themes
    const themeMap = {
        'cardsdark': 'theme-default',
        'cardsgreen': 'theme-green',
        'cardsred': 'theme-red',
        'cardsblue': 'theme-blue',
        'cardsbrown': 'theme-default',
        'cardsminimalred': 'theme-red',
        'cardsminimalplain': 'theme-default',
        'cardssimple': 'theme-default'
    };
    return themeMap[turnCardStyle] || 'theme-default';
}

// ************************************
// ** CREATE NEW ROUND CARD
// ************************************
async function createNewRoundCard(combat) {
    const speaker = ChatMessage.getSpeaker('GM');
    const override = await getSettingSafely(MODULE.ID, CRIER.roundLabel);
    const roundCardStyle = await getSettingSafely(MODULE.ID, CRIER.roundCardStyle, 'cardsgreen');
    const roundIconStyle = await getSettingSafely(MODULE.ID, CRIER.roundIconStyle, 'fa-chess-queen');
    
    const data = { 
        combat,
        message: override ? override.replace('{round}', combat.round) : game.i18n.format('coffee-pub-crier.RoundCycling', { round: combat.round }),
        roundCardStyle,
        roundIconStyle,
        theme: mapRoundCardStyleToTheme(roundCardStyle)
    };
    
    if (!roundTemplate) {
        debugLog('CREATE NEW ROUND CARD: ERROR - roundTemplate is not loaded');
        return null;
    }
    
    const msgData = {
        content: roundTemplate(data, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }),
        speaker,
        rollMode: 'publicroll',
        flags: {
            [MODULE.ID]: { roundCycling: true, round: combat.round, combat: combat.id, roundCardStyle, roundIconStyle }
        },
    };
        // Play Round sound
    const strSound = await getSettingSafely(MODULE.ID, CRIER.roundSound);
    if (strSound && strSound !== 'none') {
        BlacksmithUtils.playSound(strSound, BlacksmithAPIConstants?.SOUNDVOLUMENORMAL || BlacksmithConstants?.SOUNDVOLUMENORMAL || BlacksmithAPIConstants?.SOUNDVOLUMESOFT || BlacksmithConstants?.SOUNDVOLUMESOFT || 0.5);
    }
    // Return the message

    return msgData;
}

// ************************************
// ** Process New ROUNDS
// ************************************
/**
 * @param {Combat} combat
 */
async function postNewRound(combat, context) {
    // Initialize the custom property if it doesn't exist
    if (combat.crierLastRoundNumber === undefined) {
        combat.crierLastRoundNumber = 0;
    }

    // Skip in case turns were rolled back.
    if (combat.crierLastRoundNumber >= combat.round) return;
    if (context.crier.roundShift <= 0) return;
    combat.crierLastRoundNumber = combat.round;
    return createNewRoundCard(combat);
}

// ************************************
// ** POST NEW TURN CARD
// ************************************
/**
 * @param {Combat} combat
 * @param {String} userId
 */
async function postNewTurnCard(combat, context) {
    debugLog('POST NEW TURN CARD: Starting', () => ({ combat: combat.id }));
    
    // Only continue with first GM in the list
    // if (!game.user.isGM || game.users.filter(o => o.isGM && o.active).sort((a, b) => b.role - a.role)[0].id !== game.user.id) return;
    // Exit the function if they have enabled skipping turn cards
    	const blnShowTurnCards = await getSettingSafely(MODULE.ID, CRIER.turnCycling, true);
    debugLog('POST NEW TURN CARD: Turn cycling setting', () => ({ blnShowTurnCards }));
    if (blnShowTurnCards !== true) {
        debugLog('POST NEW TURN CARD: Skipping - turn cycling disabled');
        return;
    }

    const cData = getDocData(combat.combatant);
    const defeated = cData?.defeated ?? false;
    const combatant = !defeated ? combat.combatant : null;
    const tokenDoc = combatant?.token;
    
    debugLog('POST NEW TURN CARD: Combatant data', () => ({
        hasCombatant: !!combat.combatant,
        defeated,
        hasCombatantAfterDefeat: !!combatant,
        hasTokenDoc: !!tokenDoc
    }));
    
    if (!tokenDoc) {
        debugLog('POST NEW TURN CARD: Skipping - no token doc');
        return; // Combatant with no token, unusual, but possible
    }
    
    // Initiative check is now handled in processCombatChange function
    // This function assumes the round is properly initialized

    const previous = {
        combatant: lastCombatant.combatant, // cache
        get defeated() { return getDocData(this.combatant)?.defeated; },
        get token() { return this.combatant?.token; },
        spoke: getDocData(lastCombatant.combatant)?.defeated ? false : lastCombatant.spoke, // dead don't speak
    };

    // Update for next cycle
    debugLog('POST NEW TURN CARD: Updating lastCombatant', () => ({
        oldCombatantId: lastCombatant.combatant?.id,
        newCombatantId: combatant?.id,
        oldCombatantName: lastCombatant.combatant?.name,
        newCombatantName: combatant?.name
    }));
    lastCombatant.combatant = combatant;
    lastCombatant.spoke = false;

    if (!combat.started) return;

    const info = {
        actor: combatant.actor,
        combatant: combatant,
        combat,
        last: previous,
        /** @type {Token|null} */
        token: tokenDoc.object,
        tokenDoc,
        get round() { return this.combat?.round; },
        get turn() { return this.combat?.turn; },
        user: combatant.players[0] ?? game.user,
        get player() { return this.user?.name; },
        name: null,
        label: null,
        get hidden() { return this.combatant?.hidden ?? false; },
        get visible() { return this.combatant?.visible ?? false; },
        obfuscated: false,
    };

    // Pull style settings from settings and set stuff
	info.name = info.token?.name ?? combatant.name;
	const cardSettings = await getTurnCardSettings();
	info.turnLayout = cardSettings.turnLayout ?? 'full';
	info.turnIconStyle = cardSettings.turnIconStyle ?? 'fa-shield';
	info.turnCardStyle = cardSettings.turnCardStyle ?? 'cardsdark';
	info.theme = mapTurnCardStyleToTheme(info.turnCardStyle);
	info.roundIconStyle = cardSettings.roundIconStyle ?? 'fa-chess-queen';
	info.roundCardStyle = cardSettings.roundCardStyle ?? 'cardsgreen';
	info.portraitStyle = cardSettings.portraitStyle ?? 'portrait';
	info.tokenBackground = cardSettings.tokenBackground ?? 'dirt';
	info.tokenScale = cardSettings.tokenScale ?? 100;
    //	Hide the player name if needed
    if (cardSettings.hidePlayer)
        info.hidePlayer = true;
    // Hide abilities if needed
    if (cardSettings.hideAbilities)
        info.hideAbilities = true;	
    // Hide Health if needed
    if (cardSettings.hideHealth)
        info.hideHealth = true;	
    // Hide Bloody Portrait if needed
    if (cardSettings.hideBloodyPortrait)
        info.hideBloodyPortrait = true;	
    // GET THE IDs
    const strTokenId = await getTokenId(info.name);
    const strActorId = await getActorId(info.name);
    // Set the view of the turn icon
    info.blnHideTurnIcon = false;
    if (info.turnIconStyle == "none") {
        info.blnHideTurnIcon = true;
    } else {
        info.blnHideTurnIcon = false;
    }
    // Set the LAYOUT
    info.blnLayoutFull = false;
    info.blnLayoutSmall = false;
    info.blnLayoutNone = false;
    if (info.turnLayout == "full") {
        info.blnLayoutFull = true;
    } else if (info.turnLayout == "small") {
        info.blnLayoutSmall = true;
    } else {
        info.blnLayoutNone = true;
    }
    // Set the plaer or NPC flag
    if (strActorId.length == 0) {
        // string is empty, so is not an actor
        info.isNPC = true;
     } else {
        info.isNPC = false;
     }
    // Set the kind of image to set in the turn card
    if (info.portraitStyle == "portrait") {
        // Try to get portrait image for all actors (both players and NPCs)
        let portraitImg = null;
        
        if (info.actor) {
            portraitImg = await getPortraitImage(info.actor);
        }
        
        // Fallback to token image if portrait is not available
        if (!portraitImg) {
            if (tokenDoc) {
                portraitImg = await getTokenImage(tokenDoc);
            }
            
            // Fallback to proto token if needed
            if (!portraitImg && info.actor) {
                const protoToken = getProtoToken(info.actor);
                if (protoToken) {
                    portraitImg = await getTokenImage(protoToken);
                }
            }
        }
        
        // Final fallback
        info.portrait = portraitImg || "icons/svg/mystery-man.svg";

        debugLog('Turn Card Image PORTRAIT. info.portrait:', () => info.portrait);
    } else if (info.portraitStyle == "token") {
        let tokenImg = null;
        
        // Try to get token image
        if (tokenDoc) {
            tokenImg = await getTokenImage(tokenDoc);
        }
        
        // Fallback to proto token if needed
        if (!tokenImg && info.actor) {
            const protoToken = getProtoToken(info.actor);
            if (protoToken) {
                tokenImg = await getTokenImage(protoToken);
            }
        }
        
        // Final fallback
        info.portrait = tokenImg || "icons/svg/mystery-man.svg";

        debugLog('Turn Card Image TOKEN. info.portrait:', () => info.portrait);
    } else {
        // Hide the portrait
        info.hidePortrait = true;
    }
    // ---- Get Player Stats ---
    if (strActorId.length == 0) {
        // It returned nothing
        //ui.notifications.info("NO ACTOR ID", {permanent: false, console: false});
    } else {
        // Get the Player Stats
        const character = game.actors.get(strActorId);
        // Pull the abilities	
        info.abilityCHA = character.system.abilities.cha.value;
        info.abilityCON = character.system.abilities.con.value;
        info.abilityDEX = character.system.abilities.dex.value;
        info.abilityINT = character.system.abilities.int.value;
        info.abilitySTR = character.system.abilities.str.value;
        info.abilityWIS = character.system.abilities.wis.value;
        // Pull some interesting info	
        info.attributeAC = character.system.attributes.ac.value;
        info.attributeMOVE = character.system.attributes.movement.walk;
        info.attributeDEATHFAILURE = character.system.attributes.death.failure;
        info.attributeDEATHSUCCESS = character.system.attributes.death.success;
        // Set the death save defaults
        info.attributeDEATHSUCCESSdot1 = "off";
        info.attributeDEATHSUCCESSdot2 = "off";
        info.attributeDEATHSUCCESSdot3 = "off";
        info.attributeDEATHFAILUREdot1 = "off";
        info.attributeDEATHFAILUREdot2 = "off";
        info.attributeDEATHFAILUREdot3 = "off";

        // Calc the HP
        info.attributeHP = character.system.attributes.hp.value;
        info.attributeHPMAX = character.system.attributes.hp.max;
        // Set up death saving throws
        if (info.attributeHP <= 0 ) {
            // They are either compleltely dead or doing death saving throws
            if (info.attributeDEATHSUCCESS <= 3 && info.attributeDEATHFAILURE <= 3 ) {
                //They are still rolling death saves
                // Set the Successes
                if (info.attributeDEATHSUCCESS == 0 ) {
                    info.attributeDEATHSUCCESSdot1 = "off";
                    info.attributeDEATHSUCCESSdot2 = "off";
                    info.attributeDEATHSUCCESSdot3 = "off";
                } else if (info.attributeDEATHSUCCESS == 1 ) {
                    info.attributeDEATHSUCCESSdot1 = "on";
                    info.attributeDEATHSUCCESSdot2 = "off";
                    info.attributeDEATHSUCCESSdot3 = "off";
                } else if (info.attributeDEATHSUCCESS == 2 ) {
                    info.attributeDEATHSUCCESSdot1 = "on";
                    info.attributeDEATHSUCCESSdot2 = "on";
                    info.attributeDEATHSUCCESSdot3 = "off";
                } else if (info.attributeDEATHSUCCESS == 3 ) {
                    info.attributeDEATHSUCCESSdot1 = "on";
                    info.attributeDEATHSUCCESSdot2 = "on";
                    info.attributeDEATHSUCCESSdot3 = "on";
                }
                // Set the Failures
                if (info.attributeDEATHFAILURE == 0 ) {
                    info.attributeDEATHFAILUREdot1 = "off";
                    info.attributeDEATHFAILUREdot2 = "off";
                    info.attributeDEATHFAILUREdot3 = "off";
                } else if (info.attributeDEATHFAILURE == 1 ) {
                    info.attributeDEATHFAILUREdot1 = "on";
                    info.attributeDEATHFAILUREdot2 = "off";
                    info.attributeDEATHFAILUREdot3 = "off";
                } else if (info.attributeDEATHFAILURE == 2 ) {
                    info.attributeDEATHFAILUREdot1 = "on";
                    info.attributeDEATHFAILUREdot2 = "on";
                    info.attributeDEATHFAILUREdot3 = "off";
                } else if (info.attributeDEATHFAILURE == 3 ) {
                    info.attributeDEATHFAILUREdot1 = "on";
                    info.attributeDEATHFAILUREdot2 = "on";
                    info.attributeDEATHFAILUREdot3 = "on";
                }
            } else {
                // they are dead.
            }
        }
        // Round up if under 5 unless it is a zero.
        info.attributehpprogress = Math.round((100 * info.attributeHP) / info.attributeHPMAX);		
        // Do the calcs for the bloody portrait
        info.bloodyPortraitNumber = 100 - info.attributehpprogress;
        info.bloodyPortraitNumber = Math.ceil(info.bloodyPortraitNumber / 5) * 5;
        // Override as appropriate
        if (info.bloodyPortraitNumber < 0 ) {
            info.bloodyPortraitNumber = 0;
        } else if (info.bloodyPortraitNumber > 100) {
            info.bloodyPortraitNumber = 100;
        } else if (info.attributehpprogress >= 1 && info.attributehpprogress <= 4) {
            //use the "critical" portriat unless they are at 0hp, so round up to 95% bloody.
            info.bloodyPortraitNumber = 95;
        }
        // See if dying
        if (info.attributehpprogress <= 0 ) {
            // Is Dead or saving
            info.isHealthy = false;
            info.isHurt = false;
            info.isDying = false;
            info.isCritical = false;
            if (info.attributeDEATHFAILURE < 3){
                info.isDeathSaving = true;
                info.isDead = false;
            } else {
                info.isDeathSaving = false;
                info.isDead = true;
                info.bloodyPortraitNumber = 101; // DEAD
            }
        } else if (info.attributehpprogress > 0 && info.attributehpprogress <= 25) {
            // Is Critical
            info.isHealthy = false;
            info.isHurt = false;
            info.isDying = false;
            info.isCritical = true;
            info.isDeathSaving = false;
            info.isDead = false;
        } else if (info.attributehpprogress > 25 && info.attributehpprogress <= 50) {
            // Is Dying
            info.isHealthy = false;
            info.isHurt = false;
            info.isDying = true;
            info.isCritical = false;
            info.isDeathSaving = false;
            info.isDead = false;
        } else if (info.attributehpprogress > 50 && info.attributehpprogress <= 75) {
            // Is Hurt
            info.isHealthy = false;
            info.isHurt = true;
            info.isDying = false;
            info.isCritical = false;
            info.isDeathSaving = false;
            info.isDead = false;
        } else {
            // Is Healthy
            info.isHealthy = true;
            info.isHurt = false;
            info.isDying = false;
            info.isCritical = false;
            info.isDeathSaving = false;
            info.isDead = false;
        }
    }

    	const obfuscateType = cardSettings.obfuscateNPCs;
    const hasVisibleName = () => info.token ? [30, 50].includes(getDocData(tokenDoc).displayName) : true; // 30=hovered by anyone or 50=always for everyone
    const obfuscate = {
        get all() { return false; },
        get owned() { return !info.actor.hasPlayerOwner; },
        get token() { return !hasVisibleName(); },
        get any() { return !(info.actor?.hasPlayerOwner || hasVisibleName()); }
    };
    info.obfuscated = obfuscate[obfuscateType] ?? false;
    if (info.obfuscated) info.name = game.i18n.localize('coffee-pub-crier.UnidentifiedTurn');

    const label = `<span class='name'>${info.name}</span>`;
    	const override = cardSettings.turnLabel;
    if (override) info.label = override.replace('{name}', label);
    else info.label = game.i18n.format('coffee-pub-crier.Turn', { name: label });


    debugLog('POST NEW TURN CARD: Calling generateCards', () => ({
        info: {
            name: info.name,
            combat: info.combat.id,
            turnCardStyle: info.turnCardStyle,
            turnIconStyle: info.turnIconStyle,
            roundCardStyle: info.roundCardStyle,
            roundIconStyle: info.roundIconStyle,
            portraitStyle: info.portraitStyle,
            tokenBackground: info.tokenBackground,
            tokenScale: info.tokenScale
        }
    }));
    const msgs = await generateCards(info, context);
    debugLog('POST NEW TURN CARD: generateCards returned', () => ({ count: msgs?.length || 0 }));

    return msgs;
}


// ************************************
// ** PROCESS THE TURN
// ************************************
/**
 * @param {Combat} combat
 * @param {String} userId
 */
async function processCombatChange(combat, _update, context, userId, turnChanged, roundChanged) {
    debugLog('PROCESS COMBAT CHANGE: Starting', () => ({
        combat: combat.id,
        userId,
        context,
        turnChanged,
        roundChanged
    }));
    
    if (game.user.id !== userId) {
        debugLog('PROCESS COMBAT CHANGE: Skipping - wrong user', () => ({ gameUserId: game.user.id, userId }));
        return;
    }

    const msgs = [];
    
    // Handle round changes - create round card if enabled
    if (roundChanged) {
        debugLog('PROCESS COMBAT CHANGE: Processing round change');
        if (await getSettingSafely(MODULE.ID, CRIER.roundCycling)) {
            debugLog('PROCESS COMBAT CHANGE: Round cycling enabled');
            const roundMsg = await postNewRound(combat, context);
            if (roundMsg) {
                msgs.push(roundMsg);
                debugLog('PROCESS COMBAT CHANGE: Round message created', () => ({ roundMsg }));
            }
        }
    }
    
    // Handle turn changes - create turn card if round is initialized or all initiatives are rolled
    if (turnChanged) {
        debugLog('PROCESS COMBAT CHANGE: Processing turn change', () => ({ roundInitialized }));
        
        // If round is not initialized, check if all initiatives are rolled
        if (!roundInitialized) {
            const combatantsArray = Array.from(combat.combatants.values());
            const initiativeData = combatantsArray.map(c => ({
                name: c.name,
                initiative: c.initiative,
                hasInitiative: c.initiative !== null && c.initiative !== undefined
            }));
            
            const allHaveInitiative = combatantsArray.every(combatant => 
                combatant.initiative !== null && combatant.initiative !== undefined
            );
            
            debugLog('PROCESS COMBAT CHANGE: Checking initiatives', () => ({
                allHaveInitiative,
                initiativeData,
                combatantsCount: combatantsArray.length,
                detailedInitiativeData: combatantsArray.map(c => ({
                    name: c.name,
                    initiative: c.initiative,
                    initiativeType: typeof c.initiative,
                    isNull: c.initiative === null,
                    isUndefined: c.initiative === undefined,
                    hasInitiative: c.initiative !== null && c.initiative !== undefined
                }))
            }));
            
            if (!allHaveInitiative) {
                debugLog('PROCESS COMBAT CHANGE: Round not initialized, skipping turn card', () => ({
                    combatantsWithoutInitiative: combatantsArray.filter(c => c.initiative === null || c.initiative === undefined).map(c => c.name)
                }));
                return; // Don't create turn card yet
            } else {
                // All initiatives rolled, mark round as initialized
                setRoundInitialized(true);
                debugLog('PROCESS COMBAT CHANGE: Round initialized, all initiatives rolled');
            }
        }
        
        // Create turn card (either round is initialized or we just initialized it)
        const turnMsgs = await postNewTurnCard(combat, context);
        if (turnMsgs?.length) {
            msgs.push(...turnMsgs);
            debugLog('PROCESS COMBAT CHANGE: Turn messages created', () => ({ count: turnMsgs.length }));
        }
    }

    // Post all messages
    if (msgs.length) {
        debugLog('PROCESS COMBAT CHANGE: Creating chat messages', () => ({ count: msgs.length, messageTypes: msgs.map(m => m.type) }));
        for (const msg of msgs) {
            await ChatMessage.create(msg);
        }
    } else {
        debugLog('PROCESS COMBAT CHANGE: No messages to create');
    }
}

async function processTurn(combat, _update, context, userId) {
    debugLog('PROCESS TURN: Starting', () => ({ combat: combat.id, userId, context }));
    
    if (game.user.id !== userId) {
        debugLog('PROCESS TURN: Skipping - wrong user', () => ({ gameUserId: game.user.id, userId }));
        return;
    } // Trust the one provoking combat update has sufficient permissions
    


    const msgs = [];
    // Round cycling message
    	if (await getSettingSafely(MODULE.ID, CRIER.roundCycling, true)) {
        debugLog('PROCESS TURN: Round cycling enabled');
        const roundMsg = await postNewRound(combat, context);
        if (roundMsg) {
            msgs.push(roundMsg);
            debugLog('PROCESS TURN: Round message created', () => ({ roundMsg }));
        } else {
            debugLog('PROCESS TURN: No round message created');
        } 
    } else {
        debugLog('PROCESS TURN: Round cycling disabled');
    }

    // Turn announcement
    const turnMsgs = await postNewTurnCard(combat, context);
    if (turnMsgs?.length) {
        msgs.push(...turnMsgs);
    }

        // Play Turn sound
    const strSound = await getSettingSafely(MODULE.ID, CRIER.turnSound);
    if (strSound && strSound !== 'none') {
        BlacksmithUtils.playSound(strSound, BlacksmithAPIConstants?.SOUNDVOLUMENORMAL || BlacksmithConstants?.SOUNDVOLUMENORMAL || BlacksmithAPIConstants?.SOUNDVOLUMESOFT || BlacksmithConstants?.SOUNDVOLUMESOFT || 0.5);
    }

    // Send the message
	if (msgs.length) {
		for (const msg of msgs) {
			await ChatMessage.create(msg);
		}
	} else {
		debugLog('PROCESS TURN: No messages to create');
	}
}



// ================================================================== 
// ===== REGISTER HOOKS ============================================
// ================================================================== 

// ************************************
// ** HOOKS ONCE
// ************************************

// Note: init and ready hooks are now handled in the Blacksmith integration section above



// ************************************
// ** HOOKS ON READY
// ************************************

// Note: ready hook is now handled in the Blacksmith integration section above

// Helper functions for token/actor operations
async function getActorId(name) {
    return BlacksmithUtils.getActorId(name);
}

async function getTokenId(name) {
    return BlacksmithUtils.getTokenId(name);
}

async function getTokenImage(tokenDoc) {
    return BlacksmithUtils.getTokenImage(tokenDoc);
}

async function getPortraitImage(actor) {
    return BlacksmithUtils.getPortraitImage(actor);
}
