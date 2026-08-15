// ================================================================== 
// ===== IMPORTS ====================================================
// ================================================================== 

// Grab the module data
import { MODULE, CRIER  } from './const.js';
import { BlacksmithAPI } from '/modules/coffee-pub-blacksmith/api/blacksmith-api.js';

// ================================================================== 
// ===== SETTINGS ==================================================
// ================================================================== 
  
// ================================================================== 
// ===== HELPER FUNCTIONS ==========================================
// ================================================================== 

/**
 * Blacksmith's card themes, as an id-to-name map for a settings dropdown.
 *
 * Themes are stored by ID, not by CSS class name. Storing class names meant
 * every read had to translate one into the other, and it hid the fact that the
 * three `theme-announcement-*` themes this module defaulted to had been retired
 * — `getAnnouncementThemeChoicesWithClassNames()` no longer existed, so the
 * dropdown silently fell back to three ids Blacksmith could not resolve and
 * every round and combat card rendered as Tan.
 */
async function getCardThemeChoices() {
	try {
		const blacksmith = await BlacksmithAPI.get();
		const choices = blacksmith?.chatCards?.getThemeChoices?.('card');
		if (choices && Object.keys(choices).length) return choices;
		console.warn('Coffee Pub Crier: Blacksmith Chat Cards API not available, using fallback themes');
	} catch (error) {
		console.error('Coffee Pub Crier: Error getting card themes from API:', error);
	}
	return getCardThemeChoicesFallback();
}

/** The theme list as it stood when this was written, for a Blacksmith too old to ask. */
function getCardThemeChoicesFallback() {
	return {
		'default': 'Tan',
		'amber': 'Amber',
		'blue': 'Blue',
		'green': 'Green',
		'red': 'Red',
		'orange': 'Orange',
		'default-dark': 'Tan (dark header)',
		'amber-dark': 'Amber (dark header)',
		'blue-dark': 'Blue (dark header)',
		'green-dark': 'Green (dark header)',
		'red-dark': 'Red (dark header)',
		'orange-dark': 'Orange (dark header)'
	};
}

/**
 * The three retired announcement themes, and where each one lands.
 *
 * They darkened the whole card and were only ever used for cards that were
 * nothing but a header. The `-dark` variants do that one thing honestly — a
 * dark header band on an otherwise ordinary card — so they are the equivalent,
 * not merely the nearest colour.
 */
const LEGACY_ANNOUNCEMENT_THEMES = {
	'theme-announcement-green': 'green-dark',
	'theme-announcement-red': 'red-dark',
	'theme-announcement-blue': 'blue-dark'
};

/**
 * A stored setting value as a theme id.
 *
 * Settings used to hold CSS class names. Migration rewrites them, but only a GM
 * can write a world setting, so a player client can read a legacy value for a
 * whole session before any GM logs in. Normalizing on read means that client
 * still gets the right theme rather than Blacksmith's Tan fallback.
 *
 * @param {string} value
 * @returns {string} a theme id, which Blacksmith validates in its own turn
 */
export function normalizeThemeId(value) {
	const stored = String(value ?? '').trim();
	if (!stored) return 'default';
	if (LEGACY_ANNOUNCEMENT_THEMES[stored]) return LEGACY_ANNOUNCEMENT_THEMES[stored];
	return stored.startsWith('theme-') ? stored.slice('theme-'.length) : stored;
}

/**
 * Rewrite theme settings still holding a CSS class name.
 *
 * World settings, so only a GM writes them; every other client relies on
 * `normalizeThemeId` until one does. Runs after registration because a setting
 * cannot be read before it exists.
 */
async function migrateCardThemeSettings() {
	if (!game.user?.isGM) return;
	for (const key of [CRIER.roundCardStyle, CRIER.turnCardStyle, CRIER.combatCardStyle]) {
		try {
			const stored = game.settings.get(MODULE.ID, key);
			const migrated = normalizeThemeId(stored);
			if (migrated === stored) continue;
			await game.settings.set(MODULE.ID, key, migrated);
			console.log(`Coffee Pub Crier: Migrated ${key} theme "${stored}" to "${migrated}"`);
		} catch (error) {
			console.error(`Coffee Pub Crier: Could not migrate ${key} theme:`, error);
		}
	}
}

