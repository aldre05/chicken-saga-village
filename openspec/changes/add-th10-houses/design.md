# Design: 10 Houses, Town Hall to Level 10

## Context
Pure numbers extension — no new systems. By Town Hall level 5, all 6
resources are already unlocked (Rice/Ore need TH5 max, Stone needs
TH3), so every new cost table entry from level 5 onward can freely
use all 6, continuing the "everything matters late-game" pattern
already established in building upgrade costs.

## Goals
- Extend existing mechanisms only — no new gating system
- Keep the resource-variety-in-costs pattern consistent with the rest
  of the game's late-game costs

## Non-Goals
See proposal.md.

## Town Hall Cost Table (extending townHall.js's UPGRADE_COSTS)
```js
export const MAX_TOWN_HALL_LEVEL = 10;

export const UPGRADE_COSTS = {
  1: { egg: 20, feathers: 10 },
  2: { egg: 50, feathers: 30 },
  3: { egg: 100, feathers: 60 },
  4: { egg: 40, feathers: 50, wood: 80 },
  5: { egg: 80, feathers: 70, wood: 100, rice: 60 },
  6: { egg: 150, feathers: 120, wood: 150, rice: 100, stone: 80 },
  7: { egg: 250, feathers: 200, wood: 220, rice: 160, stone: 140, ore: 60 },
  8: { egg: 400, feathers: 320, wood: 350, rice: 260, stone: 220, ore: 120 },
  9: { egg: 650, feathers: 520, wood: 560, rice: 420, stone: 360, ore: 220 }
};
```
(Key = level upgrading FROM, matching the existing table's convention
— key `9` is the cost to reach level 10, the max.)

## House Unlock Gating (extending buildingUnlocks.js's UNLOCK_CONFIG)
```js
house_6:  { requiresTownHall: 6,  cost: { egg: 150, feathers: 100 } },
house_7:  { requiresTownHall: 7,  cost: { egg: 220, feathers: 150 } },
house_8:  { requiresTownHall: 8,  cost: { egg: 320, feathers: 220 } },
house_9:  { requiresTownHall: 9,  cost: { egg: 450, feathers: 300 } },
house_10: { requiresTownHall: 10, cost: { egg: 600, feathers: 420 } }
```

## HOUSE_IDS Array (buildingLevels.js)
```js
export const HOUSE_IDS = [
  'house_1', 'house_2', 'house_3', 'house_4', 'house_5',
  'house_6', 'house_7', 'house_8', 'house_9', 'house_10'
];
```
Everything downstream (population sum, capacity formula, upgrade
cost formula) already iterates this array generically — no other
code changes needed once it's extended.

## Map Placement
5 new 2x2 buildings, same collision-verification process as every
prior building (see world-map spec's standing process note — run the
overlap/solid-tile check script, don't eyeball it).

## Risks / Open Questions
- Costs above are hand-tuned continuations of the existing curve, not
  derived from a formula (the original table wasn't formula-based
  either) — flag for playtesting once real players reach this range.
