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
 * Carry a world's choices over to the settings that replaced them.
 *
 * Two pairs collapsed into one choice each, because in both cases the second
 * setting only meant anything when the first was on: "Announce Turns" plus a
 * layout became a layout with "do not announce" as one of its options, and
 * "Show Status & Conditions" plus an audience became an audience with "do not
 * show" as one of its options.
 *
 * The three `hide...` toggles became `show...`, so their stored values invert.
 *
 * Runs once: each target is written only while it still holds its default, so
 * a GM who has since chosen something else does not get overwritten on the next
 * load. World settings, so only a GM writes them.
 */
async function migrateTurnSettings() {
	if (!game.user?.isGM) return;

	const get = (key, fallback) => {
		try { return game.settings.get(MODULE.ID, key); } catch { return fallback; }
	};
	const setIfUntouched = async (key, value, currentDefault) => {
		try {
			if (game.settings.get(MODULE.ID, key) !== currentDefault) return;
			if (value === currentDefault) return;
			await game.settings.set(MODULE.ID, key, value);
			console.log(`Coffee Pub Crier: Migrated ${key} to "${value}"`);
		} catch (error) {
			console.error(`Coffee Pub Crier: Could not migrate ${key}:`, error);
		}
	};

	await setIfUntouched(CRIER.turnCards,
		get(CRIER.legacyTurnCycling, true) === false ? 'none' : get(CRIER.legacyTurnLayout, 'full'),
		'full');

	await setIfUntouched(CRIER.activeEffects,
		get(CRIER.legacyShowActiveEffects, true) === false ? 'none' : get(CRIER.legacyActiveEffectsAudience, 'both'),
		'both');

	await setIfUntouched(CRIER.roundCards,
		get(CRIER.legacyRoundCycling, true) === false ? 'none' : 'announce',
		'announce');

	const start = get(CRIER.legacyCombatStartCycling, true) !== false;
	const end = get(CRIER.legacyCombatEndCycling, true) !== false;
	await setIfUntouched(CRIER.combatCards,
		start && end ? 'both' : start ? 'start' : end ? 'end' : 'none',
		'both');

	await setIfUntouched(CRIER.missedTurns,
		get(CRIER.legacyMissedTurn, true) === false
			? 'none'
			: (get(CRIER.legacyMissedTurnNotification, true) === false ? 'card' : 'notify'),
		'notify');

	await setIfUntouched(CRIER.showBloodyPortrait, !get(CRIER.legacyHideBloodyPortrait, false), true);

	// Health and abilities came the long way round: `hideX` first became
	// `showX`, and `showX` then became an audience. A world that skipped the
	// middle step is covered because the boolean's own default is the answer
	// the first step would have written -- both readings agree on "shown".
	//
	// Only ever "players": those two were hard-coded to player characters, so
	// carrying them to `both` would put hit points on every monster card at a
	// table that had never asked for it.
	for (const [target, legacyHide, legacyShow] of [
		[CRIER.health, CRIER.legacyHideHealth, CRIER.legacyShowHealth],
		[CRIER.abilities, CRIER.legacyHideAbilities, CRIER.legacyShowAbilities]
	]) {
		const shown = get(legacyHide, false) === false && get(legacyShow, true) !== false;
		await setIfUntouched(target, shown ? 'players' : 'none', 'players');
	}

	// Penalties DID have an audience already -- the one they shared with the
	// effects list -- so that is what they keep. Their new default is narrower,
	// and a world that had them on for everybody should not quietly lose them
	// on half its cards.
	await setIfUntouched(CRIER.penalties,
		get(CRIER.legacyShowTurnPenalties, true) === false
			? 'none'
			: get(CRIER.legacyActiveEffectsAudience, 'both'),
		'players');
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

		// -- COMBAT CONFIGURATION --
		// ------------------------------------------------------------
		game.settings.register(MODULE.ID, CRIER.headingH2Lifecycle, {
			name: MODULE.ID + '.headingH2Lifecycle-Label', hint: MODULE.ID + '.headingH2Lifecycle-Hint',
			type: String, config: true, scope: 'world', default: ''
		});
		// ------------------------------------------------------------

		// -- Combat Cards --
		// Two checkboxes became one choice. They were never independent in
		// practice -- a table either narrates the shape of a fight or it does
		// not -- and the pair made "neither" look like a state you had to
		// assemble.
		game.settings.register(MODULE.ID, CRIER.combatCards, {
			name: MODULE.ID + '.combatCards-Label', hint: MODULE.ID + '.combatCards-Hint',
			type: String, config: true, scope: 'world', default: 'both',
			choices: {
				none: MODULE.ID + '.CombatCards.None',
				start: MODULE.ID + '.CombatCards.Start',
				end: MODULE.ID + '.CombatCards.End',
				both: MODULE.ID + '.CombatCards.Both'
			}
		});
		game.settings.register(MODULE.ID, CRIER.combatStartLabel, {
			name: MODULE.ID + '.combatStartLabel-Label', hint: MODULE.ID + '.combatStartLabel-Hint',
			type: String, config: true, scope: 'world', default: 'Combat Begins'
		});
		game.settings.register(MODULE.ID, CRIER.combatEndLabel, {
			name: MODULE.ID + '.combatEndLabel-Label', hint: MODULE.ID + '.combatEndLabel-Hint',
			type: String, config: true, scope: 'world', default: 'Combat Ends'
		});
		game.settings.register(MODULE.ID, CRIER.combatIconStyle, {
			name: MODULE.ID + '.combatIconStyle-Label', hint: MODULE.ID + '.combatIconStyle-Hint',
			type: String, config: true, scope: 'world', default: constants?.ICONSHIELD || 'fa-shield',
			choices: constants?.arrIconChoices || { error: 'Failed to load icons - check Blacksmith module' }
		});
		game.settings.register(MODULE.ID, CRIER.combatCardStyle, {
			name: MODULE.ID + '.combatCardStyle-Label', hint: MODULE.ID + '.combatCardStyle-Hint',
			type: String, config: true, scope: 'world', default: 'green-dark',
			choices: cardThemeChoices
		});
		game.settings.register(MODULE.ID, CRIER.combatStartSound, {
			name: MODULE.ID + '.combatStartSound-Label', hint: MODULE.ID + '.combatStartSound-Hint',
			type: String, config: true, scope: 'world', default: constants?.SOUNDGONG || 'gong',
			choices: constants?.arrSoundChoices || { error: 'Failed to load sounds - check Blacksmith module' }
		});
		game.settings.register(MODULE.ID, CRIER.combatEndSound, {
			name: MODULE.ID + '.combatEndSound-Label', hint: MODULE.ID + '.combatEndSound-Hint',
			type: String, config: true, scope: 'world', default: 'none',
			choices: constants?.arrSoundChoices || { error: 'Failed to load sounds - check Blacksmith module' }
		});

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
		// -- ROUND CONFIGURATION --
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

		// -- Round Cards --
		// Two options where a checkbox would do, so that every section of this
		// panel opens the same way: whether the card is posted at all, then how
		// it reads.
		game.settings.register(MODULE.ID, CRIER.roundCards, {
			name: MODULE.ID + '.roundCards-Label',
			hint: MODULE.ID + '.roundCards-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.RoundCards.None',
				announce: MODULE.ID + '.RoundCards.Announce'
			},
			default: 'announce',
		});
		// -- Card Label --
		game.settings.register(MODULE.ID, CRIER.roundLabel, {
			name: MODULE.ID + '.round-Label',
			hint: MODULE.ID + '.round-Hint',
			type: String,
			config: true,
			scope: 'world',
			default: 'Round {round}',
		});
		// -- Card Icon --
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
		// -- Card Theme --
		game.settings.register(MODULE.ID, CRIER.roundCardStyle, {
			name: MODULE.ID + '.roundCardStyle-Label',
			hint: MODULE.ID + '.roundCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'green-dark', // Blacksmith theme id
			choices: cardThemeChoices
		});
		// -- Round Start Sound --
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

		game.settings.register(MODULE.ID, CRIER.headingH2turns, {
			name: MODULE.ID + '.headingH2turns-Label',
			hint: MODULE.ID + '.headingH2turns-Hint',
			scope: "world",
			config: true,
			default: "",
			type: String,
		});
		// ------------------------------------------------------------

		// -- TURN CONFIGURATION --
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

		// -- Turn Cards --
		// Whether to announce a turn and how much the card shows, in one
		// choice. They were two settings, and "Announce Turns" off with a
		// layout still selected below it invited the reader to wonder which
		// won.
		game.settings.register(MODULE.ID, CRIER.turnCards, {
			name: MODULE.ID + '.turnCards-Label',
			hint: MODULE.ID + '.turnCards-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.TurnCards.None',
				full: MODULE.ID + '.TurnCards.Full',
				small: MODULE.ID + '.TurnCards.Small'
			},
			default: 'full',
		});
		// -- Card Label --
		game.settings.register(MODULE.ID, CRIER.turnLabel, {
			name: MODULE.ID + '.turnCard-Label',
			hint: MODULE.ID + '.turnCard-Hint',
			type: String,
			config: true,
			scope: 'world',
			default: '{name}',
		});
		// -- Card Icon --
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
		// -- Card Theme --
		game.settings.register(MODULE.ID, CRIER.turnCardStyle, {
			name: MODULE.ID + '.turnCardStyle-Label',
			hint: MODULE.ID + '.turnCardStyle-Hint',
			scope: 'world',
			config: true,
			type: String,
			default: 'default', // Blacksmith theme id
			choices: cardThemeChoices,
		});
		// -- Turn Start Sound --
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
		
		// -- Portrait Blood --
		// No audience of its own: blood is a health readout, so it appears for
		// whoever health does. A splattered portrait beside no bar would be
		// telling half the story.
		game.settings.register(MODULE.ID, CRIER.showBloodyPortrait, {
			name: MODULE.ID + '.showBloodyPortrait-Label',
			hint: MODULE.ID + '.showBloodyPortrait-Hint',
			type: Boolean,
			config: true,
			scope: 'world',
			default: true,
		});
		// -- Health --
		// Four content settings, one shape: show this, and say who for. `none`
		// is the audience nobody is in, which is why an "off" checkbox beside an
		// audience dropdown was never two questions.
		game.settings.register(MODULE.ID, CRIER.health, {
			name: MODULE.ID + '.health-Label',
			hint: MODULE.ID + '.health-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.Health.None',
				players: MODULE.ID + '.Audience.Players',
				npcs: MODULE.ID + '.Audience.NPCs',
				both: MODULE.ID + '.Audience.Both'
			},
			default: 'players',
		});
		// -- Abilities --
		game.settings.register(MODULE.ID, CRIER.abilities, {
			name: MODULE.ID + '.abilities-Label',
			hint: MODULE.ID + '.abilities-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.Abilities.None',
				players: MODULE.ID + '.Audience.Players',
				npcs: MODULE.ID + '.Audience.NPCs',
				both: MODULE.ID + '.Audience.Both'
			},
			default: 'players',
		});
		// -- Active Effects & Conditions --
		game.settings.register(MODULE.ID, CRIER.activeEffects, {
			name: MODULE.ID + '.activeEffects-Label',
			hint: MODULE.ID + '.activeEffects-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.ActiveEffects.None',
				players: MODULE.ID + '.Audience.Players',
				npcs: MODULE.ID + '.Audience.NPCs',
				both: MODULE.ID + '.Audience.Both'
			},
			default: 'both',
		});
		// -- Turn Penalties --
		game.settings.register(MODULE.ID, CRIER.penalties, {
			name: MODULE.ID + '.penalties-Label',
			hint: MODULE.ID + '.penalties-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.Penalties.None',
				players: MODULE.ID + '.Audience.Players',
				npcs: MODULE.ID + '.Audience.NPCs',
				both: MODULE.ID + '.Audience.Both'
			},
			default: 'players',
		});

		// ===== SUPERSEDED SETTINGS =====
		// Registered but hidden. A world's stored values stay valid, and
		// `migrateTurnSettings` reads them once to carry a table's choices over
		// to the settings that replaced them.
		for (const [key, type, fallback] of [
			[CRIER.legacyTurnLayout, String, 'full'],
			[CRIER.legacyTurnCycling, Boolean, true],
			[CRIER.legacyHideBloodyPortrait, Boolean, false],
			[CRIER.legacyHideHealth, Boolean, false],
			[CRIER.legacyHideAbilities, Boolean, false],
			[CRIER.legacyShowActiveEffects, Boolean, true],
			[CRIER.legacyActiveEffectsAudience, String, 'both'],
			[CRIER.legacyRoundCycling, Boolean, true],
			[CRIER.legacyCombatStartCycling, Boolean, true],
			[CRIER.legacyCombatEndCycling, Boolean, true],
			[CRIER.legacyMissedTurn, Boolean, true],
			[CRIER.legacyMissedTurnNotification, Boolean, true],
			[CRIER.legacyShowHealth, Boolean, true],
			[CRIER.legacyShowAbilities, Boolean, true],
			[CRIER.legacyShowTurnPenalties, Boolean, true]
		]) {
			game.settings.register(MODULE.ID, key, {
				name: key, scope: 'world', config: false, type, default: fallback
			});
		}

		// ===== MISSED TURNS =====
		game.settings.register(MODULE.ID, CRIER.headingH3MissedTurns, {
			name: MODULE.ID + '.headingH3MissedTurns-Label',
			hint: MODULE.ID + '.headingH3MissedTurns-Hint',
			scope: 'world', config: true, default: '', type: String
		});
		// -- Missed Turn Reminders --
		// The notification only ever meant anything with the reminder on, so
		// the two are one choice: whether to remind, and how loudly.
		game.settings.register(MODULE.ID, CRIER.missedTurns, {
			name: MODULE.ID + '.missedTurns-Label',
			hint: MODULE.ID + '.missedTurns-Hint',
			type: String,
			config: true,
			scope: 'world',
			choices: {
				none: MODULE.ID + '.MissedTurns.None',
				card: MODULE.ID + '.MissedTurns.Card',
				notify: MODULE.ID + '.MissedTurns.Notify'
			},
			default: 'notify',
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
        await migrateTurnSettings();

    } catch (error) {
        console.error('❌ Coffee Pub Crier: Failed to register settings with new Blacksmith API:', error);
    }
};
