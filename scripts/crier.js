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
        console.log('✅ Module ' + MODULE.NAME + ' registered with Blacksmith successfully');
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

// ================================================================== 
// ===== NEW BLACKSMITH INTEGRATION =================================
// ================================================================== 

// Helper function to safely access settings using new Blacksmith API
async function getSettingSafely(moduleId, settingKey, defaultValue = null) {
    return BlacksmithUtils.getSettingSafely(moduleId, settingKey, defaultValue);
}



// REQUIRED: Access Blacksmith API and initialize your module
Hooks.once('ready', async () => {
    try {
        // Initialize templates
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Loading templates', { turn: turn_template_file, round: round_template_file }, true, false);
        
        // Check if foundry.utils.getTemplate exists
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Checking foundry.utils.getTemplate', { 
            hasFoundry: !!foundry, 
            hasUtils: !!foundry?.utils, 
            hasGetTemplate: !!foundry?.utils?.getTemplate 
        }, true, false);
        
        try {
            if (foundry?.utils?.getTemplate) {
                turnTemplate = await foundry.utils.getTemplate(turn_template_file);
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Turn template loaded via foundry.utils.getTemplate', { success: !!turnTemplate, type: typeof turnTemplate }, true, false);
            } else {
                // Fallback to global getTemplate
                turnTemplate = await getTemplate(turn_template_file);
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Turn template loaded via global getTemplate', { success: !!turnTemplate, type: typeof turnTemplate }, true, false);
            }
        } catch (err) {
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Turn template failed', { error: err.message }, true, false);
        }
        
        try {
            if (foundry?.utils?.getTemplate) {
                roundTemplate = await foundry.utils.getTemplate(round_template_file);
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Round template loaded via foundry.utils.getTemplate', { success: !!roundTemplate, type: typeof roundTemplate }, true, false);
    } else {
                // Fallback to global getTemplate
                roundTemplate = await getTemplate(round_template_file);
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Round template loaded via global getTemplate', { success: !!roundTemplate, type: typeof roundTemplate }, true, false);
            }
        } catch (err) {
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'READY: Round template failed', { error: err.message }, true, false);
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
                    
                    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'HOOK: preUpdateCombat - checking initiatives after update', { 
                        combat: combat.id,
                        allHaveInitiative,
                        combatantsCount: combatantsArray.length,
                        initiativeData: combatantsArray.map(c => ({ name: c.name, initiative: c.initiative }))
                    }, true, false);
                    
                    // If all initiatives are now rolled, trigger turn card creation
                    if (allHaveInitiative) {
                        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'HOOK: preUpdateCombat - all initiatives rolled, triggering turn card', {}, true, false);
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
                
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'HOOK: updateCombat hook called', { 
                    combat: combat.id, 
                    update, 
                    context, 
                    userId,
                    hasTurnUpdate,
                    hasRoundUpdate,
                    currentTurn,
                    currentRound,
                    newTurn,
                    newRound,
                    turnChanged,
                    roundChanged,
                    shouldProcess: turnChanged || roundChanged
                }, true, false);
                
                // Only process if there's an actual turn or round change
                if (turnChanged || roundChanged) {
                    // Reset lastCombatant tracking if a new round starts
                    if (roundChanged) {
                        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'HOOK: New round detected, resetting lastCombatant and roundInitialized', {}, true, false);
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
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'HOOK: renderChatMessage hook called', { messageId: cm.id }, true, false);
                return chatMessageEvent(cm, html, options);
            }
        });
        
        console.log('✅ Coffee Pub Crier: Module initialized successfully with Blacksmith API');
    } catch (error) {
        console.error('❌ Coffee Pub Crier: Failed to initialize:', error);
    }
});

