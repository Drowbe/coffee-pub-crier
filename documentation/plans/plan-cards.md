# Migrating Crier's Chat Cards to Blacksmith Parts

**Status:** Implemented. The behaviour below is described as current reality in
`../architecture/architecture-crier.md`; confirm nothing here is still the only record of a
decision, then delete this file.

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

### Step 7 — Settings simplification

Every section now opens the same way: one dropdown saying whether the card is
posted at all, then how it reads. An enable checkbox paired with a second
setting that only mattered when it was ticked became one choice in each case,
because the pair made "off" look like a state you had to assemble.


- [x] "Turn Card Appearance" and "Turn Announcement" merged into **Turn Configuration**
- [x] "Announce Turns" and "Turn Card Layout" merged into **Turn Cards**: Do Not
      Announce Turns / Large Turn Cards (default) / Small Turn Cards. The second
      setting only meant anything when the first was on, and a layout sitting
      under an unticked "Announce Turns" invited the reader to wonder which won
- [x] Reordered: Turn Cards, Card Label, Card Icon, Card Theme, Turn Start Sound
- [x] The three `hide...` toggles became `show...`, all defaulting to on
- [x] "Show Status & Conditions" and "Show Status & Conditions For" merged into
      **Show Status & Conditions**: Do Not Show / Players / NPCs and Monsters /
      Players, NPCs, and Monsters — "off" is just the audience nobody is in
- [x] `migrateTurnSettings()` carries a world's existing choices across, writing
      each target only while it still holds its default
- [x] Superseded keys stay registered but hidden, so stored values remain valid
      and the migration can read them
- [x] Fixed a pre-existing i18n bug: the round card asked for `RoundCycling`
      while the string is `roundCycling`, so an unlabelled round card rendered
      the literal key
- [x] "Combat Lifecycle" → **Combat Configuration**, and the two announce
      checkboxes became **Combat Cards**: Do Not Announce Combat / Announce
      Start Only / Announce End Only / Announce Start and End
- [x] "Round Card Appearance" and "Round Announcement" merged into **Round
      Configuration**, and "Announce New Rounds" became **Round Cards**: Do Not
      Announce Rounds / Announce Rounds. Two options where a checkbox would do,
      chosen for the shape rather than the content — every section then opens
      the same way
- [x] Missed turns: "Enable Missed Turn Reminders" and "Show Missed Turn
      Notification" became **Missed Turn Reminders**: Do Not Remind / Chat Card
      Only / Chat Card and Notification
- [x] Round and combat sections reordered to match Turns: cards, label(s), icon,
      theme, sound(s)
- [x] Health, Ability Scores and Turn Penalties became audience dropdowns too,
      each defaulting to Players. Four content settings now share one shape:
      show this, and say who for
- [x] Portrait blood follows the health audience rather than carrying one of its
      own — a splattered portrait beside no bar tells half the story
- [x] `isNPC` retired. It asked whether a world actor existed with the token's
      name, which called an NPC a player whenever someone had a "Goblin" in the
      sidebar. A player character is now `actor.type === 'character'`, one
      notion instead of two, and the name lookup and its helper are gone

## Decisions

- **Portrait background tile is removed.** It existed because transparent token
  art dissolved into the card. Blacksmith already sits every card image on a
  ground pitched at the tile fill, without being asked.
- **Portrait scale is removed.** The two layouts pick appropriate parts instead
  of scaling one image: Detailed uses `image`, Minimal uses `subject`.
- **Death saves become clickable.** The card is a snapshot, so a button that
  visibly does nothing to the card it sits on is worse than no button; the live
  update is part of the same step rather than a follow-up.
- **No blood overlay on a Minimal card.** `subject` takes no `overlays`, and a
  splatter over a thumbnail that size would not read anyway. Not worth a request.
- **No section heading over the penalties.** `notes` draws its own top rule, so
  a `section` above it drew the line twice.
- **The player's name is off the card.** Who is running the character is not
  what a turn card is for.
- **A refresh honours the card, not the settings.** Which parts a posted card is
  allowed to have is read back off the card itself, so turning a setting on
  mid-combat does not make something appear on a card that never had it.

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
