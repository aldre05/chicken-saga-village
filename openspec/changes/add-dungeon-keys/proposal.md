# Proposal: Recruit Heroes via Lucky Wheel Only

## Why
Heroes currently recruit for a small flat resource cost
(`RECRUIT_COST = { egg: 15, feathers: 20 }`) directly at the
Barracks — cheap and guaranteed, so heroes aren't scarce. Confirmed
decision: recruitment should come exclusively from the Lucky Wheel
(a free, luck-based mechanic already in the game), making a recruited
hero feel earned/rare rather than a routine purchase.

**Scope note:** this proposal covers the free, in-game-currency-only
version of this idea. A real-money "buy a hero in a shop" path was
also raised in discussion but is explicitly OUT of scope here — see
Non-Goals.

## What Changes
- Remove the direct "Recruit Hero" action/button at the Barracks that
  spends `RECRUIT_COST`.
- Add a new Lucky Wheel `REWARD_TABLE` entry: "Recruit a Hero" —
  landing on it rolls a hero the same way `recruitHero()` already
  does (same `RARITY_TABLE` weights, same class/equipment/HP
  defaults), no separate odds system to build.
- Barracks panel updates to reflect the new source: still shows the
  existing roster + heal/equip UI (all unchanged), but the old
  recruit button/cost display is replaced with a short pointer to the
  Lucky Wheel.

## Non-Goals
- DON'T change hero rarity odds or stats — same `RARITY_TABLE`, just
  reached through a different mechanic.
- DON'T touch the Lucky Wheel's existing ticket-generation/cap system
  — this only adds one new entry to the existing reward table.

## Impact
- Affected specs: hero-system, lucky-wheel
- Affected code: `luckyWheel.js` (new reward-table entry type,
  `spinWheel()`'s reward-application branch), `heroes.js`
  (`recruitHero()` likely needs a variant/refactor that doesn't spend
  `RECRUIT_COST`, since the Lucky Wheel spin already paid its own
  ticket cost — see design.md), `interactionHandlers.js`/`main.js`
  (remove Barracks recruit button + cost display, add roster-full or
  hero-won popup on a wheel spin that lands a hero)
