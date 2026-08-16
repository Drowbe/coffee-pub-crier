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
import { registerSettings, normalizeThemeId } from './settings.js';

// -- Set Page variables --
// Set the last combatant
const lastCombatants = new Map();
function getLastCombatantState(combatOrId = game.combat) {
    const id = typeof combatOrId === 'string' ? combatOrId : combatOrId?.id;
    if (!id) return { combatant: null, tokenId: null, spoke: false };
    if (!lastCombatants.has(id)) {
        lastCombatants.set(id, {
            combatant: null,
            get tokenId() { return this.combatant?.token?.id; },
            spoke: false
        });
    }
    return lastCombatants.get(id);
}

// Track whether the current round has been properly initialized with all initiatives rolled
// This is now stored as a persistent setting, but we keep a local cache for performance
let roundInitialized = false;

/**
 * Cards withheld because the turn order had not settled, waiting for the last
 * initiative to come in. Held on the one client that made the combat update,
 * so flushing it posts each card exactly once. `roundCard` and `turnCard` are
 * each the context of the change that called for that card, or null.
 * @type {{combatId: string, roundCard: object|null, turnCard: object|null}|null}
 */
const heldAnnouncements = new Map();
const announceTimers = new Map();
const deliveryQueues = new Map();
const deliveredLifecycleEvents = new Set();
const startedCombats = new Set();
const lifecycleRetryCounts = new Map();

/**
 * How long to let a round change settle before deciding anything.
 *
 * Tables that reroll initiative every round clear it in reaction to the round
 * update, which arrives a beat later — so at the instant of the update the
 * combatants still carry the *outgoing* round's initiative. Judging then
 * announces a round nobody has rolled for. This is a grace period, not a
 * guess at the answer: the check still has to pass when it expires, and the
 * combatant hooks still cover anything slower than this.
 */
const ORDER_SETTLE_DELAY_MS = 250;

function enqueueCombatWork(combatId, work) {
    const previous = deliveryQueues.get(combatId) ?? Promise.resolve();
    const next = previous.catch(() => undefined).then(work);
    deliveryQueues.set(combatId, next);
    const cleanup = () => {
        if (deliveryQueues.get(combatId) === next) deliveryQueues.delete(combatId);
    };
    next.then(cleanup, cleanup);
    return next;
}

function isAnnouncementAuthority() {
    const gm = game.users?.filter(user => user.isGM && user.active)?.sort((a, b) => b.role - a.role || String(a.id).localeCompare(String(b.id)))?.[0];
    return !!gm && gm.id === game.user.id;
}

function queueLifecycleAnnouncement(combat, kind) {
    const key = `${combat.id}:${kind}`;
    return enqueueCombatWork(combat.id, () => postLifecycleAnnouncement(combat, kind)).catch((error) => {
        const attempts = (lifecycleRetryCounts.get(key) ?? 0) + 1;
        lifecycleRetryCounts.set(key, attempts);
        debugLog('LIFECYCLE ANNOUNCEMENT: Delivery failed', () => ({ kind, combat: combat.id, attempts, error: error?.message ?? error }));
        if (attempts < 3) setTimeout(() => queueLifecycleAnnouncement(combat, kind), 1000);
    });
}

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
    turnCards: CRIER.turnCards,
    turnIconStyle: CRIER.turnIconStyle,
    turnCardStyle: CRIER.turnCardStyle,
    roundIconStyle: CRIER.roundIconStyle,
    roundCardStyle: CRIER.roundCardStyle,
    portraitStyle: CRIER.portraitStyle,
    abilities: CRIER.abilities,
    activeEffects: CRIER.activeEffects,
    penalties: CRIER.penalties,
    health: CRIER.health,
    showBloodyPortrait: CRIER.showBloodyPortrait,
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

        // Initialize last combatant
        getLastCombatantState().combatant = game.combat?.combatant ?? null;
        if (game.combat?.started) startedCombats.add(game.combat.id);
        
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
                // A new round always establishes a current turn even when the
                // numeric turn index remains 0. Foundry diffs unchanged fields
                // out of `update`, so relying on `update.turn` alone drops the
                // top-of-round turn card whenever the pointer does not move.
                const turnChanged = hasTurnUpdate || hasRoundUpdate;
                const roundChanged = hasRoundUpdate;
                
                // Only process if there's an actual turn or round change
                if (turnChanged || roundChanged) {
                    // Reset lastCombatant tracking if a new round starts
                    if (roundChanged) {
                        debugLog('HOOK: New round detected, resetting lastCombatant and roundInitialized');
                        const lastCombatant = getLastCombatantState(combat);
                        lastCombatant.combatant = null;
                        lastCombatant.spoke = false;
                        setRoundInitialized(false);
                    }
                    
                    // Process round changes (round cards) and turn changes (turn cards) separately
                    return enqueueCombatWork(combat.id, () => processCombatChange(combat, update, context, userId, turnChanged, roundChanged));
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
                const combat = combatant?.parent;
                if (combat) return enqueueCombatWork(combat.id, () => flushHeldAnnouncement(combat));
            }
        });

        const deleteCombatantHookId = BlacksmithHookManager.registerHook({
            name: 'deleteCombatant',
            description: 'Coffee Pub Crier: Post held cards when the combatant being waited on leaves',
            context: MODULE.ID,
            priority: 2,
            callback: (combatant) => {
                const combat = combatant?.parent;
                if (combat) return enqueueCombatWork(combat.id, () => flushHeldAnnouncement(combat));
            }
        });

        BlacksmithHookManager.registerHook({
            name: 'combatStart',
            description: 'Coffee Pub Crier: Announce combat start',
            context: MODULE.ID,
            priority: 2,
            callback: (combat) => {
                if (!isAnnouncementAuthority()) return;
                return queueLifecycleAnnouncement(combat, 'start');
            }
        });

        const announceDeletedCombat = (combat) => {
            if (!isAnnouncementAuthority()) return;
            return queueLifecycleAnnouncement(combat, 'end');
        };
        BlacksmithHookManager.registerHook({ name: 'deleteCombat', description: 'Coffee Pub Crier: Announce combat end on deletion', context: MODULE.ID, priority: 2, callback: announceDeletedCombat });

        // Data, not decoration: this reads the flags off a Crier card to keep
        // track of who spoke last. The card's own appearance is Blacksmith's
        // from here, and anything per-reader is a render pass.
        const renderChatMessageHookId = BlacksmithHookManager.registerHook({
            name: 'renderChatMessageHTML',
            description: 'Coffee Pub Crier: Track the last combatant from posted cards',
            context: MODULE.ID,
            priority: 2,
            callback: (cm, html, options) => {
                debugLog('HOOK: renderChatMessageHTML hook called', () => ({ messageId: cm.id }));
                return chatMessageEvent(cm, html, options);
            }
        });

        // A posted card is a snapshot, and a clickable death save makes a stale
        // one obvious. Only the announcing GM writes; everyone else re-renders
        // off the change.
        BlacksmithHookManager.registerHook({
            name: 'updateActor',
            description: 'Coffee Pub Crier: Refresh a turn card when health or death saves change',
            context: MODULE.ID,
            priority: 3,
            callback: (actor, changed) => refreshTurnCardHealth(actor, changed)
        });

        // On every client, GM and player alike.
        registerCardBehaviour();
        
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
// ** ACTIVE EFFECTS
// ************************************
// What is riding on this combatant right now, display-only. Every question
// worth asking about an effect — is it worth showing, what kind is it, what
// is it conveying, how long is left — is Blacksmith's to answer, and this
// module asks rather than works it out. Crier used to classify Bibliosoph's
// flags, format its own durations and re-derive the "via" back-link itself;
// all three drifted the moment their owners changed, and none of them were
// ever Crier's to know.

