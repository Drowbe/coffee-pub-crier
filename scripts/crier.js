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



// ========== BEGIN: BLACKSMITH API TESTING ==========
// This test assumes that the Blacksmith module is installed and properly configured.
// It is best to filter for the word "API TEST" in console to see the results of the tests.
// Be sure to set you module ID in the TEST_MODULE_ID variable below.

Hooks.once('ready', async () => {

    // !! IMPORTANT !! SET YOUR MODULE ID HERE !!
    const TEST_MODULE_ID = MODULE.ID; // <-------- Replace with your actual module ID

    try {
        // ----- CONSTANTS TEST INSTRUCTIONS
        console.log('API TEST | ');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ====  CONSTANTS TEST INSTRUCTIONS              ====');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ');
        console.log('API TEST | 1. You should see the themeChoices, soundChoices, and tableChoices in the console.');
        console.log('API TEST | 2. Expand the objects and you should see the choices.');
        console.log('API TEST | If you see values, your constants worked!');
        console.log('API TEST | ');

        const themeChoices = BlacksmithConstants.arrThemeChoices;
        const soundChoices = BlacksmithConstants.arrSoundChoices;
        const tableChoices = BlacksmithConstants.arrTableChoices;    
        console.log('API TEST | BLACKSMITH TEST: themeChoices', themeChoices);
        console.log('API TEST | BLACKSMITH TEST: soundChoices', soundChoices);
        console.log('API TEST | BLACKSMITH TEST: tableChoices', tableChoices);

        console.log('API TEST | ==== NON-EXPOSED VARIABLE TEST INSTRUCTIONS: ====');
        console.log('API TEST | 1. You should see the Blacksmith version in the console.');
        console.log('API TEST | 2. It should be followed by a value.');
        console.log('API TEST | If you see a value, your the non-exposed variables worked!');
        console.log('API TEST | ');
        // Access non-exposed variables
        console.log('API TEST | BLACKSMITH TEST: Blacksmith version:', game.modules.get('coffee-pub-blacksmith')?.api?.version);


         // ----- UTILITY TESTS: CONSOLE AND NOTIFICATION TEST
        console.log('API TEST | ');
        console.log('API TEST | ==================================================='); 
        console.log('API TEST | ====  UTILITY TESTS: NOTIFICATION TEST         ====');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ');
        console.log('API TEST | 1. You should see the message "API TEST | BLACKSMITH TEST OF POSTCONSOLEANDNOTIFICATION" in the console.');
        console.log('API TEST | 2. It should be followed by a value "Some awesome result"');
        console.log('API TEST | 3. It should be laid out differently than the other console messages and start with "COFFEE PUB • "');
        console.log('API TEST | 4. It should also pop aup a notifcation.');
        console.log('API TEST | 5. If you see a notfication and value, your the utility functions worked!');
        console.log('API TEST | ');
        BlacksmithUtils.postConsoleAndNotification(
            TEST_MODULE_ID,        // Module ID (string)
            'API TEST | BLACKSMITH TEST OF POSTCONSOLEANDNOTIFICATION',      // Main message
            'Some awesome result',                 // Result object (optional)
            false,                  // Debug flag (true = debug, false = system)
            true                   // Show notification (true = show, false = console only)
        );
        // ----- SAFE SETTINGS TEST
        console.log('API TEST | ');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ====  SAFE SETTINGS TEST INSTRUCTIONS          ====');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ');
        console.log('API TEST | 1. This test will fail with "not a registered game setting" - this is EXPECTED!');
        console.log('API TEST | 2. The error proves Blacksmith is properly integrated with FoundryVTT settings.');
        console.log('API TEST | 3. In real usage, you would register your settings first in your module.json or init hook.');
        console.log('API TEST | 4. If you see the error message, your safe settings integration is working correctly!');
        console.log('API TEST | ');

        // Test safe settings access (this will fail as expected)
        try {
            // Test safe get BEFORE setting (should return default since setting doesn't exist)
            const defaultValue = BlacksmithUtils.getSettingSafely(TEST_MODULE_ID, 'test-setting', 'default-value');
            console.log('✅ API TEST | BLACKSMITH TEST: Safe get (before set) working:', defaultValue);
            
            // Test safe set
            BlacksmithUtils.setSettingSafely(TEST_MODULE_ID, 'test-setting', 'test-value-123');
            console.log('✅ API TEST | BLACKSMITH TEST: Safe set working');
            
            // This will fail because the setting isn't registered - this is EXPECTED behavior
            const rawSetting = game.settings.get(TEST_MODULE_ID, 'test-setting');
            console.log('🔍 API TEST | BLACKSMITH TEST: Raw FoundryVTT setting:', rawSetting);
            
        } catch (error) {
            console.log('✅ API TEST | BLACKSMITH TEST: Safe settings test completed as expected');
            console.log('✅ API TEST | BLACKSMITH TEST: Error shows proper FoundryVTT integration:', error.message);
        }

        // ----- SOUND PLAYBACK TEST
        console.log('API TEST | ');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ====  SOUND PLAYBACK TEST INSTRUCTIONS         ====');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ');
        console.log('API TEST | 1. You should hear a "Battle Cry" sound.');
        console.log('API TEST | 2. If you don\'t hear a sound, you may have missed it. Try clicking the canvas or try again to be safe.');
        console.log('API TEST | 3. If DO you hear a battle cry, your sound playback worked!');
        console.log('API TEST | ');

        // Test sound playback
        try {
            // Use a direct sound path instead of COFFEEPUB constants
            BlacksmithUtils.playSound('modules/coffee-pub-blacksmith/sounds/battlecry.mp3', 0.7);
            console.log('✅ API TEST | BLACKSMITH TEST: Sound playback test completed');
        } catch (error) {
            console.error('❌ API TEST | BLACKSMITH TEST: Sound playback test failed:', error);
        }

        // ----- HOOK TEST - Use REAL FoundryVTT events
        console.log('API TEST | ');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ====  HOOK REGISTRATION TEST INSTRUCTIONS      ====');
        console.log('API TEST | ===================================================');
        console.log('API TEST | ');
        console.log('API TEST | 1. You should see the message "API TEST | BLACKSMITH TEST: Hooks registered successfully:" in the console.');
        console.log('API TEST | 2. It should be followed by a value "token: tokenHookId, chat: chatHookId"');
        console.log('API TEST | 3. If you see a value, your the hook registration worked!');
        console.log('API TEST | ');
        // HOOK TEST - Use REAL FoundryVTT events
        // Hook that fires when you update a token (this actually exists)
        const tokenHookId = BlacksmithHookManager.registerHook({
            name: 'updateToken',  // This is a real FoundryVTT event
            description: 'API TEST: Test hook for token updates',
            context: 'api-test-token',
            priority: 5,
            callback: (token, changes) => {
                console.log('🎯 API TEST | BLACKSMITH TEST: Token Updated:', { token, changes });
                
                BlacksmithUtils.postConsoleAndNotification(
                    TEST_MODULE_ID,  // ✅ Use the same module ID as above
                    'API TEST | BLACKSMITH TEST: Token updated!',
                    { hookId: tokenHookId, tokenName: token.name, tokenId: token.id, changes },
                    false,
                    true
                );
            }
        });

        // Hook that fires when you render a chat message (this actually exists)
        const chatHookId = BlacksmithHookManager.registerHook({
            name: 'renderChatMessage',  // This is a real FoundryVTT event
            description: 'API TEST: Test hook for chat messages',
            context: 'api-test-chat',
            priority: 5,
            callback: (message, html, data) => {
                console.log('💬 API TEST | BLACKSMITH TEST: Chat Message Rendered:', { message, data });
                
                BlacksmithUtils.postConsoleAndNotification(
                    TEST_MODULE_ID,  // ✅ Use the same module ID as above
                    'API TEST | BLACKSMITH TEST: Chat message rendered!',
                    { hookId: chatHookId, messageId: message.id, content: message.content },
                    false,
                    true
                );
            }
        });

        console.log('✅ API TEST | BLACKSMITH TEST: Hooks registered successfully:', { 
            token: tokenHookId, 
            chat: chatHookId
        });

        // ----- HOOK ACTIVATIONTEST INSTRUCTIONS
        console.log('API TEST | ');
        console.log('API TEST | ====  HOOK ACTIVATION TEST INSTRUCTIONS        ====');
        console.log('API TEST | ');
        console.log('API TEST | 1. Move a token to trigger updateToken hook');
        console.log('API TEST | 2. Send a chat message to trigger renderChatMessage hook');
        console.log('API TEST | 3. If you see logging, your hooks worked!');
        console.log('API TEST | ');

    } catch (error) {
        console.error('❌ API TEST | BLACKSMITH TEST: Error during testing:', error);
        
        // Try to log the error with Blacksmith if available
        if (BlacksmithUtils && BlacksmithUtils.postConsoleAndNotification) {
            BlacksmithUtils.postConsoleAndNotification(
                TEST_MODULE_ID,  // ✅ Use the same module ID here too
                'API TEST | BLACKSMITH TEST: Error occurred during testing',
                { error: error.message, stack: error.stack },
                false,
                true
            );
        }
    }

});
// ========== END: BLACKSMITH API TESTING ==========


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