// Global testing function for debugging
window.testCrierBlacksmith = function() {
    console.log('🧪 COFFEE PUB CRIER - BLACKSMITH INTEGRATION TEST');
    console.log('================================================');
    
    // Test Blacksmith API availability
    console.log('✅ Blacksmith API Available:', {
        BlacksmithUtils: !!BlacksmithUtils,
        BlacksmithModuleManager: !!BlacksmithModuleManager,
        BlacksmithHookManager: !!BlacksmithHookManager,
        BlacksmithConstants: !!BlacksmithConstants,
        BlacksmithAPIConstants: typeof BlacksmithAPIConstants === 'function',
        COFFEEPUB: typeof COFFEEPUB !== 'undefined' ? !!COFFEEPUB : false
    });
    
    // Test module registration
    console.log('✅ Module Registration:', {
        moduleId: MODULE.ID,
        moduleName: MODULE.NAME,
        moduleVersion: MODULE.VERSION
    });
    
    // Test settings
    console.log('✅ Settings Status:', {
        roundInitialized: getRoundInitialized(),
        turnCycling: game.settings.get(MODULE.ID, CRIER.turnCycling),
        roundCycling: game.settings.get(MODULE.ID, CRIER.roundCycling),
        turnCardStyle: game.settings.get(MODULE.ID, CRIER.turnCardStyle),
        roundCardStyle: game.settings.get(MODULE.ID, CRIER.roundCardStyle)
    });
    
    // Test templates
    console.log('✅ Templates Status:', {
        turnTemplate: !!turnTemplate,
        roundTemplate: !!roundTemplate,
        turnTemplateType: typeof turnTemplate,
        roundTemplateType: typeof roundTemplate
    });
    
    // Test combat state
    console.log('✅ Combat State:', {
        hasActiveCombat: !!game.combat,
        combatId: game.combat?.id,
        combatRound: game.combat?.round,
        combatTurn: game.combat?.turn,
        combatantsCount: game.combat?.combatants?.size || 0,
        lastCombatant: lastCombatant.combatant?.name || 'None'
    });
    
    // Test Blacksmith constants (with proper error handling)
    try {
        // Try function approach first, then fallback to global object
        const constants = BlacksmithAPIConstants ? BlacksmithAPIConstants() : BlacksmithConstants;
        if (constants) {
            console.log('✅ Blacksmith Constants:', {
                source: BlacksmithAPIConstants ? 'BlacksmithAPIConstants()' : 'BlacksmithConstants',
                hasThemeChoices: !!constants.arrThemeChoices,
                hasIconChoices: !!constants.arrIconChoices,
                hasSoundChoices: !!constants.arrSoundChoices,
                themeChoicesCount: Object.keys(constants.arrThemeChoices || {}).length,
                iconChoicesCount: Object.keys(constants.arrIconChoices || {}).length,
                soundChoicesCount: Object.keys(constants.arrSoundChoices || {}).length
            });
        } else {
            console.log('⚠️ Blacksmith Constants: Not available yet - may need to wait for Blacksmith to fully load');
        }
    } catch (error) {
        console.log('⚠️ Blacksmith Constants: Error accessing constants:', error.message);
    }
    
    // Test Volume constants
    try {
        const volumeNormal = BlacksmithAPIConstants?.SOUNDVOLUMENORMAL || BlacksmithConstants?.SOUNDVOLUMENORMAL;
        if (volumeNormal) {
            console.log('✅ Volume Constants:', {
                hasSoundVolumeNormal: !!volumeNormal,
                soundVolumeNormal: volumeNormal
            });
        } else {
            console.log('⚠️ Volume Constants: Not available yet - may need to wait for Blacksmith to fully load');
        }
    } catch (error) {
        console.log('⚠️ Volume Constants: Error accessing constants:', error.message);
    }
    
    console.log('================================================');
    console.log('🧪 Test completed! Check the results above.');
    
    return {
        blacksmithAvailable: !!(BlacksmithUtils && BlacksmithModuleManager && BlacksmithHookManager),
        moduleRegistered: true,
        settingsLoaded: true,
        templatesLoaded: !!(turnTemplate && roundTemplate),
        combatActive: !!game.combat,
        constantsAvailable: !!(BlacksmithAPIConstants || BlacksmithConstants)
    };
};

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
    // Set the card and icon styles

    var strCardStyle = "cardsdark"
    var strRoundIcon = "fa-chess-queen"

    if (!main) return;
    main.classList.add('coffee-pub', 'round-cycling-' + strCardStyle);

    const header = html.querySelector('.message-header');
    if (!header) return;
    // Remove sender
    header.querySelector('.message-sender')?.remove();

    const content = html.querySelector('.message-content');
    if (!content) return;
    const msg = content.querySelector('.round-message');

    header.prepend(msg);
    const icon = document.createElement('i');
    icon.classList.add('fas', strRoundIcon);
    msg?.prepend(icon, ' ');

    // Migrate data attributes
    const data = content.querySelector('.round-cycling-' + strCardStyle);
    if (data?.dataset) {
        main.dataset.combatId = data.dataset.combatId;
        main.dataset.round = data.dataset.round;
    }
    // Remove old content
    hideContent(content);
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
	// DEBUG: TURNING OFF MISSED TURNS FOR NOW
	//return;
	main.classList.add('coffee-pub', 'missed-crier');

	const content = html.querySelector('.message-content > .crier');

	// Remove things to enforce formatting
	const header = main.querySelector('.message-header');
	if (!header) return;
	header.classList.remove('message-header');
	const wh = header.querySelector('.whisper-to');
	if (wh) {
		main.title = wh.textContent;
		wh.remove();
	}
	const timestamp = header.querySelectorAll('.message-sender,.message-timestamp');
	timestamp?.forEach(el => el.style.display = 'none');
	const msgb = document.createElement('div');
	msgb.classList.add('missed-token');
	const missedIcon = content.querySelector('.missed-turn-icon'),
		missedText = content.querySelector('.missed-turn-text'),
		missedCombatant = content.querySelector('.missed-combatant'),
		missedName = document.createElement('span');
	missedName.classList.add('missed-turn-name');
	missedName.textContent = missedCombatant?.textContent?.trim() ?? '...';
	msgb.append(missedIcon, ' ', missedName, ' ', missedText);
	header.prepend(msgb);

	if (content) hideContent(content);
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
 * @param {JQuery} html
 * @param {Object} _options
 */