/** Blacksmith's effects API, or null on a build that predates it. */
function getEffectsAPI() {
	return game.modules.get('coffee-pub-blacksmith')?.api?.effects ?? null;
}

/**
 * Blacksmith's display records for this actor: `img`, `name` and a
 * pre-composed `detail` reading "Type · Context · Remaining".
 *
 * DESCRIPTIONS ARE DELIBERATELY OFF.
 *
 * The API's default is permission-aware — GMs and actor owners get the
 * enriched description, nobody else does — and that is the right default for
 * anything rendered on the viewer's own client. A turn card is not that. It
 * is composed once by the announcing GM (see `isAnnouncementAuthority`) and
 * the resulting HTML is stored on the ChatMessage and delivered verbatim to
 * the table, so the permission check would run as the GM and bake GM-authored
 * text into a public card for everyone. 'never' is what "public card" means
 * here; 'auto' would leak exactly as surely as 'always'.
 * @param {Actor|null|undefined} actor
 * @returns {Promise<Array<object>>}
 */
async function collectEffectRecords(actor) {
	if (!actor) return [];
	try {
		return await getEffectsAPI()?.getDisplayEffects(actor, { includeDescriptions: 'never' }) ?? [];
	} catch (error) {
		debugLog('ACTIVE EFFECTS: Could not build display records', () => ({ error: error?.message ?? error }));
		return [];
	}
}

/**
 * Build display-only active-effect rows for a turn card.
 * @param {Actor|null|undefined} actor
 * @param {Array<object>} [records] Pre-fetched display records, to avoid asking twice.
 * @returns {Promise<Array<{label: string, rows: Array<object>}>>}
 */
