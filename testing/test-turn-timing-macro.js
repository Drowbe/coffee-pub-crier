// ==================================================================
// ===== CRIER TURN-CARD TIMING TEST (testing/test-turn-timing-macro.js)
// ==================================================================
// Paste this whole file into a Foundry SCRIPT MACRO and run it as GM.
//
// It drives a REAL combat through the sequences that used to break, and
// watches the chat messages Crier actually posts. Every scenario below
// is one that misbehaved in play, so a regression here is a regression
// a table would notice.
//
// It emulates a reroll-every-round tracker: clearing initiative just
// after the round update, and snapping `turn` to the top slot once the
// rolls are in. Those two beats are what the settle window exists for.
//
// Setup:
//   - Run as GM, on a scene with at least 2 tokens that have actors.
//   - Select the tokens you want used, or it takes the first two.
//   - It creates its own combat and deletes it afterwards, along with
//     the cards it posted. Your existing combat is left alone.
// ==================================================================

const MODULE_ID = 'coffee-pub-crier';

// Must match ORDER_SETTLE_DELAY_MS in scripts/crier.js. Everything waits
// several windows, so being generous here costs a few seconds and buys
// results that do not flicker on a slow world.
const SETTLE_MS = 250;
const QUIET_MS = SETTLE_MS * 4;

// How long after a round update the tracker clears initiative. Real
// trackers land inside a frame or two; this is the same ballpark.
const TRACKER_REACTION_MS = 40;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!game.user.isGM) {
    ui.notifications.error('Crier timing test: run this as the GM.');
    return;
}

// --- subjects -----------------------------------------------------

const controlled = canvas.tokens.controlled.filter((t) => t.actor);
const pool = controlled.length >= 2
    ? controlled
    : canvas.tokens.placeables.filter((t) => t.actor).slice(0, 2);

if (pool.length < 2) {
    ui.notifications.error('Crier timing test: needs at least 2 tokens with actors on the scene.');
    return;
}

// Turn and round cards must be switched on, or every scenario "passes"
// by posting nothing and the run means nothing.
const turnCycling = game.settings.get(MODULE_ID, 'turnCycling');
const roundCycling = game.settings.get(MODULE_ID, 'roundCycling');
if (!turnCycling || !roundCycling) {
    ui.notifications.error(`Crier timing test: enable both Show Combatant Cards (${turnCycling}) and Display 'New Round' Cards (${roundCycling}) first.`);
    return;
}

const proceed = await foundry.applications.api.DialogV2.confirm({
    window: { title: 'Crier Turn-Card Timing Test' },
    content: `<p>Creates a temporary combat with <strong>${pool.map((t) => t.name).join('</strong> and <strong>')}</strong>, runs 7 timing checks, then deletes the combat and the cards it posted.</p>
              <p>Takes about 30 seconds. Players will briefly see the test cards.</p>`,
    modal: true,
    rejectClose: false
});
if (!proceed) return;

// --- recorder -----------------------------------------------------

let recorded = [];
const posted = [];   // every id we create, for cleanup

const hookId = Hooks.on('createChatMessage', (msg) => {
    const flags = msg.flags?.[MODULE_ID];
    if (!flags) return;
    posted.push(msg.id);
    recorded.push({
        kind: flags.roundCycling ? 'round' : flags.turnAnnounce ? 'turn' : 'other',
        round: flags.round,
        combatantId: flags.combatant ?? null
    });
});

const results = [];

/**
 * Run one scenario: clear the tape, do the thing, wait for quiet, judge.
 * `want` is {round, turn} counts; `wantFirst` asserts the turn card names
 * whoever actually acts first, which is the pointer-correction bug.
 */
