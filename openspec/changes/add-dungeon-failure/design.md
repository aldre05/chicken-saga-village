# Design: Dungeon Failure Consequences

## Context
Extends hero-system and dungeon-system. Only change to the resolution
math itself: failure outcome. Success path is untouched.

## Goals
- Real risk on failure, without permanent loss
- Healing cost that scales with investment (rarity) so higher-rarity
  heroes carry proportionally higher stakes
- Reward visibility before commitment — player should see risk vs.
  reward in the same view

## Non-Goals
See proposal.md.

## Healing Cost
```js
export const HEAL_COST_BASE = { egg: 30, feathers: 20 };
export const HEAL_COST_RARITY_MULTIPLIER = {
  common: 1,
  rare: 2,
  epic: 4
};

export function getHealCost(hero) {
  const mult = HEAL_COST_RARITY_MULTIPLIER[hero.rarity];
  return {
    egg: HEAL_COST_BASE.egg * mult,
    feathers: HEAL_COST_BASE.feathers * mult
  };
}
```

## Data Model
```js
{
  // ...existing hero fields (id, name, rarity, level, xp, busyUntil)...
  currentHp: 25   // starts at maxHp for rarity (from existing hp
                   // column in the rarity table), drops to 0 on
                   // dungeon failure, restored to maxHp on heal
}
```

## Resolution Change
```js
// dungeons.js — resolveDungeon(), failure branch only:
if (hero.effectivePower < tier.difficulty) {
  hero.currentHp = 0;
  return { success: false, reward: {}, xp: 0 };
  // (was: 50% reward + 50% xp — removed per this proposal)
}
```

## Downed State
`isDowned(hero) = hero.currentHp <= 0`. Roster UI shows downed heroes
visually distinct (e.g. greyed out), send-to-dungeon disabled, heal
action available.

## Dungeon Panel Reward Preview
Alongside existing entry-cost display, add: tier's full `reward` +
`xp` values (already exist in `DUNGEON_TIERS` config — this is a UI
surface change, not a new data need).

## Risks / Open Questions
- Heal cost multipliers (1/2/4x) are a first guess — flag for
  playtesting once real rarity distribution is visible.