function chatMessageEvent(cm, [html], _options) {
	const isGM = game.user.isGM;
	const cmd = getDocData(cm);
	const flags = cmd.flags?.[MODULE.ID];

	if (!flags) {
		if (isGM && cmd.speaker?.token === lastCombatant.tokenId)
			lastCombatant.spoke = true;
		return;
	}

	const main = html.closest('[data-message-id]');
	html?.classList.add('crier', 'coffee-pub');

	if (flags.missedTurn){
	// They want to notify on missed turn and it has been missed
	// check compress and see chose the option to remove speaker and timestamp
		//DEBUG TURNING OFF MISSED TURNS FOR NOW
		//interceptMissedTurnMessage(cm, html, main);
	} else if (flags.turnAnnounce || flags.token) {
		updateLastCombatantFromMsg(cm, flags);
		// check compress and see chose the option to remove speaker and timestamp
		//interceptNewTurnMessage(cm, html, main);
	}
	else if (flags.roundCycling) {
		// check compress and see chose the option to remove speaker and timestamp
		interceptNewRoundMessage(cm, html, main);
	}

	main?.querySelector('.whisper-to')?.remove();
	// De-obfuscate name for GM
	if (isGM && cm.getFlag(MODULE.ID, 'obfuscated')) {
		const combatId = cm.getFlag(MODULE.ID, 'combat'),
			combatantId = cm.getFlag(MODULE.ID, 'combatant'),
			combat = game.combats.get(combatId),
			combatant = combat?.combatants.get(combatantId);
		if (combatant?.token) {
			const name = html.querySelector('.actor .name-box .name');
			if (name) name.textContent = combatant.token.name;
			html.classList.add('obfuscated');
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
    	if (await getSettingSafely(CRIER.missedTurnNotification, false)) {
        ui.notifications.info("Did " + strMissedTurnPlayer + " miss their turn?", {permanent: false, console: false});
    }
    const msgData = {
        content: `<div class="coffee-pub crier"><span class="missed-turn-icon"><i class="fas fa-fire"></i></span><span class="missed-combatant">${data.last.combatant.name}</span> <span class="missed-turn-text"> may have missed a turn.</span></div>`,
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
	BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: Starting', { name: info.name }, true, false);
	
	// Noitify of MISSED TURN if the setting is enabled.
	const msgs = [];
	if (await getSettingSafely(MODULE.ID, CRIER.missedKey, true)) {
		const msg = await createMissedTurnCard(info, context);
		if (msg) msgs.push(msg);
	}

	if (getDocData(info.combatant).defeated) {
		BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: Skipping - combatant defeated', {}, true, false);
		return msgs; // undesired
	}
	if (info.last?.combatant != null && info.last.combatant.id === info.combatant.id) {
		BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: Skipping - same combatant as last', { 
			lastCombatantId: info.last?.combatant?.id, 
			currentCombatantId: info.combatant?.id,
			lastCombatantName: info.last?.combatant?.name,
			currentCombatantName: info.combatant?.name
		}, true, false);
		return msgs; // don't report the same thing multiple times
	}

	const speaker = info.obfuscated ? { user: game.user.id } : ChatMessage.getSpeaker({ token: info.token?.document, actor: info.actor });
	const minPerm = getPermissionLevels().OBSERVER;
	const defaultVisible = info.hidden ? false : getDefaultPermission >= minPerm;

	// Set Data
	BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: About to render template', { 
		hasTemplate: !!turnTemplate, 
		turnTemplateType: typeof turnTemplate,
		turnTemplateValue: turnTemplate 
	}, true, false);
	
	if (!turnTemplate) {
		BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: ERROR - turnTemplate is not loaded', {}, true, false);
		return msgs;
	}
	
	const renderedContent = turnTemplate(info, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true });
	BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: Template rendered', { 
		contentLength: renderedContent?.length || 0,
		contentPreview: renderedContent?.substring(0, 200) + '...'
	}, true, false);
	
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
	BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'GENERATE CARDS: Created card', { count: msgs.length }, true, false);
	return msgs;
}