async function check(label, action, want, { wantFirst = false } = {}) {
    recorded = [];
    await action();
    await wait(QUIET_MS);

    const got = {
        round: recorded.filter((r) => r.kind === 'round').length,
        turn: recorded.filter((r) => r.kind === 'turn').length
    };
    const notes = [];
    let pass = got.round === want.round && got.turn === want.turn;
    if (!pass) notes.push(`expected ${want.round} round / ${want.turn} turn, got ${got.round} / ${got.turn}`);

    if (pass && wantFirst && got.turn === 1) {
        const expected = combat.turns[0];
        const announced = recorded.find((r) => r.kind === 'turn')?.combatantId;
        if (announced !== expected?.id) {
            pass = false;
            notes.push(`announced ${combat.combatants.get(announced)?.name ?? 'someone else'}, but ${expected?.name} acts first`);
        } else {
            notes.push(`correctly announced ${expected?.name}`);
        }
    }
    results.push({ label, pass, note: notes.join('; ') });
    console.log(`%c${pass ? 'PASS' : 'FAIL'}%c  ${label}${notes.length ? ` — ${notes.join('; ')}` : ''}`,
        `font-weight:bold;color:${pass ? '#3c3' : '#e44'}`, '');
}

// --- tracker emulation --------------------------------------------

const clearInitiative = () => combat.updateEmbeddedDocuments('Combatant',
    combat.combatants.map((c) => ({ _id: c.id, initiative: null })));

/** A round change on a reroll table: the clear lands after the update. */
async function roundChangeThenClear() {
    await combat.nextRound();
    await wait(TRACKER_REACTION_MS);
    await clearInitiative();
}

/** Roll everyone, one at a time, the way a table actually does it. */
async function rollEveryone() {
    let seed = 20;
    for (const combatant of combat.combatants) {
        await combat.setInitiative(combatant.id, seed);
        seed -= 3;
        await wait(120);
    }
}

/** Foundry keeps the pre-roll combatant; the tracker snaps to the top. */
const correctPointer = () => combat.update({ turn: 0 });

// --- run ----------------------------------------------------------

let combat;
try {
    combat = await getDocumentClass('Combat').create({ scene: canvas.scene.id });
    await combat.activate();
    await combat.createEmbeddedDocuments('Combatant',
        pool.map((t) => ({ tokenId: t.id, sceneId: canvas.scene.id })));
    await clearInitiative();
    await wait(QUIET_MS);

    await check('1. Combat begins, nobody has rolled',
        () => combat.startCombat(), { round: 0, turn: 0 });

    await check('2. Initiatives come in — round 1 begins',
        rollEveryone, { round: 1, turn: 1 }, { wantFirst: true });

    await check('3. Round 2 ticks over, initiative cleared',
        roundChangeThenClear, { round: 0, turn: 0 });

    await check('4. Half the table has rolled',
        () => combat.setInitiative(combat.combatants.contents[0].id, 14), { round: 0, turn: 0 });

    await check('5. Last roll lands, then the pointer is corrected',
        async () => {
            await combat.setInitiative(combat.combatants.contents[1].id, 11);
            await wait(TRACKER_REACTION_MS);
            await correctPointer();
        },
        { round: 1, turn: 1 }, { wantFirst: true });

    await check('6. Plain turn advance',
        () => combat.nextTurn(), { round: 0, turn: 1 });

    await check('7. A combatant loses initiative mid-round',
        async () => {
            await combat.updateEmbeddedDocuments('Combatant',
                [{ _id: combat.combatants.contents[0].id, initiative: null }]);
            await combat.nextTurn();
        },
        { round: 0, turn: 0 });

    await check('8. …and rolls, releasing the held card',
        () => combat.setInitiative(combat.combatants.contents[0].id, 17),
        { round: 0, turn: 1 });
} finally {
    Hooks.off('createChatMessage', hookId);
    if (combat) await combat.delete();
    if (posted.length) await ChatMessage.deleteDocuments(posted.filter((id) => game.messages.has(id)));
}

// --- report -------------------------------------------------------

const failed = results.filter((r) => !r.pass);
const summary = results
    .map((r) => `<li>${r.pass ? '✅' : '❌'} ${r.label}${r.note ? `<br><small style="opacity:.75">${r.note}</small>` : ''}</li>`)
    .join('');

await ChatMessage.create({
    whisper: [game.user.id],
    content: `<h3>Crier turn-card timing: ${failed.length ? `${failed.length} of ${results.length} failed` : `all ${results.length} passed`}</h3><ul>${summary}</ul>`
});

if (failed.length) ui.notifications.warn(`Crier timing test: ${failed.length} failed — see chat and console.`);
else ui.notifications.info(`Crier timing test: all ${results.length} checks passed.`);
