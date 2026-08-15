# Migrating Crier's Chat Cards to Blacksmith Parts

## Outcome

Crier describes its cards as data and Blacksmith renders them. Crier ships no
card templates and no card stylesheets. Improving a part improves every Crier
card that has already been posted, and Foundry's chat markup becomes
Blacksmith's problem rather than Crier's.

The test, from Blacksmith's migration note: delete every card template and card
stylesheet. Does everything still render? Two features failed that test on the
first pass — the portrait background tile and the portrait scale slider — and
both are being removed rather than kept, so nothing needs to be asked of
Blacksmith.

## Behavioral contract

- No Crier code builds card HTML. Text is passed as text and escaped by
  Blacksmith; `**bold**` is the only emphasis.
- Anything that varies by reader is decided in the reader's own browser, through
  a registered render pass — never computed while composing, and never applied
  from a `renderChatMessageHTML` hook, which the parts re-render discards.
- A card button's handler checks permission itself. Hiding a control is
  presentation, not authorization.
- Theme settings store Blacksmith theme **ids**, not CSS class names.
- The existing ordering guarantees survive: live combat state is re-checked
  immediately before every post, and undeliverable work is re-held rather than
  dropped.

## The four cards

| Card | Composition |
|---|---|
| Round | `header` |
| Combat start / end | `header` |
| Missed turn | `header` + `prose` (GM whisper) |
| Turn — Detailed | `header`, `image` (portrait + blood overlays), `identity`, `meter` (HP), `pips` (death saves), `band` (dead), `tiles` (abilities), `section`+`rows` (effects), `section`+`notes` (penalties) |
| Turn — Minimal | `header`, `subject` (portrait, name, HP meter beneath) |

## Checklist

### Step 1 — Theme settings

- [x] Replace the dead `getAnnouncementThemeChoicesWithClassNames()` call with `getThemeChoices('card')`
- [x] Store theme ids rather than CSS class names; update the three defaults
- [x] Migrate stored legacy values (`theme-announcement-green` → `green-dark`, `theme-*` → `*`)
- [x] Normalize legacy values at read time, so a client sees the right theme before a GM has run the migration
- [x] Collapse `mapRoundCardStyleToTheme` / `mapTurnCardStyleToTheme` into one resolver (temporary — the turn template still needs a class name until step 4)

### Step 2 — The three simple cards

- [x] Round card → `chatCards.post()`
- [x] Combat start / end → `chatCards.post()`
- [x] Missed turn → `chatCards.post()`, with its hardcoded English moved to `lang/en.json`
- [x] Preserve the `isOrderSettled` re-check at the round-card post boundary
- [x] Delete `templates/rounds.hbs` and `templates/combat.hbs`
- [x] `deliverCard()` throws when `post()` returns null — `post()` logs and
      returns null rather than throwing, which would have consumed a lifecycle
      event, advanced `crierLastRoundNumber` and played a sound for a card that
      never posted

### Step 3 — Build/post split

- [x] Rework `generateCards` / `postNewTurnCard` / `announceCombatChange` / `processTurn` to carry compositions rather than message data, since `post()` builds and creates in one call
- [x] Keep the re-check between composing and posting; keep re-held work re-held

### Step 4 — Turn card

- [x] Detailed layout → parts
- [x] Minimal layout → `subject`
- [x] Clickable death saves: `pips` centre action, `registerAction` on `ready` on every client, `value` carrying the token UUID, handler checking `actor.isOwner` before `actor.rollDeathSave()`
- [x] Render pass dimming the death-save control for readers who cannot roll —
      the pass disables the button and removes its pulse rather than dimming it,
      because Blacksmith has no disabled styling for a pips centre and adding it
      here would mean shipping card CSS again. If an explicit dimmed look is
      wanted, that is a small ask of Blacksmith, not a stylesheet here.
- [x] Live update: a GM-side `updateActor` hook rewriting the stored composition when `system.attributes.death` changes, so the pips move on every client
- [x] While that hook exists, extend it to the HP meter and the blood overlay — the same write covers all three, and both have been asked for

- [x] `describeHealth()` extracted, so the composition and the refresh cannot
      disagree about the thresholds. It reads the COMBATANT'S actor; the old
      inline block looked a world actor up by the token's name, which found the
      wrong document for any unlinked token — and the death-save button rolls
      against the combatant's actor, so a card built the old way could show one
      creature's saves and roll another's.
- [x] The turn label is text: `**name**`, not `<span class='name'>`. A world
      that had put HTML in the label override now sees the tags rather than
      obeying them.

### Step 5 — Per-reader work

- [x] NPC obfuscation → `registerRenderPass` (currently a `renderChatMessageHTML` DOM edit that the parts re-render silently discards)
- [x] Strip DOM manipulation from `chatMessageEvent`, keeping only the `lastCombatant` flag tracking, which is data rather than decoration

### Step 6 — Deletions

- [x] `templates/turns.hbs` and the `templates/` directory
- [x] `styles/turns.css`, `styles/default.css`, `styles/temp.css` (already unloaded), and the `styles` entry in `module.json`
- [x] `tokenBackground` setting, its lang keys, `getTokenBackgroundPresentation`, `applyCrierTokenBackgroundFrames`, the `tokenBackgroundImageUrl` flag, and the `assetLookup` dependency
- [x] `tokenScale` setting and its lang keys
- [x] `interceptNewTurnMessage`, `interceptNewRoundMessage`, `interceptMissedTurnMessage` — all three are already no-ops
- [x] The unreachable `blnLayoutNone` branch; the layout setting only offers `full` and `small`

## Decisions

- **Portrait background tile is removed.** It existed because transparent token
  art dissolved into the card. Blacksmith already sits every card image on a
  ground pitched at the tile fill, without being asked.
- **Portrait scale is removed.** The two layouts pick appropriate parts instead
  of scaling one image: Detailed uses `image`, Minimal uses `subject`.
- **Death saves become clickable.** The card is a snapshot, so a button that
  visibly does nothing to the card it sits on is worse than no button; the live
  update is part of the same step rather than a follow-up.

## Out of scope

- Registering new parts. The library is closed by design; a missing part is a
  request to Blacksmith, not a workaround here.
- Changing what Crier announces or when. That contract is
  `plan-combat-announcements.md` and this migration does not touch it.

## Verification

- Run JavaScript syntax checks.
- Every card type posts and renders with the correct theme, on both a GM and a
  player client.
- Round and combat themes are settable and survive a reload — the regression
  step 1 fixes.
- A world upgrading from a legacy theme value lands on the equivalent theme
  rather than falling back to Tan.
- A dying character's card shows the right pips; a player who owns that
  character can roll from it and a player who does not cannot.
- The dots move on every client after a death save is rolled.
- An obfuscated NPC reads as unidentified for players and by name for the GM,
  and stays that way after the parts re-render.
