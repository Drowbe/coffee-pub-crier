const MODULE_ID = 'coffee-pub-crier';
const SETTLE_MS = 250;
const QUIET_MS = SETTLE_MS * 4;
const DELIVERY_TIMEOUT_MS = 10000;
const POST_DELIVERY_QUIET_MS = 750;
const TRACKER_REACTION_MS = 40;
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

export async function runTurnTimingTest() {
    if (!game.user.isGM) throw new Error('Run this test as a GM.');
    if (!canvas?.scene) throw new Error('Open a scene before running this test.');

    const activeSceneCombat = game.combats.find(combat => combat.active && combat.scene?.id === canvas.scene.id);
    if (activeSceneCombat) {
        ui.notifications.error('Crier timing test: end the active combat on this scene first. The harness will not disturb it.');
        return;
    }

    const requiredSettings = ['combatStartCycling', 'roundCycling', 'turnCycling', 'combatEndCycling'];
    const disabled = requiredSettings.filter(key => !game.settings.get(MODULE_ID, key));
    if (disabled.length) {
        ui.notifications.error(`Crier timing test: enable these settings first: ${disabled.join(', ')}.`);
        return;
    }

    const controlled = canvas.tokens.controlled.filter(token => token.actor);
    const pool = controlled.length >= 2 ? controlled.slice(0, 2) : canvas.tokens.placeables.filter(token => token.actor).slice(0, 2);
    if (pool.length < 2) {
        ui.notifications.error('Crier timing test: select or place at least two tokens with actors.');
        return;
    }

    const proceed = await foundry.applications.api.DialogV2.confirm({
        window: { title: 'Crier Lifecycle Timing Test' },
        content: `<p>Creates a temporary combat with <strong>${pool.map(token => token.name).join('</strong> and <strong>')}</strong>, runs 10 checks, then removes only its own combat and chat cards.</p>
                  <p>Takes about 30 seconds. Players will briefly see test announcements.</p>`,
        modal: true,
        rejectClose: false
    });
    if (!proceed) return;

    let combat = null;
    let testCombatId = null;
    let recorded = [];
    const posted = new Set();
    const results = [];

    const hookId = Hooks.on('createChatMessage', message => {
        const flags = message.flags?.[MODULE_ID];
        if (!flags || !testCombatId || flags.combat !== testCombatId) return;
        posted.add(message.id);
        recorded.push({
            kind: flags.lifecycle ?? (flags.roundCycling ? 'round' : flags.turnAnnounce ? 'turn' : 'other'),
            round: flags.round ?? null,
            combatantId: flags.combatant ?? null
        });
    });

    const check = async (label, action, want = {}, { wantFirst = false, sequence = null } = {}) => {
        recorded = [];
        const expected = { start: 0, round: 0, turn: 0, end: 0, other: 0, ...want };
        const expectedTotal = Object.values(expected).reduce((sum, count) => sum + count, 0);
        await action();

        // Turn-card construction can include settings, portraits, effects and
        // enrichHTML. On a module-heavy world that takes materially longer
        // than the 250 ms order-settle window, so wait for the expected cards
        // rather than letting a slow card spill into the next assertion.
        if (expectedTotal === 0) await wait(QUIET_MS);
        else {
            const deadline = Date.now() + DELIVERY_TIMEOUT_MS;
            while (recorded.length < expectedTotal && Date.now() < deadline) await wait(100);
            await wait(POST_DELIVERY_QUIET_MS);
        }

        const got = Object.fromEntries(Object.keys(expected).map(kind => [kind, recorded.filter(row => row.kind === kind).length]));
        const notes = [];
        let pass = Object.entries(expected).every(([kind, count]) => got[kind] === count);
        if (!pass) notes.push(`expected ${JSON.stringify(expected)}, got ${JSON.stringify(got)}`);

        if (pass && sequence) {
            const actual = recorded.map(row => row.kind);
            if (actual.join(',') !== sequence.join(',')) {
                pass = false;
                notes.push(`expected order ${sequence.join(' → ')}, got ${actual.join(' → ') || 'nothing'}`);
            }
        }

        if (pass && wantFirst) {
            const expectedCombatant = combat.turns[0];
            const announcedId = recorded.find(row => row.kind === 'turn')?.combatantId;
            if (announcedId !== expectedCombatant?.id) {
                pass = false;
                notes.push(`announced ${combat.combatants.get(announcedId)?.name ?? 'someone else'}, but ${expectedCombatant?.name} acts first`);
            } else notes.push(`correctly announced ${expectedCombatant.name}`);
        }

        results.push({ label, pass, note: notes.join('; ') });
        console.log(`%c${pass ? 'PASS' : 'FAIL'}%c  ${label}${notes.length ? ` — ${notes.join('; ')}` : ''}`,
            `font-weight:bold;color:${pass ? '#3c3' : '#e44'}`, '');
    };

    const clearInitiative = () => combat.updateEmbeddedDocuments('Combatant',
        combat.combatants.map(combatant => ({ _id: combatant.id, initiative: null })));

    const rollEveryone = async () => {
        let initiative = 20;
        for (const combatant of combat.combatants) {
            await combat.setInitiative(combatant.id, initiative);
            initiative -= 3;
            await wait(120);
        }
    };

    try {
        // Deleting an unstarted setup must not announce combat end.
        combat = await getDocumentClass('Combat').create({ scene: canvas.scene.id });
        testCombatId = combat.id;
        await check('1. Deleting an unstarted combat is silent', async () => {
            await combat.delete();
            combat = null;
        });

        combat = await getDocumentClass('Combat').create({ scene: canvas.scene.id });
        testCombatId = combat.id;
        await combat.activate();
        await combat.createEmbeddedDocuments('Combatant', pool.map(token => ({ tokenId: token.id, sceneId: canvas.scene.id })));
        await clearInitiative();
        await wait(QUIET_MS);

        await check('2. Combat begins before initiative settles', () => combat.startCombat(), { start: 1 }, { sequence: ['start'] });
        await check('3. Last initiative releases round then correct turn', rollEveryone,
            { round: 1, turn: 1 }, { wantFirst: true, sequence: ['round', 'turn'] });

        await check('4. New round is held when initiative clears', async () => {
            await combat.nextRound();
            await wait(TRACKER_REACTION_MS);
            await clearInitiative();
        });
        await check('5. A partial reroll remains silent', () => combat.setInitiative(combat.combatants.contents[0].id, 14));
        await check('6. Final reroll releases round then correct turn', async () => {
            await combat.setInitiative(combat.combatants.contents[1].id, 11);
            await wait(TRACKER_REACTION_MS);
            await combat.update({ turn: 0 });
        }, { round: 1, turn: 1 }, { wantFirst: true, sequence: ['round', 'turn'] });

        await check('7. Plain turn advance', () => combat.nextTurn(), { turn: 1 }, { sequence: ['turn'] });
        await check('8. Turn change is held while initiative is missing', async () => {
            await combat.updateEmbeddedDocuments('Combatant', [{ _id: combat.combatants.contents[0].id, initiative: null }]);
            await combat.update({ turn: 0 });
        });
        await check('9. Restored initiative releases the held turn',
            () => combat.setInitiative(combat.combatants.contents[0].id, 17), { turn: 1 }, { sequence: ['turn'] });

        await check('10. Deleting started combat announces end once', async () => {
            await combat.delete();
            combat = null;
        }, { end: 1 }, { sequence: ['end'] });
    } finally {
        if (combat && game.combats.has(combat.id)) {
            await combat.delete();
            await wait(QUIET_MS);
        }
        Hooks.off('createChatMessage', hookId);
        const ownedMessages = [...posted].filter(id => game.messages.has(id));
        if (ownedMessages.length) await ChatMessage.deleteDocuments(ownedMessages);
    }

    const failed = results.filter(result => !result.pass);
    const summary = results.map(result =>
        `<li>${result.pass ? '✅' : '❌'} ${result.label}${result.note ? `<br><small style="opacity:.75">${result.note}</small>` : ''}</li>`
    ).join('');
    await ChatMessage.create({
        whisper: [game.user.id],
        content: `<h3>Crier lifecycle timing: ${failed.length ? `${failed.length} of ${results.length} failed` : `all ${results.length} passed`}</h3><ul>${summary}</ul>`
    });
    if (failed.length) ui.notifications.warn(`Crier timing test: ${failed.length} failed — see chat and console.`);
    else ui.notifications.info(`Crier timing test: all ${results.length} checks passed.`);
}
