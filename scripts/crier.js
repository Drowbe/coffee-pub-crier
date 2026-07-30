// ================================================================== 
// ===== GET IMPORTS AND CONSTANTS ==================================
// ================================================================== 

// -- Import COMMON Functions --
import { wrapNumber, getDocData, getDefaultPermission, getProtoToken, getUsers, getPermissionLevels } from './common.js';

// -- Import MODULE variables --
import { MODULE, CRIER  } from './const.js';
import { BlacksmithAPI } from '/modules/coffee-pub-blacksmith/api/blacksmith-api.js';



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

/**
 * Cards withheld because the turn order had not settled, waiting for the last
 * initiative to come in. Held on the one client that made the combat update,
 * so flushing it posts each card exactly once.
 * @type {{combatId: string, round: number, context: object, roundCard: boolean, turnCard: boolean}|null}
 */
let heldAnnouncement = null;

// Helper functions to sync with persistent setting
function getRoundInitialized() {
    try {
        return game.settings.get(MODULE.ID, CRIER.roundInitialized);
    } catch (error) {
        // Setting not registered yet - return default
        console.warn('Coffee Pub Crier: roundInitialized setting not yet registered, using default false');
        return false;
    }
}

function setRoundInitialized(value) {
    roundInitialized = value; // Keep local cache in sync
    // The setting is world-scoped, so only a GM can persist it. A player
    // client writing it rejects unhandled and leaves the two out of step;
    // its local cache is all it reads anyway.
    if (!game.user?.isGM) return;
    Promise.resolve(game.settings.set(MODULE.ID, CRIER.roundInitialized, value))
        .catch((error) => debugLog('SET ROUND INITIALIZED: Could not persist', () => ({ error: error?.message ?? error })));
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
    showActiveEffects: CRIER.showActiveEffects,
    showTurnPenalties: CRIER.showTurnPenalties,
    activeEffectsAudience: CRIER.activeEffectsAudience,
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
        const blacksmithMod = game.modules.get('coffee-pub-blacksmith');
        if (blacksmithMod?.active) {
            await BlacksmithAPI.waitForReady();
            try {
                const api = blacksmithMod.api;
                const register =
                    (typeof api?.registerModule === 'function' && api.registerModule.bind(api)) ||
                    (typeof api?.ModuleManager?.registerModule === 'function' &&
                        api.ModuleManager.registerModule.bind(api.ModuleManager)) ||
                    (typeof BlacksmithModuleManager?.registerModule === 'function' &&
                        BlacksmithModuleManager.registerModule.bind(BlacksmithModuleManager));
                if (register) {
                    register(MODULE.ID, { name: MODULE.NAME, version: MODULE.VERSION });
                }
            } catch (regError) {
                console.error('❌ Failed to register ' + MODULE.NAME + ' with Blacksmith:', regError);
            }
        }

        // Initialize templates
        debugLog('READY: Loading templates', () => ({ turn: turn_template_file, round: round_template_file }));
        
        const getTemplateAsync = foundry.applications?.handlebars?.getTemplate;
        debugLog('READY: Checking foundry.applications.handlebars.getTemplate', () => ({
            hasFoundry: !!foundry,
            hasGetTemplate: typeof getTemplateAsync === 'function'
        }));

        try {
            if (typeof getTemplateAsync === 'function') {
                turnTemplate = await getTemplateAsync(turn_template_file);
                debugLog('READY: Turn template loaded', () => ({ success: !!turnTemplate, type: typeof turnTemplate }));
            }
        } catch (err) {
            debugLog('READY: Turn template failed', () => ({ error: err.message }));
        }

        try {
            if (typeof getTemplateAsync === 'function') {
                roundTemplate = await getTemplateAsync(round_template_file);
                debugLog('READY: Round template loaded', () => ({ success: !!roundTemplate, type: typeof roundTemplate }));
            }
        } catch (err) {
            debugLog('READY: Round template failed', () => ({ error: err.message }));
        }
        
        // Initialize last combatant
        lastCombatant.combatant = game.combat?.combatant ?? null;
        
        // Register settings now that Blacksmith is ready (await since it's async)
        await registerSettings();
        
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

                // Initiative lands on Combatant documents, never in a Combat
                // update, so this hook is the wrong place to watch for it —
                // the combatant hooks below do that. Announcing from a
                // preUpdate would also post ahead of the change it describes.
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
        
        // Rolling initiative updates Combatant documents, not the Combat, so
        // `updateCombat` never fires for it — and when the roll leaves the
        // current combatant in the same slot, Foundry's own follow-up
        // `combat.update({turn})` diffs down to nothing and fires no hook at
        // all. Without these two, a card held back at the top of a fight
        // would wait for an event that never comes.
        const updateCombatantHookId = BlacksmithHookManager.registerHook({
            name: 'updateCombatant',
            description: 'Coffee Pub Crier: Post held cards once the last initiative is in',
            context: MODULE.ID,
            priority: 2,
            callback: (combatant, changed) => {
                if (!('initiative' in (changed ?? {}))) return;
                return flushHeldAnnouncement(combatant?.parent);
            }
        });

        const deleteCombatantHookId = BlacksmithHookManager.registerHook({
            name: 'deleteCombatant',
            description: 'Coffee Pub Crier: Post held cards when the combatant being waited on leaves',
            context: MODULE.ID,
            priority: 2,
            callback: (combatant) => flushHeldAnnouncement(combatant?.parent)
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

/**
 * Setting stores Blacksmith asset `value`. Resolve `path` from api.assetLookup.
 * Chat HTML is sanitized — inline `style` is stripped — so we store `imageUrl` on message flags and apply in `renderChatMessage`.
 * No path (themecolor) → CSS class .crier-token-background-themecolor only.
 * @param {string} value
 * @returns {{ imageUrl: string|null, useClass: boolean }}
 */
function getTokenBackgroundPresentation(value) {
	const lookup = game.modules.get('coffee-pub-blacksmith')?.api?.assetLookup;
	const images = lookup?.dataCollections?.backgroundImages;
	if (Array.isArray(images)) {
		const entry = images.find((img) => String(img.value) === String(value));
		if (entry?.path) {
			return {
				imageUrl: foundry.utils.getRoute(entry.path),
				useClass: false
			};
		}
	}
	return { imageUrl: null, useClass: true };
}

/**
 * @param {ParentNode|null|undefined} scope
 * @param {string} imageUrl
 */
function applyCrierTokenBackgroundFrames(scope, imageUrl) {
	if (!scope || !imageUrl) return;
	const safe = String(imageUrl).replace(/\\/g, '/').replace(/"/g, '\\"');
	scope.querySelectorAll?.('.crier-token-frame')?.forEach((el) => {
		el.style.setProperty('background-image', `url("${safe}")`);
		el.style.setProperty('background-repeat', 'repeat');
		el.style.setProperty('background-size', 'cover');
	});
}

const BIBLIOSOPH_ID = 'coffee-pub-bibliosoph';

/**
 * Effects worth surfacing on a turn card: Bibliosoph afflictions, anything
 * with a duration, anything carrying a status id, and hand-authored effects
 * named after a registered condition. Disabled and suppressed effects never
 * qualify — they are not riding on the combatant right now.
 * @param {Actor|null|undefined} actor
 * @returns {Array<ActiveEffect>}
 */
function collectDisplayEffects(actor) {
	if (!actor) return [];

	const conditionNames = new Set([
		...(CONFIG.statusEffects ?? []).map((status) => game.i18n.localize(status.name ?? '').toLowerCase()),
		...Object.values(CONFIG.DND5E?.conditionTypes ?? {}).map((condition) =>
			game.i18n.localize(condition.name ?? '').toLowerCase()
		)
	].filter(Boolean));

	return Array.from(actor.effects ?? []).filter((effect) => {
		try {
			return !effect.disabled && !effect.isSuppressed && (
				!!effect.getFlag(BIBLIOSOPH_ID, 'outcomeBurst')
				|| effect.isTemporary
				|| effect.statuses?.size > 0
				|| conditionNames.has(String(effect.name ?? '').toLowerCase())
			);
		} catch (_) {
			return false;
		}
	});
}

const ROUND_SECONDS = 6;

/**
 * The effect's name as the table says it. Bibliosoph prefixes its criticals
 * and fumbles for sorting; the zone heading already says which it is.
 * @param {ActiveEffect} effect
 * @returns {string}
 */
function displayEffectName(effect) {
	const kind = effect?.getFlag(BIBLIOSOPH_ID, 'outcomeBurst')?.kind;
	const name = String(effect?.name ?? '');
	if (kind === 'crit') return name.replace(/^Critical:\s*/i, '');
	if (kind === 'fumble') return name.replace(/^Fumble:\s*/i, '');
	return name;
}

/**
 * How long an effect has left, in the unit that means something to the table.
 * Empty when it is permanent.
 *
 * Foundry tracks combat durations in rounds and everything else in seconds,
 * and Bibliosoph authors its afflictions in seconds — so the flat "seconds
 * divided by six" conversion turns a ten-minute wound into "97 rounds
 * remain", which is true and unusable. Short remainders are worth counting in
 * rounds because they will lift during the fight; longer ones are a time.
 * @param {ActiveEffect} effect
 * @returns {string}
 */
function remainingTimeLabel(effect) {
	const duration = effect?.duration;
	const type = duration?.type;
	if (!type || type === 'none') return '';

	// Combat-based durations: Foundry already phrases these ("3 Rounds"), and
	// how it encodes `remaining` for them is its business rather than ours.
	if (type !== 'seconds') return String(duration.label ?? '').trim();

	const seconds = Math.round(Number(duration.remaining ?? duration.seconds));
	if (!Number.isFinite(seconds) || seconds <= 0) return '';
	const say = (unit, value) => game.i18n.format(
		`${MODULE.ID}.Duration.${unit}${value === 1 ? 'Singular' : 'Plural'}`,
		{ value }
	);
	if (seconds <= 60) return say('Round', Math.ceil(seconds / ROUND_SECONDS));
	if (seconds < 3600) return say('Minute', Math.round(seconds / 60));
	if (seconds < 86400) return say('Hour', Math.round(seconds / 3600));
	return say('Day', Math.round(seconds / 86400));
}

/**
 * Build display-only active-effect rows for a turn card.
 * Mirrors Bibliosoph's Check-Up filtering and grouping without treatment actions.
 * @param {Actor|null|undefined} actor
 * @param {Array<ActiveEffect>} [collected] Pre-collected effects, to avoid filtering twice.
 * @returns {Promise<Array<{label: string, rows: Array<object>}>>}
 */
async function buildActiveEffectGroups(actor, collected) {
	if (!actor) return [];

	const effects = collected ?? collectDisplayEffects(actor);

	const conditionLabel = (id) => {
		const status = CONFIG.statusEffects?.find((entry) => entry.id === id);
		if (status?.name) return game.i18n.localize(status.name);
		const condition = CONFIG.DND5E?.conditionTypes?.[id];
		if (condition?.name) return game.i18n.localize(condition.name);
		const text = String(id ?? '');
		return text ? text.charAt(0).toUpperCase() + text.slice(1) : '';
	};
	const conveyedBy = (effect) => {
		if (!effect.statuses?.size) return null;
		for (const other of effects) {
			if (other === effect) continue;
			const flag = other.getFlag(BIBLIOSOPH_ID, 'outcomeBurst');
			if (!['injury', 'crit', 'fumble'].includes(flag?.kind)) continue;
			const conveyed = new Set(other.statuses ?? []);
			if (flag.condition) conveyed.add(flag.condition);
			for (const statusId of effect.statuses) {
				if (conveyed.has(statusId)) return other.name;
			}
		}
		return null;
	};
	const TextEditorImpl = foundry.applications?.ux?.TextEditor?.implementation ?? TextEditor;
	const rows = await Promise.all(effects.map(async (effect) => {
		const flag = effect.getFlag(BIBLIOSOPH_ID, 'outcomeBurst');
		const kind = ['injury', 'crit', 'fumble'].includes(flag?.kind) ? flag.kind : 'other';
		const name = displayEffectName(effect);
		const statusIds = new Set(effect.statuses ?? []);
		if (flag?.condition) statusIds.add(flag.condition);
		const conditions = [...statusIds].map(conditionLabel).filter(Boolean).join(', ');
		const durationLabel = remainingTimeLabel(effect);
		let context = conditions;
		if (kind === 'other') {
			const source = conveyedBy(effect);
			context = source ? `via ${source}` : '';
		}
		const typeKey = kind === 'injury' ? 'Injury'
			: kind === 'crit' ? 'Critical'
			: kind === 'fumble' ? 'Fumble'
			: 'Effect';
		const typeLabel = game.i18n.localize(`${MODULE.ID}.ActiveEffectType.${typeKey}`);
		const detail = [typeLabel, context, durationLabel].filter(Boolean).join(' · ');

		let description = String(effect.description ?? '').trim();
		if (description) {
			try {
				description = String(await TextEditorImpl.enrichHTML(description, {
					relativeTo: effect,
					rollData: actor.getRollData?.() ?? {}
				})).trim();
			} catch (_) { /* A malformed embed should not prevent the turn card. */ }
		}
		const tooltip = `<section class="crier-effect-tooltip"><strong>${effect.name}</strong>`
			+ (detail ? `<br><em>${detail}</em>` : '')
			+ (description ? `<hr>${description}` : '')
			+ `</section>`;
		return {
			kind,
			name,
			img: effect.img || 'icons/svg/aura.svg',
			detail,
			tooltip
		};
	}));

	return rows.length ? [{
		label: game.i18n.localize(`${MODULE.ID}.ActiveEffectsGroup.StatusAndConditions`),
		rows
	}] : [];
}

// ************************************
// ** TURN PENALTY REPORT
// ************************************
// The block above says what is on the combatant; this one says what it is
// costing them on the rolls they are about to make. Everything here is
// display-only: Bibliosoph owns applying, ticking, expiring and treating,
// and two modules bleeding the same actor is a bug neither of us wants.

/** dnd5e paths an affliction can bite, in the order they read best on a card. */
const TURN_PENALTY_STATS = [
	{ path: 'system.bonuses.All.attack', label: 'attack rolls' },
	{ path: 'system.bonuses.All.damage', label: 'damage rolls' },
	{ path: 'system.attributes.ac.bonus', label: 'AC' },
	{ path: 'system.bonuses.abilities.check', label: 'ability checks' },
	{ path: 'system.bonuses.abilities.save', label: 'saving throws' }
];

/**
 * A change value we can add up. Formula bonuses like "-1d4" cannot be folded
 * into a flat total; they still appear on their own effect row above, so
 * skipping them here loses nothing.
 * @param {unknown} value
 * @returns {number}
 */
function numericChangeValue(value) {
	const text = String(value ?? '').trim();
	if (!/^[+-]?\d+(?:\.\d+)?$/.test(text)) return 0;
	return Number(text);
}

/** "−3" / "+2", with a true minus sign rather than a hyphen. */
function signedTotal(total) {
	return `${total < 0 ? '−' : '+'}${Math.abs(total)}`;
}

/**
 * HP this combatant loses to bleed at the start of this turn. Ticks are a
 * percentage of max HP so the same wound reads the same at level 1 and 15.
 * The arithmetic mirrors Bibliosoph's damageFor — at least a point, never
 * the last one — and walks the effects in order because Bibliosoph applies
 * them one after another against falling health.
 * @param {Actor} actor
 * @param {Array<ActiveEffect>} effects
 * @returns {number}
 */
function bleedThisTurn(actor, effects) {
	const hp = actor?.system?.attributes?.hp;
	const max = Number(hp?.max) || 0;
	let current = Number(hp?.value) || 0;
	if (max <= 0) return 0;

	let total = 0;
	for (const effect of effects) {
		if (current <= 0) break;
		const percent = Number(effect.getFlag(BIBLIOSOPH_ID, 'outcomeBurst')?.tick) || 0;
		if (percent <= 0) continue;
		const raw = Math.round(max * (percent / 100));
		const loss = Math.max(0, Math.min(Math.max(1, raw), current - 1));
		if (loss <= 0) continue;
		total += loss;
		current -= loss;
	}
	return total;
}

/**
 * Build the "while this lasts" block: summed roll penalties, bleed, and how
 * long the things causing them have left.
 * @param {Actor|null|undefined} actor
 * @param {Array<ActiveEffect>} [collected]
 * @returns {{label: string, rows: Array<{icon: string, text: string}>}|null}
 */
function buildTurnPenaltyReport(actor, collected) {
	if (!actor) return null;
	const effects = collected ?? collectDisplayEffects(actor);
	if (!effects.length) return null;

	const rows = [];

	// 1. ROLL PENALTIES. One summed line beats five effect rows, because the
	// total is the number they are about to roll with.
	const contributors = new Set();
	const totals = [];
	for (const { path, label } of TURN_PENALTY_STATS) {
		let total = 0;
		for (const effect of effects) {
			for (const change of effect.changes ?? []) {
				if (change?.key !== path) continue;
				const value = numericChangeValue(change.value);
				if (!value) continue;
				total += value;
				contributors.add(effect);
			}
		}
		if (total) totals.push(`${signedTotal(total)} to ${label}`);
	}
	if (totals.length) {
		rows.push({ icon: 'fa-solid fa-dice-d20', text: totals.join(' · ') });
	}

	// 2. BLEED. Reported, never applied — Bibliosoph does that on updateCombat.
	const bleed = bleedThisTurn(actor, effects);
	if (bleed > 0) {
		for (const effect of effects) {
			if (Number(effect.getFlag(BIBLIOSOPH_ID, 'outcomeBurst')?.tick) > 0) contributors.add(effect);
		}
		rows.push({
			icon: 'fa-solid fa-droplet',
			text: game.i18n.format(`${MODULE.ID}.TurnPenalties.Bleeding`, { hp: bleed })
		});
	}

	// 3. TIME REMAINING, only for what is actually costing them something
	// above — the countdown is a promise about when the numbers lift, and
	// every other duration is already on the effect rows. Soonest relief first.
	// Nothing above means nothing to count down to: penalties that cancel out
	// would otherwise leave a bare timer explaining a line that is not there.
	if (!rows.length) return null;
	const timers = effects
		.filter((effect) => contributors.has(effect))
		.map((effect) => ({
			name: displayEffectName(effect),
			time: remainingTimeLabel(effect),
			seconds: Number(effect.duration?.remaining ?? effect.duration?.seconds) || Infinity
		}))
		.filter((entry) => entry.time)
		.sort((a, b) => a.seconds - b.seconds);
	for (const { name, time } of timers) {
		rows.push({
			icon: 'fa-solid fa-hourglass-half',
			text: game.i18n.format(`${MODULE.ID}.TurnPenalties.TimeRemaining`, { name, time })
		});
	}

	return { label: game.i18n.localize(`${MODULE.ID}.TurnPenalties.Title`), rows };
}

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

	// Sanitized chat HTML strips inline styles; apply tile URL from flags after DOM exists.
	const bgUrl = flags.tokenBackgroundImageUrl ?? cm.getFlag(MODULE.ID, 'tokenBackgroundImageUrl');
	if (bgUrl) {
		const scope = main ?? nativeHtml?.closest?.('.message') ?? nativeHtml;
		applyCrierTokenBackgroundFrames(scope, bgUrl);
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
				roundIconStyle: info.roundIconStyle,
				...(info.tokenBackgroundImageUrl
					? { tokenBackgroundImageUrl: info.tokenBackgroundImageUrl }
					: {})
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
async function mapRoundCardStyleToTheme(roundCardStyle) {
    // If already a CSS class name (starts with 'theme-'), return as-is
    if (roundCardStyle?.startsWith('theme-')) {
        return roundCardStyle;
    }
    
    // If it's a theme ID (not a class name), convert it using API
    try {
        const blacksmith = await BlacksmithAPI.get();
        const chatCardsAPI = blacksmith?.chatCards;
        if (chatCardsAPI) {
            return chatCardsAPI.getThemeClassName(roundCardStyle) || 'theme-default';
        }
    } catch (error) {
        console.warn('Coffee Pub Crier: Error accessing Chat Cards API, using fallback:', error);
    }
    
    // Fallback to default
    return 'theme-default';
}

// ************************************
// ** MAP TURN CARD STYLE TO BLACKSMITH THEME
// ************************************
async function mapTurnCardStyleToTheme(turnCardStyle) {
    // If already a CSS class name (starts with 'theme-'), return as-is
    if (turnCardStyle?.startsWith('theme-')) {
        return turnCardStyle;
    }
    
    // If it's a theme ID (not a class name), convert it using API
    try {
        const blacksmith = await BlacksmithAPI.get();
        const chatCardsAPI = blacksmith?.chatCards;
        if (chatCardsAPI) {
            return chatCardsAPI.getThemeClassName(turnCardStyle) || 'theme-default';
        }
    } catch (error) {
        console.warn('Coffee Pub Crier: Error accessing Chat Cards API, using fallback:', error);
    }
    
    // Fallback to default
    return 'theme-default';
}

// ************************************
// ** CREATE NEW ROUND CARD
// ************************************
async function createNewRoundCard(combat) {
    const speaker = ChatMessage.getSpeaker('GM');
    const override = await getSettingSafely(MODULE.ID, CRIER.roundLabel);
    const roundCardStyle = await getSettingSafely(MODULE.ID, CRIER.roundCardStyle, 'theme-announcement-green');
    const roundIconStyle = await getSettingSafely(MODULE.ID, CRIER.roundIconStyle, 'fa-chess-queen');
    
    const theme = await mapRoundCardStyleToTheme(roundCardStyle);
    const data = { 
        combat,
        message: override ? override.replace('{round}', combat.round) : game.i18n.format('coffee-pub-crier.RoundCycling', { round: combat.round }),
        roundCardStyle,
        roundIconStyle,
        theme
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
/**
 * Combatants still waiting to roll. Foundry leaves `initiative` null until a
 * combatant has rolled, and a combatant without one has no settled place in
 * the order yet.
 * @param {Combat} combat
 * @returns {Array<Combatant>}
 */
function combatantsMissingInitiative(combat) {
    return Array.from(combat?.combatants?.values() ?? []).filter((combatant) => {
        const initiative = combatant?.initiative;
        return initiative === null || initiative === undefined || !Number.isFinite(Number(initiative));
    });
}

/**
 * Has the whole tracker rolled? An empty combat counts as unsettled — there
 * is no order to announce.
 * @param {Combat} combat
 * @returns {boolean}
 */
function allInitiativesRolled(combat) {
    if (!combat?.combatants?.size) return false;
    return combatantsMissingInitiative(combat).length === 0;
}

/**
 * The fight is underway and the order is final — the one condition under
 * which Crier announces anything.
 * @param {Combat} combat
 * @returns {boolean}
 */
function isOrderSettled(combat) {
    return !!combat?.started && allInitiativesRolled(combat);
}

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

    // Nothing is announced before the fight or before the order settles.
    // Both checks live here, at the one funnel every turn card passes
    // through, and both read live combat state rather than a remembered
    // flag: `roundInitialized` records that the order settled once, which is
    // not the same as it being settled now. A combatant added mid-round has
    // no initiative, and the card we would post announces a turn that is
    // about to be re-sorted out from under it.
    if (!combat.started) {
        debugLog('POST NEW TURN CARD: Skipping - combat has not started');
        return;
    }
    if (!allInitiativesRolled(combat)) {
        debugLog('POST NEW TURN CARD: Skipping - initiatives still outstanding', () => ({
            waitingOn: combatantsMissingInitiative(combat).map((c) => c.name)
        }));
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
	info.turnCardStyle = cardSettings.turnCardStyle ?? 'theme-default';
	info.theme = await mapTurnCardStyleToTheme(info.turnCardStyle);
	info.roundIconStyle = cardSettings.roundIconStyle ?? 'fa-chess-queen';
	info.roundCardStyle = cardSettings.roundCardStyle ?? 'theme-announcement-green';
	info.portraitStyle = cardSettings.portraitStyle ?? 'portrait';
	info.tokenBackground = cardSettings.tokenBackground ?? 'dirt';
	const tokenBgPres = getTokenBackgroundPresentation(info.tokenBackground);
	info.tokenBackgroundImageUrl = tokenBgPres.imageUrl;
	info.tokenBackgroundUseClass = tokenBgPres.useClass;
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
	const effectsAudience = cardSettings.activeEffectsAudience ?? 'both';
	const isPlayerActor = info.actor?.type === 'character';
	const audienceMatches = effectsAudience === 'both'
		|| (effectsAudience === 'players' && isPlayerActor)
		|| (effectsAudience === 'npcs' && !isPlayerActor);
	if (audienceMatches) {
		const showEffects = cardSettings.showActiveEffects !== false;
		const showPenalties = cardSettings.showTurnPenalties !== false;
		if (showEffects || showPenalties) {
			// Both blocks read the same set, so filter the actor's effects once.
			const displayEffects = collectDisplayEffects(info.actor);
			if (showEffects) info.activeEffectGroups = await buildActiveEffectGroups(info.actor, displayEffects);
			if (showPenalties) info.turnPenaltyReport = buildTurnPenaltyReport(info.actor, displayEffects);
		}
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

    const settled = isOrderSettled(combat);
    if (settled !== getRoundInitialized()) setRoundInitialized(settled);

    // Neither card goes out over an unsettled order. Hold them instead of
    // dropping them: rolling initiative updates Combatant documents rather
    // than the Combat, so this function is not called again for it and a
    // discarded card would simply never appear. `flushHeldAnnouncement` is
    // what brings them back, from the combatant hooks.
    if (!settled) {
        const held = heldAnnouncement?.combatId === combat.id ? heldAnnouncement : null;
        heldAnnouncement = {
            combatId: combat.id,
            round: combat.round,
            context,
            roundCard: roundChanged || !!held?.roundCard,
            turnCard: turnChanged || !!held?.turnCard
        };
        debugLog('PROCESS COMBAT CHANGE: Order not settled, holding cards', () => ({
            started: !!combat.started,
            holding: { roundCard: heldAnnouncement.roundCard, turnCard: heldAnnouncement.turnCard },
            waitingOn: combatantsMissingInitiative(combat).map(c => c.name)
        }));
        return;
    }

    heldAnnouncement = null;
    await announceCombatChange(combat, context, { roundCard: roundChanged, turnCard: turnChanged });
}

/**
 * Build and post the cards for a change whose order has settled.
 * @param {Combat} combat
 * @param {object} context
 * @param {{roundCard: boolean, turnCard: boolean}} what
 */
async function announceCombatChange(combat, context, { roundCard, turnCard }) {
    const msgs = [];

    if (roundCard) {
        debugLog('ANNOUNCE: Processing round change');
        if (await getSettingSafely(MODULE.ID, CRIER.roundCycling)) {
            const roundMsg = await postNewRound(combat, context);
            if (roundMsg) {
                msgs.push(roundMsg);
                debugLog('ANNOUNCE: Round message created', () => ({ roundMsg }));
            }
        } else {
            debugLog('ANNOUNCE: Round cycling disabled');
        }
    }

    if (turnCard) {
        const turnMsgs = await postNewTurnCard(combat, context);
        if (turnMsgs?.length) {
            msgs.push(...turnMsgs);
            debugLog('ANNOUNCE: Turn messages created', () => ({ count: turnMsgs.length }));
        }
    }

    if (msgs.length) {
        debugLog('ANNOUNCE: Creating chat messages', () => ({ count: msgs.length, messageTypes: msgs.map(m => m.type) }));
        for (const msg of msgs) {
            await ChatMessage.create(msg);
        }
    } else {
        debugLog('ANNOUNCE: No messages to create');
    }
}

/**
 * Post whatever was held back, once the order settles. Only the client that
 * held the announcement flushes it, which is the same client that made the
 * combat update — so the cards still post exactly once.
 * @param {Combat|null|undefined} combat
 */
async function flushHeldAnnouncement(combat) {
    const held = heldAnnouncement;
    if (!held || !combat || held.combatId !== combat.id) return;
    if (!isOrderSettled(combat)) return;

    heldAnnouncement = null;
    setRoundInitialized(true);
    debugLog('FLUSH HELD ANNOUNCEMENT: Order settled, posting held cards', () => ({
        roundCard: held.roundCard,
        turnCard: held.turnCard,
        round: combat.round
    }));
    await announceCombatChange(combat, held.context, held);
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
