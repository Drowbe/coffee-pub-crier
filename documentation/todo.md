## Coffee Pub Crier – Technical Debt

- [ ] Cache and batch the repeated `getSettingSafely` calls inside `postNewTurnCard` so each turn render does not perform 10+ async lookups.
- [ ] Fix the `getSettingSafely` call in `createMissedTurnCard` to include the module ID so the notification toggle stops doing a failing lookup every turn.
- [ ] Correct `defaultVisible` in `generateCards` by actually invoking `getDefaultPermission(...)`; current comparison against the function object forces every turn card into GM-only whisper.
- [ ] Replace the bulk `ChatMessage.create(msgs)` call in `processTurn` with awaited per-message creation (matching the logic already used elsewhere) to avoid promise rejections and duplicate renders.
- [ ] Gate the verbose `BlacksmithUtils.postConsoleAndNotification` telemetry (especially the initiative dumps in `processCombatChange`) behind a debug flag to prevent constant object allocations during combat.
- [ ] Provide a non-animated style (or auto-disable animations after a timeout) for `missed-crier` and HP critical indicators so old chat cards are not running infinite CSS animations forever.

