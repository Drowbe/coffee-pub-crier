# Crier for GMs

**Audience:** the GM running the table.

The decisions only you can make: who sees what on a card, whether monsters are named, and what Crier
tells you that it does not tell the table.

## Decide who sees what

Four blocks on the turn card each carry an audience rather than an on/off switch: **Show Health**,
**Show Ability Scores**, **Show Status & Conditions** and **Show Turn Penalties**.

![The Turn Card Content settings: Portrait Image, NPC Name Visibility, Show Portrait Blood, Show Health, Show Ability Scores, Show Status and Conditions, and Show Turn Penalties](../assets/crier-settings-turn-content.webp)

Each offers:

- **Do Not Show** -- nobody's cards carry it.
- **Players** -- player characters' cards carry it; monsters' do not.
- **NPCs and Monsters** -- the reverse.
- **Players, NPCs, and Monsters** -- everyone's do.

**This is about whose CARD carries the block, not who is allowed to look at it.** A card is posted
once and everybody reads the same one, so setting **Show Health** to *Players* does not hide a
monster's health from the party -- it means a monster's card never had a health bar in the first
place. There is no per-player version of a card.

The usual setup is *Players* for health and ability scores and *Players, NPCs, and Monsters* for
conditions: the party tracks its own numbers, and everyone can see that the ogre is frightened
without seeing how much fight is left in it.

**Show Portrait Blood** has no audience of its own and follows **Show Health**. If a monster's card
carries no health bar, it carries no blood either -- worth knowing if you were relying on a
splattered portrait to telegraph a wounded enemy.

Penalties are the block worth showing on monsters even when health is hidden. It tells the table that
the enemy is fighting at a penalty without telling them how close it is to dropping:

![An NPC turn card for a Cultist: portrait and turn penalties, with no health bar and no ability scores](../assets/crier-turn-npc.webp)

## Hide monster names

**NPC Name Visibility** decides whether a monster's real name reaches the players:

- **Show names for everyone** -- no hiding.
- **Only show player owned names** -- only combatants a player owns are named.
- **All token names visible** -- the token's name is used.
- **Player owned or token name visible** -- either of the two above.

A hidden name reads as `???` on the players' side. You continue to see the real name on your own
screen, on the same card. That last part is described from how Crier is built rather than from
someone having checked it with a player logged in, so confirm it before relying on it to keep a
monster's identity secret.

## Catch a missed turn

**Missed Turn Reminders**, under **Missed Turns**, tells you when a combatant looks to have been
skipped:

- **Do Not Remind** -- off.
- **Chat Card Only** -- a card in chat.
- **Chat Card and Notification** -- a card plus a pop-up notification.

**The reminder is whispered to the GMs alone.** Players never see it, so acting on it is your call
and nobody at the table knows it fired.

## Know which client is posting

Crier posts each table-wide card from one GM client only -- the senior active GM -- so a table with
two GMs logged in does not get doubled cards. Posted cards are also kept current from that same
client: when a character takes damage or rolls a death save, the bar, the pips and the blood update
on everyone's screen without anything being reposted.

If you are the only GM, none of this needs thinking about. It matters when a second GM joins or
drops mid-session: announcements follow the senior one.

## When cards do not arrive

Crier holds every card until combat has started and every combatant has a finite initiative. A quiet
tracker usually means someone has not rolled -- including a combatant added mid-fight.

If everyone has rolled and cards still do not come, that is a defect rather than the rule; see
[known issues](../known-issues.md).
