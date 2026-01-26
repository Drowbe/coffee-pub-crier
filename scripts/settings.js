// ================================================================== 
// ===== IMPORTS ====================================================
// ================================================================== 

// Grab the module data
import { MODULE, CRIER  } from './const.js';

// ================================================================== 
// ===== SETTINGS ==================================================
// ================================================================== 
  
// ================================================================== 
// ===== HELPER FUNCTIONS ==========================================
// ================================================================== 

/**
 * Get Blacksmith theme choices for round cards
 * Returns choices that map to Blacksmith announcement themes
 * New themes listed first, legacy themes with "(Legacy)" suffix
 */
function getRoundCardThemeChoices() {
	// New Blacksmith themes (listed first)
	const newThemes = {
		'theme-announcement-green': 'Green Moss (Announcement)',
		'theme-announcement-red': 'Red Wine (Announcement)',
		'theme-announcement-blue': 'Blue Velvet (Announcement)',
		'theme-default': 'Simple',
		'theme-blue': 'Blue Velvet',
		'theme-green': 'Green Moss',
		'theme-red': 'Red Wine'
	};
	
	// Legacy themes (mapped to new themes for backward compatibility)
	// Only the main legacy themes - minimal/simple variants removed (they map to same themes)
	const legacyThemes = {
		'cardsgreen': 'Green Moss (Announcement) (Legacy)',
		'cardsred': 'Red Wine (Announcement) (Legacy)',
		'cardsdark': 'Dark And Stormy (Legacy)',
		'cardsblue': 'Blue Velvet (Legacy)'
	};
	
	return { ...newThemes, ...legacyThemes };
}

/**
 * Get Blacksmith theme choices for turn cards
 * Returns choices that map to Blacksmith card themes
 * New themes listed first, legacy themes with "(Legacy)" suffix
 */
function getTurnCardThemeChoices() {
	// New Blacksmith themes (listed first)
	const newThemes = {
		'theme-default': 'Simple',
		'theme-blue': 'Blue Velvet',
		'theme-green': 'Green Moss',
		'theme-red': 'Red Wine',
		'theme-orange': 'Orange'
	};
	
	// Legacy themes (mapped to new themes for backward compatibility)
	// Only the main legacy themes - minimal/simple variants removed (they map to same themes)
	const legacyThemes = {
		'cardsdark': 'Dark And Stormy (Legacy)',
		'cardsgreen': 'Green Moss (Legacy)',
		'cardsred': 'Red Wine (Legacy)',
		'cardsblue': 'Blue Velvet (Legacy)',
		'cardsbrown': 'Brown Earth (Legacy)'
	};
	
	return { ...newThemes, ...legacyThemes };
}

export const registerSettings = async () => {
    try {
        // Get constants using the API function approach
        const constants = BlacksmithAPIConstants ? BlacksmithAPIConstants() : BlacksmithConstants;

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

		// ===== ROUND SETTINGS =====
		// -- Round Cycling --
		game.settings.register(MODULE.ID, CRIER.roundCycling, {
			name: MODULE.ID + '.roundCycling-Label',
			hint: MODULE.ID + '.roundCycling-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true
		});
		// -- Round Card Style --
		// Updated to use Blacksmith theme choices for round cards
		game.settings.register(MODULE.ID, CRIER.roundCardStyle, {
			name: MODULE.ID + '.roundCardStyle-Label',
			hint: MODULE.ID + '.roundCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'cardsgreen', // Maps to theme-announcement-green
			choices: getRoundCardThemeChoices()
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

		// ===== TURN SETTINGS =====
		// -- Display Turn Cards --
		game.settings.register(MODULE.ID, CRIER.turnCycling, {
			name: MODULE.ID + '.turnCycling-Label',
			hint: MODULE.ID + '.turnCycling-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
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
		// Updated to use Blacksmith theme choices for turn cards
		game.settings.register(MODULE.ID, CRIER.turnCardStyle, {
			name: MODULE.ID + '.turnCardStyle-Label',
			hint: MODULE.ID + '.turnCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'cardsdark',
			choices: getTurnCardThemeChoices(),
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
		// -- Image Background --
		game.settings.register(MODULE.ID, CRIER.tokenBackground, {
			name: MODULE.ID + '.tokenBackground-Label',
			hint: MODULE.ID + '.tokenBackground-Hint',
			scope: 'world',
			config: true,
			type: String,
			choices: constants?.arrBackgroundImageChoices || {
				'error': 'Failed to load backgrounds - check Blacksmith module'
			},
			default: 'dirt',
		});
		// -- Image Scale --
		game.settings.register(MODULE.ID, CRIER.tokenScale, {
			name: MODULE.ID + '.tokenScale-Label',
			hint: MODULE.ID + '.tokenScale-Hint',
			scope: "world",
			config: true,
			type: Number,
			range: {
			  min: 25,
			  max: 100,
			  step: 5,
			},
			default: 100,
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
		// ===== MISC Settings =====
		// -- Compact --
		game.settings.register(MODULE.ID, CRIER.compact, {
			name: MODULE.ID + '.Compact-Label',
			hint: MODULE.ID + '.Compact-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		
		// -- TURN PERSOANLIZATION --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH3simpleTurnElements, {
			name: MODULE.ID + '.headingH3simpleTurnElements-Label',
			hint: MODULE.ID + '.headingH3simpleTurnElements-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

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
		game.settings.register(MODULE.ID, CRIER.hidePlayer, {
			name: MODULE.ID + '.hidePlayer-Label',
			hint: MODULE.ID + '.hidePlayer-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});
		
		// -- Abilities --
		game.settings.register(MODULE.ID, CRIER.hideAbilities, {
			name: MODULE.ID + '.hideAbilities-Label',
			hint: MODULE.ID + '.hideAbilities-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
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
        
    } catch (error) {
        console.error('❌ Coffee Pub Crier: Failed to register settings with new Blacksmith API:', error);
    }
};