async function buildActiveEffectGroups(actor, records) {
	const rows = (records ?? await collectEffectRecords(actor)).map((record) => ({
		name: record.name,
		img: record.img,
		// Already reads "Injury · Moderate · Blinded · 2 HP/turn · 29 minutes".
		// Some rows carry no duration on purpose — a lingering wound is
		// permanent until treated — so an empty tail is not a missing value.
		detail: record.detail,
		tooltip: record.tooltipHtml
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
 * Seconds a remainder is worth, for ordering only.
 *
 * `remaining` is `{value, unit}` because a combat-based effect counts in
 * rounds and everything else counts in seconds. Sorting the raw numbers
 * together ranks "20 rounds" ahead of "100 seconds" — the mistake the API
 * added the unit to stop. Ordering is all this is for; the string to show is
 * always `durationLabel`, never anything derived here.
 * @param {{value: number, unit: string}|null|undefined} remaining
 * @returns {number}
 */
function remainingSeconds(remaining) {
	const value = Number(remaining?.value);
	if (!Number.isFinite(value)) return Infinity;
	return remaining.unit === 'rounds' ? value * (CONFIG.time?.roundTime || 6) : value;
}

/**
 * Build the "while this lasts" block: summed roll penalties, and how long the
 * things causing them have left.
 *
 * Bleed used to get its own summed line here, worked out from Bibliosoph's
 * tick flag with a local copy of its damage floor. That number now arrives
 * already costed on each effect row ("2 HP/turn"), phrased by the module that
 * owns the arithmetic, so the copy is gone rather than kept in step by hand.
 *
 * Works from the same records the rows above render, pairing each with the
 * document behind it for the `changes` only a document carries. Re-running
 * the API's filter to get those documents would be a second chance to
 * disagree with the list the table is looking at.
 * @param {Actor|null|undefined} actor
 * @param {Array<object>} records Blacksmith display records.
 * @returns {{rows: Array<{icon: string, text: string}>}|null}
 */
function buildTurnPenaltyReport(actor, records = []) {
	if (!actor || !records.length) return null;
	const paired = records
		.map((record) => ({ record, effect: actor.effects?.get?.(record.id) }))
		.filter((entry) => entry.effect);
	if (!paired.length) return null;

	const rows = [];

	// 1. ROLL PENALTIES, summed per stat and then one row each.
	//
	// A stat gets one line however many effects bit it, because the total is
	// the number they are about to roll with. Two DIFFERENT stats do not
	// share a line: joining them with a middot borrows the separator the
	// effect rows use for facets of a single thing ("Effect · via Chromatic
	// Conundrum"), so "−3 to ability checks · −1 to saving throws" reads as
	// one statement about one thing rather than two independent penalties.
	//
	// These are plain dnd5e change keys — anything on the actor bites the
	// same way, whoever put it there — so reading them is not knowledge of
	// any other module.
	const contributors = new Set();
	for (const { path, label } of TURN_PENALTY_STATS) {
		let total = 0;
		for (const { record, effect } of paired) {
			for (const change of effect.changes ?? []) {
				if (change?.key !== path) continue;
				const value = numericChangeValue(change.value);
				if (!value) continue;
				total += value;
				contributors.add(record);
			}
		}
		if (total) rows.push({ icon: 'fa-solid fa-dice-d20', text: `${signedTotal(total)} to ${label}` });
	}

	// 2. TIME REMAINING, only for what is actually costing them something
	// above — the countdown is a promise about when the numbers lift, and
	// every other duration is already on the effect rows. Soonest relief
	// first. Nothing above means nothing to count down to: penalties that
	// cancel out would otherwise leave a bare timer explaining a line that is
	// not there.
	if (!rows.length) return null;
	const timers = paired
		.map(({ record }) => record)
		.filter((record) => contributors.has(record))
		.map((record) => ({
			name: record.name,
			time: record.durationLabel,
			seconds: remainingSeconds(record.remaining)
		}))
		// A permanent effect, and a lingering wound that has stopped counting
		// down, have nothing to promise here.
		.filter((entry) => entry.time)
		.sort((a, b) => a.seconds - b.seconds);
	for (const { name, time } of timers) {
		rows.push({
			icon: 'fa-solid fa-hourglass-half',
			text: game.i18n.format(`${MODULE.ID}.TurnPenalties.TimeRemaining`, { name, time })
		});
	}

	return { rows };
}

// ************************************
// ** LAST COMBAT FROM
// ************************************

function updateLastCombatantFromMsg(cm, flags) {
	const lastCombatant = getLastCombatantState(flags.combat);
	lastCombatant.spoke = false;
	lastCombatant.combatant = game.combats.get(flags.combat)?.getCombatantByToken(flags.token) ?? null;
}


// ************************************
// ** CHAT MESSAGE
// ************************************
/**
 * @param {ChatMessage} cm
 * @param {HTMLElement|JQuery|Array} html
 * @param {Object} _options
 */
function chatMessageEvent(cm, _html, _options) {
	const cmd = getDocData(cm);
	const flags = cmd.flags?.[MODULE.ID];

	if (!flags) {
		const lastCombatant = getLastCombatantState();
		if (game.user.isGM && cmd.speaker?.token === lastCombatant.tokenId)
			lastCombatant.spoke = true;
		return;
	}

	if (!flags.missedTurn && (flags.turnAnnounce || flags.token))
		updateLastCombatantFromMsg(cm, flags);
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
	if (await getSettingSafely(MODULE.ID, CRIER.missedTurns, 'notify') === 'notify') {
        ui.notifications.info("Did " + strMissedTurnPlayer + " miss their turn?", {permanent: false, console: false});
    }
    // A descriptor rather than a posted card: the turn delivery loop re-checks
    // combat state before posting anything, this card included.
    return {
        moduleId: MODULE.ID,
        type: 'missed-turn',
        theme: 'orange',
        rollMode: 'selfroll',
        whisper: game.users.filter(u => u.isGM).map(u => u.id),
        speaker: { scene, actor, token, alias },
        parts: [
            { part: 'header', icon: 'fa-solid fa-fire', title: game.i18n.localize('coffee-pub-crier.MissedTurnTitle') },
            { part: 'prose', blocks: [{
                type: 'paragraph',
                text: game.i18n.format('coffee-pub-crier.MissedTurnBody', { name: strMissedTurnPlayer })
            }] }
        ],
        flags: { missedTurn: true, token, actor, combatant: last.combatant.id }
    };
}

// ==================================================================
// ===== PER-READER CARD BEHAVIOUR ==================================
// ==================================================================
//
// A composition is written once, by the announcing GM, and read by the whole
// table. Anything that depends on WHO IS LOOKING has to be decided in the
// reader's own browser, and that means a registered render pass rather than a
// renderChatMessageHTML hook: a parts card re-renders from its stored
// composition a tick after Foundry paints it, and the swap throws away whatever
// a hook decorated.

/**
 * Wire up everything a client needs to interact with a Crier card.
 *
 * Called on EVERY client at startup, GM and player alike. A chat message is
 * data on every client, so nothing can travel with the card — each client
 * resolves the handler and the passes from its own registry when the card
 * renders, which is also why buttons still work after a browser reload.
 */
function registerCardBehaviour() {
    const chatCards = getChatCardsAPI();
    if (!chatCards) {
        debugLog('CARD BEHAVIOUR: Chat cards API unavailable, skipping registration');
        return;
    }

    // ---- The death-save button -------------------------------------
    //
    // The permission check lives HERE, not in the composition. Hiding or
    // disabling a control is presentation; any client can fire an action
    // whatever its copy of the card looks like.
    chatCards.registerAction(MODULE.ID, DEATH_SAVE_ACTION, async ({ value }) => {
        const actor = fromUuidSync(value)?.actor;
        if (!actor) return;
        if (!actor.isOwner) {
            ui.notifications.warn(game.i18n.localize('coffee-pub-crier.DeathSaveNotYours'));
            return;
        }
        await actor.rollDeathSave();
    });

    // ---- Who may roll it -------------------------------------------
    //
    // The pulse marks the button as live, so removing it is the whole signal:
    // the reader who can roll sees a beating skull, everyone else a still one.
    // Deliberately no dimming, because that would mean Crier shipping card CSS
    // again — the thing this migration exists to stop.
    chatCards.registerRenderPass(MODULE.ID, 'death-save-affordance', ({ root }) => {
        const selector = 'button[data-blacksmith-action="' + DEATH_SAVE_ACTION + '"]';
        for (const button of root.querySelectorAll(selector)) {
            const mayRoll = Boolean(fromUuidSync(button.dataset.blacksmithValue)?.actor?.isOwner);
            button.disabled = !mayRoll;
            button.querySelector('i')?.classList.toggle('blacksmith-anim-pulse', mayRoll);
            button.dataset.tooltip = game.i18n.localize(mayRoll
                ? 'coffee-pub-crier.RollDeathSave'
                : 'coffee-pub-crier.DeathSaveNotYours');
        }
    });

    // ---- The GM sees who it really is ------------------------------
    //
    // An obfuscated card names the combatant "???" for everybody, because that
    // placeholder is what the stored composition has to say. The GM's copy gets
    // the real name put back here, in their own browser.
    chatCards.registerRenderPass(MODULE.ID, 'deobfuscate-name', ({ message, root }) => {
        if (!game.user.isGM) return;
        if (!message.getFlag(MODULE.ID, 'obfuscated')) return;

        const combat = game.combats.get(message.getFlag(MODULE.ID, 'combat'));
        const combatant = combat?.combatants.get(message.getFlag(MODULE.ID, 'combatant'));
        const realName = combatant?.token?.name;
        if (!realName) return;

        // Match the placeholder rather than the first bold run: a GM whose turn
        // label has its own emphasis in it should keep that emphasis intact.
        // Comparing against the placeholder is also what makes this idempotent,
        // since a pass may run more than once on the same card.
        const placeholder = game.i18n.localize('coffee-pub-crier.UnidentifiedTurn');
        for (const el of root.querySelectorAll('.card-header strong')) {
            if (el.textContent === placeholder) el.textContent = realName;
        }
    });
}

/**
 * Keep a posted turn card honest about health.
 *
 * A card is a stored snapshot, so the hit point bar, the death-save pips and
 * the blood over the portrait all describe the moment the card was posted. That
 * was tolerable while nothing on the card could be clicked; a death-save button
 * whose own pips never move is not.
 *
 * Rewriting the stored composition makes every client re-render, so one write
 * updates the card on every screen. Only the announcing GM writes it — the
 * player who owns the actor is not the message's author and could not update it
 * anyway.
 *
 * @param {Actor} actor
 * @param {object} changed The update delta, used only to decide whether to look.
 */
async function refreshTurnCardHealth(actor, changed) {
    if (!isAnnouncementAuthority()) return;
    const touched = changed?.system?.attributes;
    if (!touched?.hp && !touched?.death) return;

    const message = findLatestTurnCard(actor);
    if (!message) return;

    const chatCards = getChatCardsAPI();
    if (!chatCards) return;

    // `getCard` deep-clones, and returns null for anything that is not a parts
    // card, so the guard below covers both.
    const parts = chatCards.getCard(message)?.parts;
    if (!Array.isArray(parts)) return;

    const info = turnCardHealthContext(message, actor, parts);
    if (!info) return;

    let changedCard = false;

    // Compared as JSON rather than with `foundry.utils.objectsEqual`, which
    // falls back to identity for an array — so a part holding `groups` or
    // `overlays` always looked changed and every hit point tick wrote to the
    // message. Both sides are built by the same code, so key order matches; the
    // worst a mismatch costs is one redundant update.
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

    // The health part is REPLACED rather than edited, because the three
    // readings are three different parts: a bar becomes pips when a character
    // goes down, and pips become a band when they die.
    const subjectAt = parts.findIndex((part) => part.part === 'subject');
    const healthAt = parts.findIndex((part) => ['meter', 'pips', 'band'].includes(part.part));

    if (subjectAt !== -1) {
        // A Minimal card carries its bar INSIDE the subject, so there is no
        // top-level meter to swap. Rebuild the whole block: it is one part or
        // two depending on the reading, since pips cannot nest in a subject and
        // sit beneath it instead.
        const runLength = healthAt === subjectAt + 1 ? 2 : 1;
        const rebuilt = turnSubjectParts(info);
        if (!same(parts.slice(subjectAt, subjectAt + runLength), rebuilt)) {
            parts.splice(subjectAt, runLength, ...rebuilt);
            changedCard = true;
        }
    } else if (healthAt !== -1) {
        const [health] = turnHealthParts(info);
        if (health && !same(parts[healthAt], health)) {
            parts[healthAt] = health;
            changedCard = true;
        }
    }

    const imageAt = parts.findIndex((part) => part.part === 'image');
    const portrait = turnPortraitPart(info);
    if (imageAt !== -1 && portrait && !same(parts[imageAt].overlays ?? [], portrait.overlays)) {
        parts[imageAt].overlays = portrait.overlays;
        changedCard = true;
    }

    if (!changedCard) return;

    // Through the API, not by writing Blacksmith's flag directly.
    //
    // A card lives in TWO places: the composition every Blacksmith client
    // re-renders from, and the baked HTML in `content`, which is what chat
    // search, an export, and any client without Blacksmith actually show.
    // Rewriting only the flag left `content` frozen at the values the card was
    // posted with — invisible at a live table because the re-render paints over
    // it, but there in every export and for a frame on every paint. `update`
    // rewrites both together.
    //
    // It keeps the card's pinned theme, its moduleId, type and schema version,
    // and merges rather than replaces flags. It also checks `canUserModify` and
    // returns null rather than throwing, which composes with the authority gate
    // above rather than duplicating it.
    const updated = await chatCards.update(message, { parts });
    debugLog('REFRESH TURN CARD: Updated', () => ({
        message: message.id,
        actor: actor.id,
        applied: Boolean(updated)
    }));
}

/**
 * The most recent turn card for this actor, or null.
 *
 * Newest first and stopping at the first turn card found: if that one names a
 * different combatant then this actor's card is older than the current turn,
 * and quietly rewriting the log behind the table is worse than a stale number.
 * @param {Actor} actor
 * @returns {ChatMessage|null}
 */
function findLatestTurnCard(actor) {
    const messages = game.messages?.contents ?? [];
    for (let i = messages.length - 1; i >= 0; i--) {
        const message = messages[i];
        const flags = message.flags?.[MODULE.ID];
        if (!flags?.turnAnnounce) continue;
        const combatant = game.combats.get(flags.combat)?.combatants.get(flags.combatant);
        return combatant?.actor?.id === actor.id ? message : null;
    }
    return null;
}

/**
 * Enough of a turn context to rebuild the health parts, recovered from a posted
 * card's flags and the live actor.
 *
 * Only the fields the health and subject builders actually read. The rest of a
 * turn context describes settings and layout, and neither of those changes
 * because somebody took damage.
 *
 * The two show/hide settings that matter here are read back off the card rather
 * than out of the settings, because the card is what the world looked like when
 * it was posted -- and a GM who turns the health bar on mid-combat should not
 * have it appear on a card that never had one.
 *
 * @param {ChatMessage} message
 * @param {Actor} actor
 * @param {Array<object>} parts The stored composition.
 * @returns {object|null}
 */
function turnCardHealthContext(message, actor, parts) {
    const health = describeHealth(actor);
    if (!health) return null;
    const flags = message.flags?.[MODULE.ID] ?? {};
    const combatant = game.combats.get(flags.combat)?.combatants.get(flags.combatant);

    const subject = parts.find((part) => part.part === 'subject');
    const portrait = subject?.img ?? parts.find((part) => part.part === 'image')?.src;
    const showsHealth = Boolean(subject?.meter)
        || parts.some((part) => ['meter', 'pips', 'band'].includes(part.part));

    return {
        name: message.getFlag(MODULE.ID, 'obfuscated')
            ? game.i18n.localize('coffee-pub-crier.UnidentifiedTurn')
            : (combatant?.token?.name ?? actor.name),
        actor,
        showHealth: showsHealth,
        // The blood is whatever the card already carries: an enabled overlay is
        // always present, at blood-0 for an untouched portrait, so its absence
        // means the GM had it switched off when this card was posted.
        showBlood: Boolean(parts.find((part) => part.part === 'image')?.overlays?.length),
        hidePortrait: !portrait,
        portrait,
        tokenDoc: combatant?.token,
        attributeHP: health.value,
        attributeHPMAX: health.max,
        attributeDEATHSUCCESS: health.successes,
        attributeDEATHFAILURE: health.failures,
        isDead: health.isDead,
        isDeathSaving: health.isDeathSaving,
        bloodyPortraitNumber: health.bloody
    };
}

// ************************************
// ** HEALTH
// ************************************

/**
 * How a combatant stands: the numbers, whether they are down, and which blood
 * layer belongs over their portrait.
 *
 * One function because two callers must agree — the card is composed from this
 * once, and refreshed from it again every time the actor's health or death
 * saves change. A second copy of the thresholds is a second chance to disagree
 * with what the table is looking at.
 *
 * Reads the COMBATANT'S OWN actor. This used to look a world actor up by the
 * token's name, which found the wrong document for any unlinked token — and the
 * death-save button rolls against the combatant's actor, so a card built the old
 * way could show one creature's saves and roll another's.
 *
 * @param {Actor|null|undefined} actor
 * @returns {{value: number, max: number, percent: number, successes: number,
 *            failures: number, isDead: boolean, isDeathSaving: boolean,
 *            bloody: number}|null} null when the actor tracks no hit points
 */
function describeHealth(actor) {
	const hp = actor?.system?.attributes?.hp;
	const max = Number(hp?.max);
	if (!Number.isFinite(max) || max <= 0) return null;

	const value = Number(hp.value) || 0;
	const percent = Math.round((100 * value) / max);
	const death = actor.system.attributes.death ?? {};
	const successes = Number(death.success) || 0;
	const failures = Number(death.failure) || 0;

	// A monster at zero hit points is dead, not dying. dnd5e's NPC schema does
	// carry a `death` field, and `rollDeathSave` would happily roll against it,
	// but no table plays that way -- and health became something an NPC card can
	// show, so without this every downed goblin gets a pulsing, clickable skull.
	const down = percent <= 0;
	const rollsDeathSaves = actor.type === 'character';
	const isDead = down && (!rollsDeathSaves || failures >= 3);
	const isDeathSaving = down && !isDead;

	// The blood art comes in 5% steps, so the damage taken rounds up to one.
	// 1-4% keeps the heaviest LIVING splatter rather than rounding to a clean
	// portrait, and the dead get their own layer past the end of the scale.
	let bloody = Math.min(100, Math.max(0, Math.ceil((100 - percent) / 5) * 5));
	if (percent >= 1 && percent <= 4) bloody = 95;
	if (isDead) bloody = 101;

	return { value, max, percent, successes, failures, isDead, isDeathSaving, bloody };
}

// ************************************
// ** WHAT THE COMBATANT IS
// ************************************

/**
 * Does an audience setting cover this combatant?
 *
 * Health, abilities, effects and penalties each answer "show this, and for
 * whom" with one value, so they each ask this. `none` is simply the audience
 * nobody is in, and anything unrecognised fails closed.
 *
 * @param {string} audience `none`, `players`, `npcs` or `both`
 * @param {boolean} isPlayerActor
 * @returns {boolean}
 */
function audienceIncludes(audience, isPlayerActor) {
	if (audience === 'both') return true;
	if (audience === 'players') return isPlayerActor;
	if (audience === 'npcs') return !isPlayerActor;
	return false;
}

/**
 * What to call this combatant's kind: their classes and levels, or for anything
 * without a class, its creature type.
 *
 * @param {Actor|null|undefined} actor
 * @returns {string|null}
 */
function describeClass(actor) {
	const classes = actor?.itemTypes?.class ?? [];
	if (classes.length) {
		return classes
			.map((cls) => [cls.name, cls.system?.levels].filter(Boolean).join(' '))
			.join(' / ');
	}
	return actor?.system?.details?.type?.label || null;
}

/**
 * Walking speed, in whatever units the world is set to. The abbreviation is
 * dnd5e's own and localized, so a metric table reads "9 m" rather than "9 ft".
 *
 * @param {Actor|null|undefined} actor
 * @returns {string|null}
 */
function describeSpeed(actor) {
	const movement = actor?.system?.attributes?.movement;
	const walk = Number(movement?.walk);
	if (!Number.isFinite(walk)) return null;
	const key = movement.units || 'ft';
	const abbreviation = CONFIG.DND5E?.movementUnits?.[key]?.abbreviation;
	return `${walk} ${abbreviation ? game.i18n.localize(abbreviation) : key}`;
}

// ************************************
// ** TURN CARD COMPOSITION
// ************************************
// The turn card described as data. Nothing here emits markup: Blacksmith owns
// how a meter, a tile or a row looks, and improving one of those parts improves
// every card already sitting in the log.
//
// Read the layouts as two answers to the same question rather than a big card
// and a cut-down one. Detailed spends the space: a full portrait, the numbers
// beside it, what is riding on the combatant. Minimal is a `subject` -- a small
// picture beside a name -- which is the whole card.

/** Where the blood overlays live, keyed by the rounded damage percentage. */
const BLOOD_OVERLAY = (n) => `modules/${MODULE.ID}/images/blood-${n}.webp`;

/**
 * The action id for the death-save control, and the name of its render pass.
 * Named once because three places have to agree: the composition, the handler
 * registered at startup, and the pass that dims it for readers who cannot roll.
 */
const DEATH_SAVE_ACTION = 'roll-death-save';

/**
 * The portrait, with a blood layer over it when the combatant is hurt.
 *
 * The overlay is an ordinary image drawn on top -- the same mechanism the
 * `image` part offers anyone. NPCs never bleed on the card, which is a
 * deliberate long-standing choice rather than an oversight: their hit points
 * are not the table's business.
 */
function turnPortraitPart(info) {
	if (info.hidePortrait) return null;
	const overlays = (info.showBlood && info.bloodyPortraitNumber !== undefined)
		? [BLOOD_OVERLAY(info.bloodyPortraitNumber)]
		: [];
	return { part: 'image', src: info.portrait, alt: info.name, overlays };
}

/**
 * How the combatant is standing: dead, rolling death saves, or a hit point bar.
 *
 * Exactly one of the three, because they are three readings of one number.
 * Blacksmith derives the meter's tone from the percentage at the same 25/50/75
 * steps this module used for its four hand-coloured bars, so the tone is no
 * longer passed -- one fewer thing to keep in step.
 *
 * @returns {Array<object>} nothing, or the one part that applies
 */
function turnHealthParts(info) {
	if (!info.showHealth) return [];

	if (info.isDead) {
		return [{
			part: 'band',
			text: game.i18n.format('coffee-pub-crier.IsDead', { name: info.name }),
			icon: 'fa-solid fa-skull',
			tone: 'negative'
		}];
	}

	if (info.isDeathSaving) {
		return [{
			part: 'pips',
			// The centre is the click target. Whether this reader may use it is
			// settled in their own browser -- by the handler, which checks
			// ownership, and by a render pass, which dims it if they cannot.
			// Composing that decision here would bake one reader's answer into
			// every copy of the card.
			center: {
				icon: 'fa-solid fa-skull',
				animation: 'pulse',
				moduleId: MODULE.ID,
				action: DEATH_SAVE_ACTION,
				value: info.tokenDoc?.uuid,
				tooltip: game.i18n.localize('coffee-pub-crier.RollDeathSave')
			},
			groups: [
				{ total: 3, filled: info.attributeDEATHSUCCESS ?? 0, tone: 'positive' },
				{ total: 3, filled: info.attributeDEATHFAILURE ?? 0, tone: 'negative' }
			]
		}];
	}

	if (info.attributeHPMAX > 0) {
		return [{ part: 'meter', value: info.attributeHP, max: info.attributeHPMAX }];
	}

	return [];
}

/** The six ability scores as a row of caption-over-value boxes. */
function turnAbilityPart(info) {
	if (!info.showAbilities || info.abilitySTR === undefined) return null;
	return {
		part: 'tiles',
		columns: 6,
		items: [
			{ label: 'STR', value: info.abilitySTR },
			{ label: 'DEX', value: info.abilityDEX },
			{ label: 'CON', value: info.abilityCON },
			{ label: 'INT', value: info.abilityINT },
			{ label: 'WIS', value: info.abilityWIS },
			{ label: 'CHA', value: info.abilityCHA }
		]
	};
}

/**
 * What is riding on the combatant, and what it is costing them.
 *
 * Both blocks are a labelled divider over a list. Effects read better without
 * the row boxes -- `plain` -- because a conditions list is icon and text rather
 * than a stack of containers.
 */
function turnEffectParts(info) {
	const parts = [];

	for (const group of info.activeEffectGroups ?? []) {
		if (!group.rows?.length) continue;
		parts.push({ part: 'section', icon: 'fa-solid fa-hand-sparkles', label: group.label });
		parts.push({
			part: 'rows',
			plain: true,
			items: group.rows.map((row) => ({
				img: row.img,
				label: row.name,
				sublabel: row.detail,
				tooltip: row.tooltip
			}))
		});
	}

	// No section heading over the penalties. `notes` is the footer-annotation
	// part and rules itself off from what came before, so a divider above it
	// draws the line twice. The lines say what they are on their own.
	const penalties = info.turnPenaltyReport;
	if (penalties?.rows?.length) {
		parts.push({ part: 'notes', items: penalties.rows.map((row) => ({ icon: row.icon, text: row.text })) });
	}

	return parts;
}

/**
 * The whole turn card, in render order.
 *
 * NOTHING IN HERE MAY ASK WHO IS LOOKING. One composition is written by the
 * announcing GM and read by the entire table, so a `game.user.isGM` in this
 * function bakes that GM's answer into everybody's copy. Per-reader decisions
 * belong in a render pass, which runs in each reader's own browser.
 *
 * @param {object} info The assembled turn context.
 * @returns {Array<object>} the composition
 */
function buildTurnCardParts(info) {
	const header = { part: 'header', title: info.label };
	const icon = info.blnHideTurnIcon ? null : cardIcon(info.turnIconStyle);
	if (icon) header.icon = icon;

	// The layouts differ in the SHAPE of the identity block, not in what the
	// card is allowed to say. Every show/hide setting applies to both.
	if (info.blnLayoutSmall) return [
		header,
		...turnSubjectParts(info),
		turnAbilityPart(info),
		...turnEffectParts(info)
	].filter(Boolean);

	return [
		header,
		turnPortraitPart(info),
		...turnHealthParts(info),
		turnAbilityPart(info),
		...turnEffectParts(info)
	].filter(Boolean);
}

/**
 * The Minimal card's identity block: a small portrait beside what the combatant
 * is, how fast they move, and how they are holding up.
 *
 * A `subject` carries its own bar, which is what makes this one part rather
 * than three -- but only a meter or a gauge, never pips. A character rolling
 * death saves therefore keeps the subject compact and puts the pips below it,
 * which is also the right emphasis: at that point the saves are the card.
 *
 * @returns {Array<object>} the subject, and the health part if it could not go inside it
 */
function turnSubjectParts(info) {
	const subject = { part: 'subject', title: describeClass(info.actor) ?? info.name };

	const speed = describeSpeed(info.actor);
	if (speed) subject.value = speed;
	if (!info.hidePortrait && info.portrait) subject.img = info.portrait;

	const [health] = turnHealthParts(info);
	if (health?.part === 'meter') {
		subject.meter = { value: health.value, max: health.max };
		return [subject];
	}
	return health ? [subject, health] : [subject];
}

// ************************************
// ** GENERATE CARDS
// ************************************

async function generateCards(info, context) {
	debugLog('GENERATE CARDS: Starting', () => ({ name: info.name }));
	
	// Noitify of MISSED TURN if the setting is enabled.
	const msgs = [];
	if (await getSettingSafely(MODULE.ID, CRIER.missedTurns, 'notify') !== 'none') {
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
	if (!info.isPlayerActor && info.tokenDoc?.hidden) {
		debugLog('GENERATE CARDS: Skipping - NPC token hidden on canvas');
		return msgs; // don't show card for NPCs hidden on canvas
	}
	if (info.last?.combatant != null && info.last.combatant.id === info.combatant.id) {
		return msgs; // don't report the same thing multiple times
	}

	const speaker = info.obfuscated ? { user: game.user.id } : ChatMessage.getSpeaker({ token: info.token?.document, actor: info.actor });
	const minPerm = getPermissionLevels().OBSERVER;
	const defaultVisible = info.hidden ? false : (getDefaultPermission(info.actor ?? info.tokenDoc ?? info.combatant) ?? 0) >= minPerm;

	// Resolve the audience here rather than handing `rollMode` to Blacksmith.
	// `applyRollMode` is what actually decides the whisper list -- it clears it
	// for a public card and replaces it with the GMs for a private one -- and it
	// has always had the last word over the observer list computed above. Running
	// it against a scratch object keeps that exact behaviour while letting
	// `post()` receive a settled recipient list.
	const delivery = { whisper: defaultVisible ? [] : getUsers(info.actor, minPerm) };
	ChatMessage.applyRollMode(delivery, info.hidden ? 'gmroll' : 'publicroll');

	const cardData = {
		moduleId: MODULE.ID,
		type: 'turn',
		theme: normalizeThemeId(info.turnCardStyle),
		speaker,
		relativeTo: info.actor ?? undefined,
		parts: buildTurnCardParts(info),
		...(delivery.whisper ? { whisper: delivery.whisper } : {}),
		flags: {
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
		},
	};

	msgs.push(cardData);
	debugLog('GENERATE CARDS: Created card', () => ({ count: msgs.length }));
	return msgs;
}

// ************************************
// ** POSTING CARDS
// ************************************

/** Blacksmith's chat cards API. */
function getChatCardsAPI() {
    return game.modules.get('coffee-pub-blacksmith')?.api?.chatCards ?? null;
}

/**
 * Post one card.
 *
 * Called from the delivery loops that re-check combat state immediately
 * beforehand, so this stays a post and nothing more — no settling checks, no
 * state commits.
 *
 * THROWS ON FAILURE, which `post()` does not: it logs and returns null. Every
 * caller here commits something once delivery returns — a delivered marker, a
 * round number, a sound — and the announcement contract is that none of that
 * happens unless the card actually posted. A silent null would consume the
 * event and lose the card with it.
 *
 * @param {object} card A `chatCards.post()` descriptor, or ChatMessage data.
 * @returns {Promise<ChatMessage>}
 */
async function deliverCard(card) {
    const chatCards = getChatCardsAPI();
    if (!chatCards) throw new Error('Coffee Pub Crier: Blacksmith chat cards API is unavailable');
    const message = await chatCards.post(card);
    if (!message) throw new Error(`Coffee Pub Crier: Blacksmith could not post the ${card.type ?? 'card'} card`);
    return message;
}

/**
 * An icon setting as a Font Awesome class, or null when the GM chose to have
 * none. The settings store the glyph alone ("fa-shield"); the style is Crier's
 * to supply, and always has been.
 * @param {string} icon
 * @returns {string|null}
 */
function cardIcon(icon) {
    const glyph = String(icon ?? '').trim();
    if (!glyph || glyph === 'none') return null;
    return `fa-solid ${glyph}`;
}

// ************************************
// ** RESOLVE A THEME TO ITS CSS CLASS
// ************************************

/**
 * The CSS class for a stored theme setting.
 *
 * Settings hold Blacksmith theme IDs. This exists only for the templates that
 * still build their own card markup and therefore still need a class name;
 * `chatCards.post()` takes the id directly and every card that has moved to it
 * calls `normalizeThemeId` alone. It goes when the turn template does.
 *
 * @param {string} themeSetting
 * @returns {Promise<string>} a `theme-*` class name
 */
async function resolveThemeClass(themeSetting) {
    const themeId = normalizeThemeId(themeSetting);
    try {
        const blacksmith = await BlacksmithAPI.get();
        return blacksmith?.chatCards?.getThemeClassName(themeId) || 'theme-default';
    } catch (error) {
        console.warn('Coffee Pub Crier: Error accessing Chat Cards API, using fallback:', error);
        return 'theme-default';
    }
}

// ************************************
// ** CREATE NEW ROUND CARD
// ************************************
async function createNewRoundCard(combat) {
    const speaker = ChatMessage.getSpeaker('GM');
    const override = await getSettingSafely(MODULE.ID, CRIER.roundLabel);
    const roundCardStyle = await getSettingSafely(MODULE.ID, CRIER.roundCardStyle, 'green-dark');
    const roundIconStyle = await getSettingSafely(MODULE.ID, CRIER.roundIconStyle, 'fa-chess-queen');
    const message = override
        ? override.replace('{round}', combat.round)
        : game.i18n.format('coffee-pub-crier.roundCycling', { round: combat.round });

    // A descriptor rather than a posted card: the caller re-checks combat state
    // at the post boundary and may decide to hold this back instead.
    return {
        moduleId: MODULE.ID,
        type: 'round',
        theme: normalizeThemeId(roundCardStyle),
        speaker,
        rollMode: 'publicroll',
        parts: [{ part: 'header', icon: cardIcon(roundIconStyle), title: message }],
        flags: { roundCycling: true, round: combat.round, combat: combat.id, roundCardStyle, roundIconStyle }
    };
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
    return createNewRoundCard(combat);
}

async function playConfiguredSound(settingKey) {
    try {
        const sound = await getSettingSafely(MODULE.ID, settingKey);
        if (!sound || sound === 'none') return;
        await BlacksmithUtils.playSound(sound, BlacksmithAPIConstants?.SOUNDVOLUMENORMAL || BlacksmithConstants?.SOUNDVOLUMENORMAL || BlacksmithAPIConstants?.SOUNDVOLUMESOFT || BlacksmithConstants?.SOUNDVOLUMESOFT || 0.5);
    } catch (error) {
        debugLog('ANNOUNCEMENT SOUND: Playback failed', () => ({ settingKey, error: error?.message ?? error }));
    }
}

async function postLifecycleAnnouncement(combat, kind) {
    const isStart = kind === 'start';
    if (isStart && deliveredLifecycleEvents.has(`${combat.id}:end`)) {
        deliveredLifecycleEvents.delete(`${combat.id}:start`);
        deliveredLifecycleEvents.delete(`${combat.id}:end`);
    }
    const eventKey = `${combat.id}:${kind}`;
    if (deliveredLifecycleEvents.has(eventKey)) return;
    // Foundry v13 emits `combatStart` immediately before applying its
    // {round: 1, turn: 0} update, so `combat.started` is still false inside
    // the hook even though this is the authoritative start event.
    if (isStart) startedCombats.add(combat.id);
    if (!isStart && !startedCombats.has(combat.id) && !(Number(combat.round) > 0)) return;

    // Ending invalidates anything which was waiting to describe a round/turn.
    if (!isStart) clearHeldAnnouncement(combat.id);

    const announce = await getSettingSafely(MODULE.ID, CRIER.combatCards, 'both');
    if (announce !== 'both' && announce !== (isStart ? 'start' : 'end')) {
        deliveredLifecycleEvents.add(eventKey);
        lifecycleRetryCounts.delete(eventKey);
        if (!isStart) startedCombats.delete(combat.id);
        return;
    }
    const labelKey = isStart ? CRIER.combatStartLabel : CRIER.combatEndLabel;
    const soundKey = isStart ? CRIER.combatStartSound : CRIER.combatEndSound;
    const [message, combatCardStyle, combatIconStyle] = await Promise.all([
        getSettingSafely(MODULE.ID, labelKey, isStart ? 'Combat Begins' : 'Combat Ends'),
        getSettingSafely(MODULE.ID, CRIER.combatCardStyle, 'green-dark'),
        getSettingSafely(MODULE.ID, CRIER.combatIconStyle, 'fa-shield')
    ]);
    await deliverCard({
        moduleId: MODULE.ID,
        type: `combat-${kind}`,
        theme: normalizeThemeId(combatCardStyle),
        speaker: ChatMessage.getSpeaker('GM'),
        rollMode: 'publicroll',
        parts: [{ part: 'header', icon: cardIcon(combatIconStyle), title: message }],
        flags: { lifecycle: kind, combat: combat.id }
    });
    deliveredLifecycleEvents.add(eventKey);
    lifecycleRetryCounts.delete(eventKey);
    if (!isStart) {
        startedCombats.delete(combat.id);
        lastCombatants.delete(combat.id);
    }
    try {
        await playConfiguredSound(soundKey);
    } catch (error) {
        debugLog('LIFECYCLE ANNOUNCEMENT: Sound failed after delivery', () => ({ kind, error: error?.message ?? error }));
    }
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
    	const blnShowTurnCards = await getSettingSafely(MODULE.ID, CRIER.turnCards, 'full') !== 'none';
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

    const lastCombatant = getLastCombatantState(combat);
    const previous = {
        combatant: lastCombatant.combatant, // cache
        get defeated() { return getDocData(this.combatant)?.defeated; },
        get token() { return this.combatant?.token; },
        spoke: getDocData(lastCombatant.combatant)?.defeated ? false : lastCombatant.spoke, // dead don't speak
    };

    // The state is committed only after every generated message posts.
    debugLog('POST NEW TURN CARD: Pending lastCombatant update', () => ({
        oldCombatantId: lastCombatant.combatant?.id,
        newCombatantId: combatant?.id,
        oldCombatantName: lastCombatant.combatant?.name,
        newCombatantName: combatant?.name
    }));
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
        name: null,
        label: null,
        get hidden() { return this.combatant?.hidden ?? false; },
        get visible() { return this.combatant?.visible ?? false; },
        obfuscated: false,
    };

    // Pull style settings from settings and set stuff
	info.name = info.token?.name ?? combatant.name;
	const cardSettings = await getTurnCardSettings();
	info.turnLayout = cardSettings.turnCards ?? 'full';
	info.turnIconStyle = cardSettings.turnIconStyle ?? 'fa-shield';
	info.turnCardStyle = cardSettings.turnCardStyle ?? 'default';
	info.theme = await resolveThemeClass(info.turnCardStyle);
	info.roundIconStyle = cardSettings.roundIconStyle ?? 'fa-chess-queen';
	info.roundCardStyle = cardSettings.roundCardStyle ?? 'green-dark';
	info.portraitStyle = cardSettings.portraitStyle ?? 'portrait';
    // Whether this combatant is one of the people the GM meant. Resolved once,
    // here, so the composition asks a plain boolean and never re-derives an
    // audience.
    //
    // A PLAYER CHARACTER IS `actor.type === 'character'`. This used to ask
    // whether a world actor existed with the token's name, which called an NPC
    // a player whenever someone had a "Goblin" actor in the sidebar.
    info.isPlayerActor = info.actor?.type === 'character';
    info.showHealth = audienceIncludes(cardSettings.health ?? 'players', info.isPlayerActor);
    info.showAbilities = audienceIncludes(cardSettings.abilities ?? 'players', info.isPlayerActor);
    // Blood is a health readout, so it follows health's audience rather than
    // carrying an audience of its own -- a splattered portrait beside no bar
    // would be telling half the story.
    info.showBlood = info.showHealth && cardSettings.showBloodyPortrait !== false;
    // GET THE IDs
    // Set the view of the turn icon
    info.blnHideTurnIcon = false;
    if (info.turnIconStyle == "none") {
        info.blnHideTurnIcon = true;
    } else {
        info.blnHideTurnIcon = false;
    }
    // Set the LAYOUT. Two of them: the setting offers Detailed and Minimal, and
    // a third branch sat here for years that nothing could ever select.
    info.blnLayoutSmall = info.turnLayout === 'small';
	const showEffects = audienceIncludes(cardSettings.activeEffects ?? 'both', info.isPlayerActor);
	const showPenalties = audienceIncludes(cardSettings.penalties ?? 'players', info.isPlayerActor);
	if (showEffects || showPenalties) {
		// Both blocks describe the same set, so ask Blacksmith once: the
		// display records for the rows, and the documents behind them for
		// the `changes` the penalty report adds up.
		const records = await collectEffectRecords(info.actor);
		if (showEffects) info.activeEffectGroups = await buildActiveEffectGroups(info.actor, records);
		if (showPenalties) info.turnPenaltyReport = buildTurnPenaltyReport(info.actor, records);
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
    if (info.actor) {
        const abilities = info.actor.system?.abilities ?? {};
        info.abilitySTR = abilities.str?.value;
        info.abilityDEX = abilities.dex?.value;
        info.abilityCON = abilities.con?.value;
        info.abilityINT = abilities.int?.value;
        info.abilityWIS = abilities.wis?.value;
        info.abilityCHA = abilities.cha?.value;

        const health = describeHealth(info.actor);
        if (health) Object.assign(info, {
            attributeHP: health.value,
            attributeHPMAX: health.max,
            attributeDEATHSUCCESS: health.successes,
            attributeDEATHFAILURE: health.failures,
            isDead: health.isDead,
            isDeathSaving: health.isDeathSaving,
            bloodyPortraitNumber: health.bloody
        });
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

    // Text, not markup: Blacksmith escapes everything and converts the two
    // inline marks, so the name is emphasised with ** rather than a span. The
    // GM's own label override goes through the same pipeline, which means a
    // world that had put HTML in it now sees the tags instead of obeying them.
    const label = `**${info.name}**`;
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
            portraitStyle: info.portraitStyle
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

    // What is due, carrying each card's OWN context. postNewRound reads
    // `context.crier.roundShift` to tell a real round change from a turn
    // update, so a held round card must not inherit a later turn's context —
    // it would test as "no round change" and vanish, leaving the turn card to
    // announce a round nobody was told about.
    const held = heldAnnouncements.get(combat.id) ?? null;
    const due = {
        combatId: combat.id,
        roundCard: roundChanged ? context : (held?.roundCard ?? null),
        turnCard: turnChanged ? context : (held?.turnCard ?? null)
    };

    // Two reasons never to decide in this instant:
    //
    // A round change is exactly when a reroll-every-round table clears
    // initiative, and that clearing arrives after this update.
    //
    // And if a settle window is already open, this change is very likely part
    // of the same commotion — most often the tracker correcting `turn` to the
    // top of the freshly sorted order, because Foundry keeps whoever was
    // current before the rolls. Announcing both that and what we were already
    // holding is how two turn cards land back to back.
    if (roundChanged || announceTimers.has(combat.id)) {
        debugLog('PROCESS COMBAT CHANGE: Holding until the order settles', () => ({
            roundChanged,
            alreadyWaiting: announceTimers.has(combat.id)
        }));
        holdAnnouncement(combat, due, ORDER_SETTLE_DELAY_MS);
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
        debugLog('PROCESS COMBAT CHANGE: Order not settled, holding cards', () => ({
            started: !!combat.started,
            holding: { roundCard: !!due.roundCard, turnCard: !!due.turnCard },
            waitingOn: combatantsMissingInitiative(combat).map(c => c.name)
        }));
        holdAnnouncement(combat, due, null);
        return;
    }

    heldAnnouncements.delete(combat.id);
    try {
        await announceCombatChange(combat, due);
    } catch (error) {
        holdAnnouncement(combat, due, null);
        debugLog('PROCESS COMBAT CHANGE: Delivery failed, work retained', () => ({ error: error?.message ?? error }));
        throw error;
    }
}

/**
 * Put cards on hold. With a delay, they are reconsidered when it expires;
 * with null, they wait for a combatant hook to say the order settled.
 * @param {Combat} combat
 * @param {{combatId: string, roundCard: object|null, turnCard: object|null}} due
 * @param {number|null} delayMs
 */
function holdAnnouncement(combat, due, delayMs) {
    heldAnnouncements.set(combat.id, due);
    const existingTimer = announceTimers.get(combat.id);
    if (existingTimer) clearTimeout(existingTimer);
    announceTimers.delete(combat.id);
    if (delayMs === null) return;
    const timer = setTimeout(() => {
        announceTimers.delete(combat.id);
        enqueueCombatWork(combat.id, () => flushHeldAnnouncement(combat, { windowElapsed: true }));
    }, delayMs);
    announceTimers.set(combat.id, timer);
}

function clearHeldAnnouncement(combatId) {
    heldAnnouncements.delete(combatId);
    const timer = announceTimers.get(combatId);
    if (timer) clearTimeout(timer);
    announceTimers.delete(combatId);
}

/**
 * Post the cards for a change whose order has settled. `roundCard` and
 * `turnCard` are each either the context of the change that called for that
 * card, or null when it is not due.
 * @param {Combat} combat
 * @param {{roundCard: object|null, turnCard: object|null}} due
 */
async function announceCombatChange(combat, { roundCard, turnCard }) {
    // Building a card is not instant — settings, portraits, effects and
    // enrichHTML all await — and the order can come apart underneath us while
    // it happens. Re-check before each post, and put anything we cannot
    // deliver back on hold rather than dropping it on the floor. Dropping is
    // how a turn card goes missing for a whole round.
    const rearm = (due) => {
        debugLog('ANNOUNCE: Order came apart mid-build, re-holding', () => ({
            holding: { roundCard: !!due.roundCard, turnCard: !!due.turnCard },
            waitingOn: combatantsMissingInitiative(combat).map(c => c.name)
        }));
        holdAnnouncement(combat, { combatId: combat.id, ...due }, null);
    };

    // The round card is published first and on its own. A turn card that
    // arrives before the round it belongs to reads backwards.
    if (roundCard) {
        if (!isOrderSettled(combat)) return rearm({ roundCard, turnCard });
        const expectedRound = combat.round;
        debugLog('ANNOUNCE: Processing round change');
        if (await getSettingSafely(MODULE.ID, CRIER.roundCards, 'announce') !== 'none') {
            const roundMsg = await postNewRound(combat, roundCard);
            if (roundMsg) {
                if (!isOrderSettled(combat) || combat.round !== expectedRound || Number(roundMsg.flags?.round) !== expectedRound) {
                    return rearm({ roundCard, turnCard });
                }
                await deliverCard(roundMsg);
                combat.crierLastRoundNumber = combat.round;
                await playConfiguredSound(CRIER.roundSound);
                debugLog('ANNOUNCE: Round message posted', () => ({ round: combat.round }));
            }
        } else {
            debugLog('ANNOUNCE: Round cycling disabled');
        }
    }

    if (turnCard) {
        if (!isOrderSettled(combat)) return rearm({ roundCard: null, turnCard });
        const expectedCombatantId = combat.combatant?.id;
        const turnMsgs = await postNewTurnCard(combat, turnCard);
        if (turnMsgs?.length) {
            debugLog('ANNOUNCE: Posting turn messages', () => ({ count: turnMsgs.length }));
            for (const msg of turnMsgs) {
                if (!isOrderSettled(combat) || combat.combatant?.id !== expectedCombatantId) {
                    return rearm({ roundCard: null, turnCard });
                }
                await deliverCard(msg);
            }
            const lastCombatant = getLastCombatantState(combat);
            lastCombatant.combatant = combat.combatant;
            lastCombatant.spoke = false;
            await playConfiguredSound(CRIER.turnSound);
        } else {
            debugLog('ANNOUNCE: No turn message to post');
        }
    }
}

/**
 * Post whatever was held back, once the order settles. Only the client that
 * held the announcement flushes it, which is the same client that made the
 * combat update — so the cards still post exactly once.
 * @param {Combat|null|undefined} combat
 */
async function flushHeldAnnouncement(combat, { windowElapsed = false } = {}) {
    const held = combat ? heldAnnouncements.get(combat.id) : null;
    if (!held || !combat) return;
    // Still not settled: keep holding. Whoever has yet to roll will bring us
    // back here through the combatant hooks.
    if (!isOrderSettled(combat)) {
        debugLog('FLUSH HELD ANNOUNCEMENT: Still waiting', () => ({
            waitingOn: combatantsMissingInitiative(combat).map(c => c.name)
        }));
        return;
    }

    // The order settled, but `combat.combatant` may not be who acts first yet:
    // Foundry keeps whoever was current before the rolls, and the tracker
    // moves the pointer to the top of the new order a beat later. Posting now
    // announces the wrong combatant, and the correction then reads as another
    // turn change — two cards, one turn. Open a window and post once it is
    // quiet. `windowElapsed` marks the timer's own call, which is what breaks
    // the loop.
    if (!windowElapsed) {
        debugLog('FLUSH HELD ANNOUNCEMENT: Order settled, waiting for the turn pointer');
        holdAnnouncement(combat, held, ORDER_SETTLE_DELAY_MS);
        return;
    }

    clearHeldAnnouncement(combat.id);
    setRoundInitialized(true);
    debugLog('FLUSH HELD ANNOUNCEMENT: Order settled, posting held cards', () => ({
        roundCard: !!held.roundCard,
        turnCard: !!held.turnCard,
        round: combat.round
    }));
    try {
        await announceCombatChange(combat, held);
    } catch (error) {
        holdAnnouncement(combat, held, null);
        debugLog('FLUSH HELD ANNOUNCEMENT: Delivery failed, work retained', () => ({ error: error?.message ?? error }));
        throw error;
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
    	if (await getSettingSafely(MODULE.ID, CRIER.roundCards, 'announce') !== 'none') {
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
			await deliverCard(msg);
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
async function getTokenImage(tokenDoc) {
    return BlacksmithUtils.getTokenImage(tokenDoc);
}

async function getPortraitImage(actor) {
    return BlacksmithUtils.getPortraitImage(actor);
}