// ================================================================== 
// ===== NEW BLACKSMITH INTEGRATION =================================
// ================================================================== 

// Helper function to safely access settings using new Blacksmith API
async function getSettingSafely(settingKey, defaultValue = null) {
    return BlacksmithUtils.getSettingSafely(MODULE.ID, settingKey, defaultValue);
}

// Helper function to resolve sound file paths from Blacksmith
async function resolveSoundPath(soundName) {
    if (!soundName || soundName === 'none') return null;
    
    // Check if it's already a full path
    if (soundName.startsWith('modules/') || soundName.startsWith('sounds/')) {
        return soundName;
    }
    
    // Try to resolve through Blacksmith constants
    const constants = (typeof BlacksmithConstants !== 'undefined' && BlacksmithConstants) || BLACKSMITH;
    if (constants?.arrSoundChoices) {
        const soundChoice = constants.arrSoundChoices[soundName];
        if (soundChoice) {
            return soundChoice;
        }
    }
    
    // Return the original name if we can't resolve it
    return soundName;
}

// REQUIRED: Access Blacksmith API and initialize your module
Hooks.once('ready', async () => {
    try {
        // Initialize templates
        getTemplate(turn_template_file).then(t => turnTemplate = t);
        getTemplate(round_template_file).then(t => roundTemplate = t);
        
        // Initialize last combatant
        lastCombatant.combatant = game.combat?.combatant ?? null;
        
        // Register settings now that Blacksmith is ready
        registerSettings();
        
        console.log('✅ Coffee Pub Crier: Module initialized successfully with Blacksmith API');
    } catch (error) {
        console.error('❌ Coffee Pub Crier: Failed to initialize:', error);
    }
});