export const registerSettings = async () => {
    try {
        // Get constants using the API function approach
        const constants = BlacksmithAPIConstants ? BlacksmithAPIConstants() : BlacksmithConstants;
        
        // Get theme choices from Chat Cards API (await before using in settings).
        // One list for all three cards: a theme is a colour, and there is no
        // longer a separate family for announcements.
        const cardThemeChoices = await getCardThemeChoices();

		// -- TITLE --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH1Crier, {
			name: MODULE.ID + '.headingH1Crier-Label',
			hint: MODULE.ID + '.headingH1Crier-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});

		// Combat lifecycle announcements use the round announcement theme/icon.
		game.settings.register(MODULE.ID, CRIER.headingH2Lifecycle, {
			name: MODULE.ID + '.headingH2Lifecycle-Label', hint: MODULE.ID + '.headingH2Lifecycle-Hint',
			type: String, config: true, scope: 'world', default: ''
		});
		game.settings.register(MODULE.ID, CRIER.combatCardStyle, {
			name: MODULE.ID + '.combatCardStyle-Label', hint: MODULE.ID + '.combatCardStyle-Hint',
			type: String, config: true, scope: 'world', default: 'green-dark',
			choices: cardThemeChoices
		});
		game.settings.register(MODULE.ID, CRIER.combatIconStyle, {
			name: MODULE.ID + '.combatIconStyle-Label', hint: MODULE.ID + '.combatIconStyle-Hint',
			type: String, config: true, scope: 'world', default: constants?.ICONSHIELD || 'fa-shield',
			choices: constants?.arrIconChoices || { error: 'Failed to load icons - check Blacksmith module' }
		});
		game.settings.register(MODULE.ID, CRIER.combatStartCycling, {
			name: MODULE.ID + '.combatStartCycling-Label', hint: MODULE.ID + '.combatStartCycling-Hint',
			type: Boolean, config: true, scope: 'world', default: true
		});
		game.settings.register(MODULE.ID, CRIER.combatStartSound, {
			name: MODULE.ID + '.combatStartSound-Label', hint: MODULE.ID + '.combatStartSound-Hint',
			type: String, config: true, scope: 'world', default: constants?.SOUNDGONG || 'gong',
			choices: constants?.arrSoundChoices || { error: 'Failed to load sounds - check Blacksmith module' }
		});
		game.settings.register(MODULE.ID, CRIER.combatStartLabel, {
			name: MODULE.ID + '.combatStartLabel-Label', hint: MODULE.ID + '.combatStartLabel-Hint',
			type: String, config: true, scope: 'world', default: 'Combat Begins'
		});
		game.settings.register(MODULE.ID, CRIER.combatEndCycling, {
			name: MODULE.ID + '.combatEndCycling-Label', hint: MODULE.ID + '.combatEndCycling-Hint',
			type: Boolean, config: true, scope: 'world', default: true
		});
		game.settings.register(MODULE.ID, CRIER.combatEndSound, {
			name: MODULE.ID + '.combatEndSound-Label', hint: MODULE.ID + '.combatEndSound-Hint',
			type: String, config: true, scope: 'world', default: 'none',
			choices: constants?.arrSoundChoices || { error: 'Failed to load sounds - check Blacksmith module' }
		});
		game.settings.register(MODULE.ID, CRIER.combatEndLabel, {
			name: MODULE.ID + '.combatEndLabel-Label', hint: MODULE.ID + '.combatEndLabel-Hint',
			type: String, config: true, scope: 'world', default: 'Combat Ends'
		});
		// ------------------------------------------------------------

		// -- ROUNDS --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH2Rounds, {
			name: MODULE.ID + '.headingH2Rounds-Label',
			hint: MODULE.ID + '.headingH2Rounds-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- ROUND STYLES --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH3simpleRoundStyle, {
			name: MODULE.ID + '.headingH3simpleRoundStyle-Label',
			hint: MODULE.ID + '.headingH3simpleRoundStyle-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Round Card Style --
		// Updated to use Blacksmith Chat Cards API for round cards
		game.settings.register(MODULE.ID, CRIER.roundCardStyle, {
			name: MODULE.ID + '.roundCardStyle-Label',
			hint: MODULE.ID + '.roundCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'green-dark', // Blacksmith theme id
			choices: cardThemeChoices
		});
		// -- Round Icon --
		game.settings.register(MODULE.ID, CRIER.roundIconStyle, {
			name: MODULE.ID + '.roundIconStyle-Label',
			hint: MODULE.ID + '.roundIconStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: constants?.ICONQUEEN || 'fa-chess-queen',
			choices: constants?.arrIconChoices || {
				'error': 'Failed to load icons - check Blacksmith module'
			},
		});

		// -- ROUND SETTINGS --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH3simpleRoundSettings, {
			name: MODULE.ID + '.headingH3simpleRoundSettings-Label',
			hint: MODULE.ID + '.headingH3simpleRoundSettings-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Announce New Rounds --
		game.settings.register(MODULE.ID, CRIER.roundCycling, {
			name: MODULE.ID + '.roundCycling-Label',
			hint: MODULE.ID + '.roundCycling-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true
		});
		// -- Round Sound --
		game.settings.register(MODULE.ID, CRIER.roundSound, {
			name: MODULE.ID + '.roundSound-Label',
			hint: MODULE.ID + '.roundSound-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: constants?.SOUNDGONG || 'gong',
			choices: constants?.arrSoundChoices || {
				'error': 'Failed to load sounds - check Blacksmith module'
			},
		});
		// -- Round Label --
		game.settings.register(MODULE.ID, CRIER.roundLabel, {
			name: MODULE.ID + '.round-Label',
			hint: MODULE.ID + '.round-Hint',
			type: String,
			config: true,
			scope: 'world',
			default: 'Round {round}'
		});


		// -- TURNS --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH2turns, {
			name: MODULE.ID + '.headingH2turns-Label',
			hint: MODULE.ID + '.headingH2turns-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- TURN STYLE --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH3simpleTurnStyle, {
			name: MODULE.ID + '.headingH3simpleTurnStyle-Label',
			hint: MODULE.ID + '.headingH3simpleTurnStyle-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Turn Card Layout --
		game.settings.register(MODULE.ID, CRIER.turnLayout, {
			name: MODULE.ID + '.turnLayout-Label',
			hint: MODULE.ID + '.turnLayout-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				full: 'Detailed Cards',
				small: 'Minimal Cards'
			},
			default: 'full',
		});
		// -- Turn Card Color --
		// Updated to use Blacksmith Chat Cards API for turn cards
		game.settings.register(MODULE.ID, CRIER.turnCardStyle, {
			name: MODULE.ID + '.turnCardStyle-Label',
			hint: MODULE.ID + '.turnCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'default', // Blacksmith theme id
			choices: cardThemeChoices,
		});
		// -- Turn Card Color --
		game.settings.register(MODULE.ID, CRIER.turnIconStyle, {
			name: MODULE.ID + '.turnIconStyle-Label',
			hint: MODULE.ID + '.turnIconStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: constants?.ICONSHIELD || 'fa-shield',
			choices: constants?.arrIconChoices || {
				'error': 'Failed to load icons - check Blacksmith module'
			},
		});

		// -- TURN STYLE --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH3simpleTurnSettings, {
			name: MODULE.ID + '.headingH3simpleTurnSettings-Label',
			hint: MODULE.ID + '.headingH3simpleTurnSettings-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Announce Turns --
		game.settings.register(MODULE.ID, CRIER.turnCycling, {
			name: MODULE.ID + '.turnCycling-Label',
			hint: MODULE.ID + '.turnCycling-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		// -- Turn Sound --
		game.settings.register(MODULE.ID, CRIER.turnSound, {
			name: MODULE.ID + '.turnSound-Label',
			hint: MODULE.ID + '.turnSound-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: constants?.SOUNDGONG || 'gong',
			choices: constants?.arrSoundChoices || {
				'error': 'Failed to load sounds - check Blacksmith module'
			},
		});
		// -- Turn Card Label --
		game.settings.register(MODULE.ID, CRIER.turnLabel, {
			name: MODULE.ID + '.turnCard-Label',
			hint: MODULE.ID + '.turnCard-Hint',
			type: String,
			config: true,
			scope: 'world',
			default: '{name}',
		});



		// ===== TURN CARD PERSONALIZATION =====
		game.settings.register(MODULE.ID, CRIER.headingH3simpleTurnElements, {
			name: MODULE.ID + '.headingH3simpleTurnElements-Label',
			hint: MODULE.ID + '.headingH3simpleTurnElements-Hint',
			scope: 'world', config: true, default: '', type: String
		});
		// -- Image Style --
		game.settings.register(MODULE.ID, CRIER.portraitStyle, {
			name: MODULE.ID + '.portraitStyle-Label',
			hint: MODULE.ID + '.portraitStyle-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: 'None',
				token: 'Token',
				portrait: 'Portrait'
			},
			default: 'portrait',
		});
		// -- NPC Names --
		game.settings.register(MODULE.ID, CRIER.obfuscateNPCs, {
			name: MODULE.ID + '.obfuscateNPCs-Label',
			hint: MODULE.ID + '.obfuscateNPCs-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				all: MODULE.ID + '.ObfuscateNPCsVisibility.All',
				owned: MODULE.ID + '.ObfuscateNPCsVisibility.Owned',
				token: MODULE.ID + '.ObfuscateNPCsVisibility.Token',
				// visible: 'coffee.pub-crier.ObfuscateNPCsVisibility.Visible',
				any: MODULE.ID + '.ObfuscateNPCsVisibility.Any',
			},
			default: 'all',
		});
		// Legacy no-op retained as hidden so existing world data remains valid.
		game.settings.register(MODULE.ID, CRIER.compact, {
			name: MODULE.ID + '.Compact-Label',
			hint: MODULE.ID + '.Compact-Hint',
			type: Boolean,
			config: false,
			scope: 'world',
			default: true,
		});
		
		// -- Bloody Portraits --
		game.settings.register(MODULE.ID, CRIER.hideBloodyPortrait, {
			name: MODULE.ID + '.hideBloodyPortrait-Label',
			hint: MODULE.ID + '.hideBloodyPortrait-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});
		// -- Player Names --
		// -- Abilities --
		game.settings.register(MODULE.ID, CRIER.hideAbilities, {
			name: MODULE.ID + '.hideAbilities-Label',
			hint: MODULE.ID + '.hideAbilities-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});
		// -- Active Effects & Conditions --
		game.settings.register(MODULE.ID, CRIER.showActiveEffects, {
			name: MODULE.ID + '.showActiveEffects-Label',
			hint: MODULE.ID + '.showActiveEffects-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		game.settings.register(MODULE.ID, CRIER.showTurnPenalties, {
			name: MODULE.ID + '.showTurnPenalties-Label',
			hint: MODULE.ID + '.showTurnPenalties-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		game.settings.register(MODULE.ID, CRIER.activeEffectsAudience, {
			name: MODULE.ID + '.activeEffectsAudience-Label',
			hint: MODULE.ID + '.activeEffectsAudience-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				players: MODULE.ID + '.ActiveEffectsAudience.Players',
				npcs: MODULE.ID + '.ActiveEffectsAudience.NPCs',
				both: MODULE.ID + '.ActiveEffectsAudience.Both',
			},
			default: 'both',
		});
		// -- Health --
		game.settings.register(MODULE.ID, CRIER.hideHealth, {
			name: MODULE.ID + '.hideHealth-Label',
			hint: MODULE.ID + '.hideHealth-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});

		// ===== MISSED TURNS =====
		game.settings.register(MODULE.ID, CRIER.headingH3MissedTurns, {
			name: MODULE.ID + '.headingH3MissedTurns-Label',
			hint: MODULE.ID + '.headingH3MissedTurns-Hint',
			scope: 'world', config: true, default: '', type: String
		});
		// -- Display Missed Turns --
		game.settings.register(MODULE.ID, CRIER.missedKey, {
			name: MODULE.ID + '.missedTurn-Label',
			hint: MODULE.ID + '.missedTurn-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true
		});
		// -- Missed Turn in Chat --
		game.settings.register(MODULE.ID, CRIER.missedTurnNotification, {
			name: MODULE.ID + '.missedTurnNotification-Label',
			hint: MODULE.ID + '.missedTurnNotification-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});

		// ===== INTERNAL STATE TRACKING =====
		// -- Round Initialization Flag (Hidden Setting) --
		game.settings.register(MODULE.ID, CRIER.roundInitialized, {
			name: 'Round Initialized',
			hint: 'Internal flag tracking if current round has all initiatives rolled',
			scope: 'world',
			config: false, // Hidden setting - not shown in UI
			type: Boolean,
			default: false
		});

        // -------------------------------------------------------------- 

        // After registration, never before: a setting cannot be read until it
        // exists.
        await migrateCardThemeSettings();

    } catch (error) {
        console.error('❌ Coffee Pub Crier: Failed to register settings with new Blacksmith API:', error);
    }
};