// ************************************
// ** CREATE NEW ROUND CARD
// ************************************
async function createNewRoundCard(combat) {
    const speaker = ChatMessage.getSpeaker('GM');
    	    const override = await getSettingSafely(MODULE.ID, CRIER.roundLabel);
    const data = { combat };
    if (override) data.message = override.replace('{round}', combat.round);
    else data.message = game.i18n.format('coffee-pub-crier.RoundCycling', { round: combat.round });
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'CREATE NEW ROUND CARD: About to render template', { 
        hasTemplate: !!roundTemplate, 
        roundTemplateType: typeof roundTemplate,
        roundTemplateValue: roundTemplate 
    }, true, false);
    
    if (!roundTemplate) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'CREATE NEW ROUND CARD: ERROR - roundTemplate is not loaded', {}, true, false);
        return null;
    }
    
    const msgData = {
        content: roundTemplate(data, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }),
        speaker,
        rollMode: 'publicroll',
        flags: {
            [MODULE.ID]: { roundCycling: true, round: combat.round, combat: combat.id }
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
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Starting', { combat: combat.id }, true, false);
    
    // Only continue with first GM in the list
    // if (!game.user.isGM || game.users.filter(o => o.isGM && o.active).sort((a, b) => b.role - a.role)[0].id !== game.user.id) return;
    // Exit the function if they have enabled skipping turn cards
    	const blnShowTurnCards = await getSettingSafely(MODULE.ID, CRIER.turnCycling, true);
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Turn cycling setting', { blnShowTurnCards }, true, false);
    if (blnShowTurnCards !== true) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Skipping - turn cycling disabled', {}, true, false);
        return;
    }

    const cData = getDocData(combat.combatant);
    const defeated = cData?.defeated ?? false;
    const combatant = !defeated ? combat.combatant : null;
    const tokenDoc = combatant?.token;
    
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Combatant data', { 
        hasCombatant: !!combat.combatant, 
        defeated, 
        hasCombatantAfterDefeat: !!combatant, 
        hasTokenDoc: !!tokenDoc 
    }, true, false);
    
    if (!tokenDoc) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Skipping - no token doc', {}, true, false);
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
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Updating lastCombatant', { 
        oldCombatantId: lastCombatant.combatant?.id,
        newCombatantId: combatant?.id,
        oldCombatantName: lastCombatant.combatant?.name,
        newCombatantName: combatant?.name
    }, true, false);
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
    	info.turnLayout = await getSettingSafely(MODULE.ID, CRIER.turnLayout);
		info.turnIconStyle = await getSettingSafely(MODULE.ID, CRIER.turnIconStyle);
		info.turnCardStyle = await getSettingSafely(MODULE.ID, CRIER.turnCardStyle);
		info.roundIconStyle = await getSettingSafely(MODULE.ID, CRIER.roundIconStyle);
		info.roundCardStyle = await getSettingSafely(MODULE.ID, CRIER.roundCardStyle);
		info.portraitStyle = await getSettingSafely(MODULE.ID, CRIER.portraitStyle);
		info.tokenBackground = await getSettingSafely(MODULE.ID, CRIER.tokenBackground);
		info.tokenScale = await getSettingSafely(MODULE.ID, CRIER.tokenScale);
    //	Hide the player name if needed
    if (await getSettingSafely(MODULE.ID, CRIER.hidePlayer))
        info.hidePlayer = true;
    // Hide abilities if needed
    if (await getSettingSafely(MODULE.ID, CRIER.hideAbilities))
        info.hideAbilities = true;	
    // Hide Health if needed
    if (await getSettingSafely(MODULE.ID, CRIER.hideHealth))
    info.hideHealth = true;	
    // Hide Bloody Portrait if needed
    if (await getSettingSafely(MODULE.ID, CRIER.hideBloodyPortrait))
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
        if (strActorId.length == 0) {
            // string is empty, so use the token
            let portraitImg = null;
            
            // Try to get token image
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
            
            // Final fallback
            info.portrait = portraitImg || "icons/svg/mystery-man.svg";

            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, "Turn Card Image TOKEN IF NOT ACTOR?. info.portrait:", info.portrait, true, false);
        } else {
            const actorPortrait = game.actors.get(strActorId);
            info.portrait = actorPortrait ? await getPortraitImage(actorPortrait) : "icons/svg/mystery-man.svg";

            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, "Turn Card Image PORTRAIT. info.portrait:", info.portrait, true, false);
        }
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

        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, "Turn Card Image TOKEN. info.portrait:", info.portrait, true, false);
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

    	const obfuscateType = await getSettingSafely(MODULE.ID, CRIER.obfuscateNPCs);
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
    	    const override = await getSettingSafely(MODULE.ID, CRIER.turnLabel);
    if (override) info.label = override.replace('{name}', label);
    else info.label = game.i18n.format('coffee-pub-crier.Turn', { name: label });


    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: Calling generateCards', { 
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
    }, true, false);
    const msgs = await generateCards(info, context);
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'POST NEW TURN CARD: generateCards returned', { count: msgs?.length || 0 }, true, false);

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
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Starting', { 
        combat: combat.id, 
        userId, 
        context, 
        turnChanged, 
        roundChanged 
    }, true, false);
    
    if (game.user.id !== userId) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Skipping - wrong user', { gameUserId: game.user.id, userId }, true, false);
        return;
    }

    const msgs = [];
    
    // Handle round changes - create round card if enabled
    if (roundChanged) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Processing round change', {}, true, false);
        if (await getSettingSafely(MODULE.ID, CRIER.roundCycling)) {
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Round cycling enabled', {}, true, false);
            const roundMsg = await postNewRound(combat, context);
            if (roundMsg) {
                msgs.push(roundMsg);
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Round message created', { roundMsg }, true, false);
            }
        }
    }
    
    // Handle turn changes - create turn card if round is initialized or all initiatives are rolled
    if (turnChanged) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Processing turn change', { roundInitialized }, true, false);
        
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
            
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Checking initiatives', { 
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
            }, true, false);
            
            if (!allHaveInitiative) {
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Round not initialized, skipping turn card', { 
                    combatantsWithoutInitiative: combatantsArray.filter(c => c.initiative === null || c.initiative === undefined).map(c => c.name)
                }, true, false);
                return; // Don't create turn card yet
            } else {
                // All initiatives rolled, mark round as initialized
                setRoundInitialized(true);
                BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Round initialized, all initiatives rolled', {}, true, false);
            }
        }
        
        // Create turn card (either round is initialized or we just initialized it)
        const turnMsgs = await postNewTurnCard(combat, context);
        if (turnMsgs?.length) {
            msgs.push(...turnMsgs);
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Turn messages created', { count: turnMsgs.length }, true, false);
        }
    }

    // Post all messages
    if (msgs.length) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: Creating chat messages', { count: msgs.length, messageTypes: msgs.map(m => m.type) }, true, false);
        for (const msg of msgs) {
            await ChatMessage.create(msg);
        }
    } else {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS COMBAT CHANGE: No messages to create', {}, true, false);
    }
}

