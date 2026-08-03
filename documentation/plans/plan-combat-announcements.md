# Combat Announcement Ownership and Reliability

## Outcome

Coffee Pub Crier is the sole owner of chat announcements for the combat lifecycle:

1. Combat start
2. New round
3. New turn
4. Combat end

Each announcement is independently configurable. Blacksmith may continue to provide combat statistics and summary cards, but its duplicate lifecycle announcements are retired separately.

## Behavioral contract

- Combat start means Foundry's combat has actually started, not merely that a Combat document was created.
- Round and turn cards wait until combat has started and every combatant has a finite initiative.
- At the top of a round, cards post in round-then-turn order.
- Combat end posts once and cancels obsolete held round/turn work.
- The client responsible for the originating lifecycle event is the only client that posts.
- State is isolated per combat; activity in one combat cannot overwrite another combat's held work.
- Live combat state is checked immediately before every `ChatMessage.create`.
- An event is marked delivered, and its sound is played, only after chat creation succeeds.
- Failed or interrupted work remains eligible for retry.

## Implementation

1. Add world settings for combat-start and combat-end cards, labels, icons, themes, and sounds. Preserve the existing round and turn settings.
2. Add start/end lifecycle hooks and render their cards through the same announcement-card presentation used for rounds.
3. Replace singleton held announcement/timer state with per-combat state.
4. Serialize delivery per combat and revalidate round, turn, and active-combatant identity at the final post boundary.
5. Commit delivery markers after successful chat creation instead of during card construction.
6. Clear pending round/turn work when combat ends or is deleted, while deduplicating `endCombat` and `deleteCombat` paths.
7. Expand the live timing macro for lifecycle toggles, rerolled initiative, rapid updates, multiple combats, retry behavior, and end/delete paths.
8. Update architecture documentation and the changelog after verification.

## Out of scope

- Removing Blacksmith settings, templates, or hooks. That change is owned and performed in Blacksmith.
- Removing Blacksmith's combat statistics, MVP, notable-moment, party-breakdown, or summary cards.

## Verification

- Run JavaScript syntax/static checks.
- Run the Foundry timing macro with all four announcement categories enabled.
- Verify each category independently disabled.
- Verify reroll-every-round combat produces exactly one round card followed by exactly one correct turn card.
- Verify ending and deleting combat cannot duplicate the end card.
- Verify two combats can hold and release announcements independently.
- Force a render/chat failure and confirm the event is not consumed.