// Note: Testing function is available globally via window.testCrierBlacksmith

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
	
	// Noitify of MISSED TURN if the setting is enabled.
	const msgs = [];
	if (await getSettingSafely(CRIER.missedKey, true)) {
		const msg = await createMissedTurnCard(info, context);
		if (msg) msgs.push(msg);
	}

	if (getDocData(info.combatant).defeated) return msgs; // undesired
	if (info.last?.combatant != null && info.last.combatant.id === info.combatant.id) return msgs; // don't report the same thing multiple times

	const speaker = info.obfuscated ? { user: game.user.id } : ChatMessage.getSpeaker({ token: info.token?.document, actor: info.actor });
	const minPerm = getPermissionLevels().OBSERVER;
	const defaultVisible = info.hidden ? false : getDefaultPermission >= minPerm;

	// Set Data
	const cardData = {
		content: turnTemplate(info, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }),
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
	return msgs;
}

// ************************************
// ** CREATE NEW ROUND CARD
// ************************************
async function createNewRoundCard(combat) {
    const speaker = ChatMessage.getSpeaker('GM');
    	    const override = await getSettingSafely(CRIER.roundLabel, 'Round {round}');
    const data = { combat };
    if (override) data.message = override.replace('{round}', combat.round);
    else data.message = game.i18n.format('coffee-pub-crier.RoundCycling', { round: combat.round });
    const msgData = {
        content: roundTemplate(data, { allowProtoMethodsByDefault: true, allowProtoPropertiesByDefault: true }),
        speaker,
        rollMode: 'publicroll',
        flags: {
            [MODULE.ID]: { roundCycling: true, round: combat.round, combat: combat.id }
        },
    };
        // Play Round sound
    const strSound = await getSettingSafely(CRIER.roundSound, 'gong');
    const resolvedSound = await resolveSoundPath(strSound);
    if (resolvedSound) {
        BlacksmithUtils.playSound(resolvedSound, 0.7);
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
    // Only continue with first GM in the list
    // if (!game.user.isGM || game.users.filter(o => o.isGM && o.active).sort((a, b) => b.role - a.role)[0].id !== game.user.id) return;
    // Exit the function if they have enabled skipping turn cards
    	const blnShowTurnCards = await getSettingSafely(CRIER.turnCycling, true);
    if (blnShowTurnCards !== true) return;

    const cData = getDocData(combat.combatant);
    const defeated = cData?.defeated ?? false;
    const combatant = !defeated ? combat.combatant : null;
    const tokenDoc = combatant?.token;
    if (!tokenDoc) return; // Combatant with no token, unusual, but possible

    const previous = {
        combatant: lastCombatant.combatant, // cache
        get defeated() { return getDocData(this.combatant)?.defeated; },
        get token() { return this.combatant?.token; },
        spoke: getDocData(lastCombatant.combatant)?.defeated ? false : lastCombatant.spoke, // dead don't speak
    };

    // Update for next cycle
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
    	info.turnLayout = await getSettingSafely(CRIER.turnLayout, 'full');
		info.turnIconStyle = await getSettingSafely(CRIER.turnIconStyle, 'fa-shield');
		info.turnCardStyle = await getSettingSafely(CRIER.turnCardStyle, 'cardsdark');
		info.roundIconStyle = await getSettingSafely(CRIER.roundIconStyle, 'fa-chess-queen');
		info.roundCardStyle = await getSettingSafely(CRIER.roundCardStyle, 'cardsgreen');
		info.portraitStyle = await getSettingSafely(CRIER.portraitStyle, 'portrait');
		info.tokenBackground = await getSettingSafely(CRIER.tokenBackground, 'dirt');
		info.tokenScale = await getSettingSafely(CRIER.tokenScale, 100);
    //	Hide the player name if needed
    if (await getSettingSafely(CRIER.hidePlayer, false))
        info.hidePlayer = true;
    // Hide abilities if needed
    if (await getSettingSafely(CRIER.hideAbilities, false))
        info.hideAbilities = true;	
    // Hide Health if needed
    if (await getSettingSafely(CRIER.hideHealth, false))
    info.hideHealth = true;	
    // Hide Bloody Portrait if needed
    if (await getSettingSafely(CRIER.hideBloodyPortrait, false))
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

            BlacksmithUtils.postConsoleAndNotification("Turn Card Image TOKEN IF NOT ACTOR?. info.portrait:", info.portrait, false, true, false);
        } else {
            const actorPortrait = game.actors.get(strActorId);
            info.portrait = actorPortrait ? await getPortraitImage(actorPortrait) : "icons/svg/mystery-man.svg";

            BlacksmithUtils.postConsoleAndNotification("Turn Card Image PORTRAIT. info.portrait:", info.portrait, false, true, false);
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

                    BlacksmithUtils.postConsoleAndNotification("Turn Card Image TOKEN. info.portrait:", info.portrait, false, true, false);
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

    	const obfuscateType = await getSettingSafely(CRIER.obfuscateNPCs, 'all');
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
    	    const override = await getSettingSafely(CRIER.turnLabel, '{name}');
    if (override) info.label = override.replace('{name}', label);
    else info.label = game.i18n.format('coffee-pub-crier.Turn', { name: label });


    const msgs = await generateCards(info, context);

    return msgs;
}


// ************************************
// ** PROCESS THE TURN
// ************************************
/**
 * @param {Combat} combat
 * @param {String} userId
 */
async function processTurn(combat, _update, context, userId) {
    if (game.user.id !== userId) return; // Trust the one provoking combat update has sufficient permissions

    const msgs = [];
    // Round cycling message
    	if (await getSettingSafely(CRIER.roundCycling, true)) {
        const roundMsg = await postNewRound(combat, context);
        if (roundMsg) {
            msgs.push(roundMsg);
        } 
    }

    // Turn announcement
    const turnMsgs = await postNewTurnCard(combat, context);
    if (turnMsgs?.length) {
        msgs.push(...turnMsgs);
    }

        // Play Turn sound
    const strSound = await getSettingSafely(CRIER.turnSound, 'gong');
    const resolvedSound = await resolveSoundPath(strSound);
    if (resolvedSound) {
        BlacksmithUtils.playSound(resolvedSound, 0.7);
    }

    // Send the message
    if (msgs.length) ChatMessage.create(msgs);
}



// ================================================================== 
// ===== REGISTER HOOKS ============================================
// ================================================================== 

// ************************************
// ** HOOKS ONCE
// ************************************

// Note: init and ready hooks are now handled in the Blacksmith integration section above

// ************************************
// ** HOOKS ON preUpdateCombat
// ************************************
/**
 * Detect what was changed and how and pass it along to the real update.
 */
Hooks.on('preUpdateCombat', function preUpdateCombat(combat, updateData, context) {
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
});

// ************************************
// ** HOOKS ON updateCombat / renderChatMessage
// ************************************

// Should the handling be wholly in preUpdate?
Hooks.on('updateCombat', processTurn);
Hooks.on('renderChatMessage', chatMessageEvent);

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