async function processTurn(combat, _update, context, userId) {
    BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: Starting', { combat: combat.id, userId, context }, true, false);
    
    if (game.user.id !== userId) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: Skipping - wrong user', { gameUserId: game.user.id, userId }, true, false);
        return;
    } // Trust the one provoking combat update has sufficient permissions
    


    const msgs = [];
    // Round cycling message
    	if (await getSettingSafely(MODULE.ID, CRIER.roundCycling, true)) {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: Round cycling enabled', {}, true, false);
        const roundMsg = await postNewRound(combat, context);
        if (roundMsg) {
            msgs.push(roundMsg);
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: Round message created', { roundMsg }, true, false);
        } else {
            BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: No round message created', {}, true, false);
        } 
    } else {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: Round cycling disabled', {}, true, false);
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
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: Creating chat messages', { 
            count: msgs.length,
            messageTypes: msgs.map(msg => ({
                type: msg.flags?.[MODULE.ID]?.turnAnnounce ? 'turn' : 
                      msg.flags?.[MODULE.ID]?.roundCycling ? 'round' : 'other',
                contentLength: msg.content?.length || 0,
                hasFlags: !!msg.flags?.[MODULE.ID]
            }))
        }, true, false);
        ChatMessage.create(msgs);
    } else {
        BlacksmithUtils.postConsoleAndNotification(MODULE.NAME, 'PROCESS TURN: No messages to create', {}, true, false);
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
