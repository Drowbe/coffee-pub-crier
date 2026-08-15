// Coffee Pub Crier test harness.
// Launch from a Foundry Script Macro with:
// await import(`/modules/coffee-pub-crier/testing/test-harness.js?v=${Date.now()}`);

const MODULE_ID = 'coffee-pub-crier';
const { runTurnTimingTest } = await import(`/modules/${MODULE_ID}/testing/test-turn-timing.js?v=${Date.now()}`);

if (!game.user.isGM) {
    ui.notifications.error('Crier test harness: run this as a GM.');
} else {
    const setting = (key, fallback = false) => {
        try { return game.settings.get(MODULE_ID, key); }
        catch (_) { return fallback; }
    };

    const tests = [
        {
            id: 'turn-timing',
            label: '⚔️ Combat lifecycle and turn timing',
            description: 'Start, initiative settling, rerolled rounds, held turns, ordering, and combat end.',
            run: runTurnTimingTest
        }
    ];

    // Announcements are three dropdowns now, not four checkboxes: combat covers
    // both ends of a fight in one value.
    const combat = setting('combatCards');
    const settings = [
        ['Combat Start', combat === 'both' || combat === 'start'],
        ['Rounds', setting('roundCards') !== 'none'],
        ['Turns', setting('turnCards') !== 'none'],
        ['Combat End', combat === 'both' || combat === 'end']
    ].map(([label, enabled]) => `${label}: <strong>${enabled ? 'ON' : 'off'}</strong>`).join(' · ');

    const testButtons = tests.map((test, index) => `
        <button type="button" data-crier-test="${index}"
            style="display:block; width:100%; margin:0; padding:8px 10px; text-align:left; white-space:normal; line-height:1.3;">
            <strong>${test.label}</strong><br><small style="opacity:.75">${test.description}</small>
        </button>`).join('');

    await foundry.applications.api.DialogV2.wait({
        window: { title: 'Crier Test Harness' },
        content: `
            <p style="margin:0 0 8px 0;">Run Crier's live Foundry test suites. Tests create and clean up their own documents and messages.</p>
            <div style="font-size:.9em; border:1px solid rgba(255,255,255,.2); border-radius:4px; padding:6px 8px; margin:0 0 8px 0;">
                <strong>Live settings:</strong> ${settings}
            </div>
            <div style="display:grid; grid-template-columns:1fr; gap:5px;">${testButtons}</div>`,
        buttons: [{ action: 'close', label: 'Close', default: true }],
        position: { width: 680, height: 'auto' },
        render: (_event, dialog) => {
            const root = dialog?.element ?? dialog;
            root.querySelectorAll('[data-crier-test]').forEach((button) => {
                button.addEventListener('click', async () => {
                    const test = tests[Number(button.dataset.crierTest)];
                    if (!test || button.disabled) return;
                    button.disabled = true;
                    const original = button.innerHTML;
                    button.innerHTML = `<strong>⏳ Running ${test.label.replace(/^\S+\s*/, '')}…</strong>`;
                    try { await test.run(); }
                    catch (error) {
                        console.error(`Crier test harness: ${test.id} failed`, error);
                        ui.notifications.error(`Crier test harness: ${test.label} failed unexpectedly. See console.`);
                    } finally {
                        button.disabled = false;
                        button.innerHTML = original;
                    }
                });
            });
        }
    });
}
