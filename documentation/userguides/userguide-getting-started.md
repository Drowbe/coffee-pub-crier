# Getting Started with Crier

**Audience:** GMs and players using Crier at the table.

The first five minutes: what Crier puts in chat once it is enabled, who sees each part of it, and
the settings worth changing before your first fight.

## What you need installed

Crier requires **Coffee Pub Blacksmith**, and will not work without it. Blacksmith supplies the card
themes, icons and sounds that Crier's settings choose from, so install and enable it first.

## What changes the moment you enable it

Nothing changes outside of combat. Start a fight and Crier posts cards to chat as it runs:

- A card when combat begins, and another when it ends.
- A card at the top of each round, reading **Round 1**, **Round 2**, and so on.
- A card for each combatant as their turn comes up, carrying their portrait and -- depending on the
  settings below -- their health, ability scores, conditions and death saves.

Everyone at the table sees these cards. Only one card is posted per event, by the GM, and everyone
reads the same one.

## Why the first cards wait for initiative

Crier posts nothing -- not the round card, not the first turn card -- until combat has started and
every combatant has rolled initiative. This is deliberate: a card announced before the order settles
names whoever happened to be first at that instant, and the tracker then re-sorts underneath it.

So on a table that rolls initiative one combatant at a time, expect chat to stay quiet through the
rolling and then catch up the moment the last initiative lands. The same applies to a combatant
added mid-fight: cards pause until that combatant has rolled.

If cards never arrive on a fight where everyone has rolled, that is a defect rather than this rule --
see [known issues](../known-issues.md).

## Change what a turn card says

Open **Configure Settings**, then **Module Settings**, and find Crier. The controls under **Turn Card
Content** decide what each turn card carries:

- **Portrait Image** -- *None*, *Token*, or *Portrait*. Which picture sits on the card, if any.
- **Show Portrait Blood** -- on or off. Splatters the portrait as the combatant loses health.
- **Show Health**, **Show Ability Scores**, **Show Status & Conditions**, **Show Turn Penalties**

Those last four each answer one question -- who is this shown for? -- rather than being on/off
switches. Each offers *Do Not Show*, *Players*, *NPCs and Monsters*, or *Players, NPCs, and
Monsters*. Choosing *Players* means the block appears on cards for player characters and not on cards
for monsters, which is the usual way to keep a monster's hit points off the table without hiding your
own party's.

**Show Portrait Blood** has no audience of its own. It follows **Show Health**: a splattered portrait
appears for whoever the health readout appears for.

## Turn the sounds off

Each kind of card has its own sound, and each is a separate dropdown with a *None* option:

- **Combat Start Sound** and **Combat End Sound**, under **Combat Configuration**
- **Round Start Sound**, under **Round Configuration**
- **Turn Start Sound**, under **Turn Configuration**

Set the ones you do not want to *None*. The turn sound is the one that fires most often, so it is
usually the first to go.

## Turn a whole kind of card off

Each section opens with one control saying whether that card is posted at all:

- **Combat Cards** -- *Do Not Announce Combat*, *Announce Start Only*, *Announce End Only*, or
  *Announce Start and End*.
- **Round Cards** -- *Do Not Announce Rounds* or *Announce Rounds*.
- **Turn Cards** -- *Do Not Announce Turns*, *Large Turn Cards*, or *Small Turn Cards*.

*Large Turn Cards* and *Small Turn Cards* are two layouts of the same card, not two levels of detail.
Every content setting above applies to both; the small layout folds the portrait, class, speed and
health bar together into one compact block.

## Change the wording

**Start Label** and **End Label** set the text on the combat cards. **Round Label** sets the round
card's text and defaults to `Round {round}` -- `{round}` is replaced with the round number, and if
you remove it, no number appears. **Card Label** under **Turn Configuration** sets the turn card's
text and defaults to `{name}`, which is replaced with the combatant's name.

## What a player sees, and what only the GM sees

- **The cards themselves** are posted to everyone.
- **Death saving throws** are rollable from the card by whoever owns that character. Everyone sees
  the pips; the button only works for the owner, and is shown greyed out to anyone else.
- **Monster names** can be hidden. **NPC Name Visibility** under **Turn Card Content** decides
  whether a monster's real name reaches players: *Show names for everyone*, *Only show player owned
  names*, *All token names visible*, or *Player owned or token name visible*. A hidden name reads as
  `???` for players while the GM continues to see the real one.
- **Missed turn reminders** are whispered to the GMs alone. **Missed Turn Reminders** under **Missed
  Turns** offers *Do Not Remind*, *Chat Card Only*, or *Chat Card and Notification*.

## Roll a death save from the card

When a character is at zero hit points, their turn card shows the death save pips in place of the
health bar. The owner of that character clicks the card to roll; the result lands in chat and the
pips on the card update for everyone. A player who does not own the character sees the pips but
cannot roll.

## Which claims here have been walked

This guide was written from the module's own setting labels and its source, and the behaviour it
describes has not been walked step by step in a running world. The setting names and their options
are quoted from the module's English strings and are accurate for this release. What has not been
verified by hand is the on-screen order of the settings sections and the exact wording Foundry
renders around them.

There are no screenshots of the settings window here on purpose: the two the repository carried were
captured before the settings were reorganised and named controls that no longer exist. A wrong
picture is worse than none.
