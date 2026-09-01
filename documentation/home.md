# Coffee Pub Crier

**Audience:** everyone -- players, GMs, and contributors.

Crier narrates combat in chat. It posts a card when a fight begins, when each round turns over, when
each combatant's turn comes up, and when the fight ends, and it can carry the combatant's health,
ability scores, conditions and death saves on the turn card. Crier requires
[Coffee Pub Blacksmith](https://github.com/Drowbe/coffee-pub-blacksmith), which supplies the card
themes, icons and sounds it draws on.

![A Crier turn card: portrait, health bar, ability scores, conditions and this turn's penalties](assets/crier-turn-full.webp)

This page routes. Each section points at the document that answers the question rather than
answering it here.

## Using Crier at the table

Start with [getting started](userguides/userguide-getting-started.md) -- what appears the moment the
module is enabled, and why the first cards of a fight wait for initiative.

Then, by what you want to do:

- [Turn cards](userguides/userguide-turn-cards.md) -- what is on a card, how it changes as a
  character goes down, and the two layouts.
- [Combat and round announcements](userguides/userguide-announcements.md) -- the cards that mark the
  shape of a fight rather than a single turn.
- [Themes, icons and wording](userguides/userguide-appearance.md) -- what the cards look like and
  what they say.
- [Sounds](userguides/userguide-sounds.md) -- the four sounds, and how to silence any of them.
- [Settings](userguides/userguide-settings.md) -- every control, by its on-screen name.

And by who you are:

- [For players](userguides/userguide-player.md) -- what you see, and rolling a death save from your
  card.
- [For GMs](userguides/userguide-gm.md) -- deciding who sees what, hiding monster names, missed-turn
  reminders, and which client posts.

## Working on Crier itself

[The architecture document](architecture/architecture-crier.md) covers how Crier decides what to
announce and when -- the hold-and-release rules that keep a card from posting before initiative has
settled, how a card is composed from Blacksmith parts, and which behaviour is resolved per reader
rather than baked into the posted card.

## Known issues

Defects that are real and unfixed are in [known issues](known-issues.md).
