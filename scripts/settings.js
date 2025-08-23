// ================================================================== 
// ===== IMPORTS ====================================================
// ================================================================== 

// Grab the module data
import { MODULE_TITLE, MODULE_ID, CRIER  } from './const.js';
// -- Blacksmith API Integration --
// All utilities now come from Blacksmith API
// -- Import special page variables --
// None.

// ================================================================== 
// ===== EXPORTS ====================================================
// ================================================================== 

// ================================================================== 
// ===== FUNCTIONS ==================================================
// ================================================================== 

// ================================================================== 
// ===== SETTINGS ==================================================
// ================================================================== 
  
export const registerSettings = () => {
	Hooks.once('ready', async() => {
        // Get Blacksmith API
        const blacksmith = game.modules.get('coffee-pub-blacksmith')?.api;
        if (!blacksmith?.utils?.getSettingSafely) {
            console.error("Blacksmith API not ready for settings registration!");
            return;
        }

        console.log('🔧 Coffee Pub Crier: Starting settings registration...');
        console.log('🔧 Blacksmith available:', !!blacksmith);
        console.log('🔧 BLACKSMITH object:', blacksmith.BLACKSMITH);

        // -------------------------------------------------------------- 
        // Register settings...
        // postConsoleAndNotification("Registering Settings...", "", false, false, false) 
        
        // Debug: Post the variables from Blacksmith
        if (blacksmith.BLACKSMITH) {
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.strDefaultCardTheme: ", blacksmith.BLACKSMITH.strDefaultCardTheme, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrThemeChoices: ", blacksmith.BLACKSMITH.arrThemeChoices, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrMacroChoices: ", blacksmith.BLACKSMITH.arrMacroChoices, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrTableChoices: ", blacksmith.BLACKSMITH.arrTableChoices, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrBackgroundImageChoices: ", blacksmith.BLACKSMITH.arrBackgroundImageChoices, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrIconChoices: ", blacksmith.BLACKSMITH.arrIconChoices, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrSoundChoices: ", blacksmith.BLACKSMITH.arrSoundChoices, false, true, false);
            // postConsoleAndNotification("Variables in Settings. BLACKSMITH.arrCompendiumChoices: ", blacksmith.BLACKSMITH.arrCompendiumChoices, false, true, false);
        }

		// -- TITLE --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH1Crier, {
			name: MODULE_ID + '.headingH1Crier-Label',
			hint: MODULE_ID + '.headingH1Crier-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- ROUNDS --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH2Rounds, {
			name: MODULE_ID + '.headingH2Rounds-Label',
			hint: MODULE_ID + '.headingH2Rounds-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- ROUND STYLES --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH3simpleRoundStyle, {
			name: MODULE_ID + '.headingH3simpleRoundStyle-Label',
			hint: MODULE_ID + '.headingH3simpleRoundStyle-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// ===== ROUND SETTINGS =====
		// -- Round Cycling --
		game.settings.register(MODULE_ID, CRIER.roundCycling, {
			name: MODULE_ID + '.roundCycling-Label',
			hint: MODULE_ID + '.roundCycling-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true
		});
		// -- Round Card Style --
		game.settings.register(MODULE_ID, CRIER.roundCardStyle, {
			name: MODULE_ID + '.roundCardStyle-Label',
			hint: MODULE_ID + '.roundCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: blacksmith.BLACKSMITH?.strDefaultCardTheme || 'cardsgreen',
			choices: blacksmith.BLACKSMITH?.arrThemeChoices || {
				'cardsdark': 'Full Cards: Dark Mode', 
				'cardsgreen': 'Full Cards: Green', 
				'cardsred': 'Full Cards: Red', 
				'cardssimple': 'Simple Cards: Default Foundry', 
				'cardsminimalplain': 'Minimal Cards: Plain'
			}
		});
		// -- Round Icon --
		game.settings.register(MODULE_ID, CRIER.roundIconStyle, {
			name: MODULE_ID + '.roundIconStyle-Label',
			hint: MODULE_ID + '.roundIconStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'fa-chess-queen',
			choices: blacksmith.BLACKSMITH?.arrIconChoices || {},
		});

		// -- ROUND SETTINGS --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH3simpleRoundSettings, {
			name: MODULE_ID + '.headingH3simpleRoundSettings-Label',
			hint: MODULE_ID + '.headingH3simpleRoundSettings-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Round Sound --
		game.settings.register(MODULE_ID, CRIER.roundSound, {
			name: MODULE_ID + '.roundSound-Label',
			hint: MODULE_ID + '.roundSound-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'gong',
			choices: blacksmith.BLACKSMITH?.arrSoundChoices || {},
		});
		// -- Round Label --
		game.settings.register(MODULE_ID, CRIER.roundLabel, {
			name: MODULE_ID + '.round-Label',
			hint: MODULE_ID + '.round-Hint',
			type: String,
			config: true,
			scope: 'world',
			default: 'Round {round}'
		});


		// -- TURNS --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH2turns, {
			name: MODULE_ID + '.headingH2turns-Label',
			hint: MODULE_ID + '.headingH2turns-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- TURN STYLE --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH3simpleTurnStyle, {
			name: MODULE_ID + '.headingH3simpleTurnStyle-Label',
			hint: MODULE_ID + '.headingH3simpleTurnStyle-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// ===== TURN SETTINGS =====
		// -- Display Turn Cards --
		game.settings.register(MODULE_ID, CRIER.turnCycling, {
			name: MODULE_ID + '.turnCycling-Label',
			hint: MODULE_ID + '.turnCycling-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		// -- Turn Card Layout --
		game.settings.register(MODULE_ID, CRIER.turnLayout, {
			name: MODULE_ID + '.turnLayout-Label',
			hint: MODULE_ID + '.turnLayout-Hint',
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
		game.settings.register(MODULE_ID, CRIER.turnCardStyle, {
			name: MODULE_ID + '.turnCardStyle-Label',
			hint: MODULE_ID + '.turnCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: blacksmith.BLACKSMITH?.strDefaultCardTheme || 'cardsdark',
			choices: blacksmith.BLACKSMITH?.arrThemeChoices || {},
		});
		// -- Turn Card Color --
		game.settings.register(MODULE_ID, CRIER.turnIconStyle, {
			name: MODULE_ID + '.turnIconStyle-Label',
			hint: MODULE_ID + '.turnIconStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'fa-shield',
			choices: blacksmith.BLACKSMITH?.arrIconChoices || {},
		});

		// -- TURN STYLE --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH3simpleTurnSettings, {
			name: MODULE_ID + '.headingH3simpleTurnSettings-Label',
			hint: MODULE_ID + '.headingH3simpleTurnSettings-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Turn Sound --
		game.settings.register(MODULE_ID, CRIER.turnSound, {
			name: MODULE_ID + '.turnSound-Label',
			hint: MODULE_ID + '.turnSound-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'gong',
			choices: blacksmith.BLACKSMITH?.arrSoundChoices || {},
		});
		// -- Turn Card Label --
		game.settings.register(MODULE_ID, CRIER.turnLabel, {
			name: MODULE_ID + '.turnCard-Label',
			hint: MODULE_ID + '.turnCard-Hint',
			type: String,
			config: true,
			scope: 'world',
			default: '{name}',
		});



		// ===== TURN CARD PERSONALIZATION =====
		// -- Image Style --
		game.settings.register(MODULE_ID, CRIER.portraitStyle, {
			name: MODULE_ID + '.portraitStyle-Label',
			hint: MODULE_ID + '.portraitStyle-Hint',
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
		game.settings.register(MODULE_ID, CRIER.tokenBackground, {
			name: MODULE_ID + '.tokenBackground-Label',
			hint: MODULE_ID + '.tokenBackground-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: blacksmith.BLACKSMITH?.arrBackgroundImageChoices || {},
			default: 'dirt',
		});
		// -- Image Scale --
		game.settings.register(MODULE_ID, CRIER.tokenScale, {
			name: MODULE_ID + '.tokenScale-Label',
			hint: MODULE_ID + '.tokenScale-Hint',
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
		game.settings.register(MODULE_ID, CRIER.obfuscateNPCs, {
			name: MODULE_ID + '.obfuscateNPCs-Label',
			hint: MODULE_ID + '.obfuscateNPCs-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				all: MODULE_ID + '.ObfuscateNPCsVisibility.All',
				owned: MODULE_ID + '.ObfuscateNPCsVisibility.Owned',
				token: MODULE_ID + '.ObfuscateNPCsVisibility.Token',
				// visible: 'coffee.pub-crier.ObfuscateNPCsVisibility.Visible',
				any: MODULE_ID + '.ObfuscateNPCsVisibility.Any',
			},
			default: 'all',
		});
		// ===== MISC Settings =====
		// -- Compact --
		game.settings.register(MODULE_ID, CRIER.compact, {
			name: MODULE_ID + '.Compact-Label',
			hint: MODULE_ID + '.Compact-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		
		// -- TURN PERSOANLIZATION --
		// ------------------------------------------------------------
		game.settings.register(MODULE_ID, CRIER.headingH3simpleTurnElements, {
			name: MODULE_ID + '.headingH3simpleTurnElements-Label',
			hint: MODULE_ID + '.headingH3simpleTurnElements-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- Bloody Portraits --
		game.settings.register(MODULE_ID, CRIER.hideBloodyPortrait, {
			name: MODULE_ID + '.hideBloodyPortrait-Label',
			hint: MODULE_ID + '.hideBloodyPortrait-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});
		// -- Player Names --
		game.settings.register(MODULE_ID, CRIER.hidePlayer, {
			name: MODULE_ID + '.hidePlayer-Label',
			hint: MODULE_ID + '.hidePlayer-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});
		
		// -- Abilities --
		game.settings.register(MODULE_ID, CRIER.hideAbilities, {
			name: MODULE_ID + '.hideAbilities-Label',
			hint: MODULE_ID + '.hideAbilities-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});
		// -- Health --
		game.settings.register(MODULE_ID, CRIER.hideHealth, {
			name: MODULE_ID + '.hideHealth-Label',
			hint: MODULE_ID + '.hideHealth-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: false,
		});

		// ===== MISSED TURNS =====
		// -- Display Missed Turns --
		game.settings.register(MODULE_ID, CRIER.missedKey, {
			name: MODULE_ID + '.missedTurn-Label',
			hint: MODULE_ID + '.missedTurn-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true
		});
		// -- Missed Turn in Chat --
		game.settings.register(MODULE_ID, CRIER.missedTurnNotification, {
			name: MODULE_ID + '.missedTurnNotification-Label',
			hint: MODULE_ID + '.missedTurnNotification-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});

        // -------------------------------------------------------------- 
        
        console.log('✅ Coffee Pub Crier: Settings registration completed successfully');
        console.log('🔧 Total settings registered:', Object.keys(CRIER).length);
	});
};