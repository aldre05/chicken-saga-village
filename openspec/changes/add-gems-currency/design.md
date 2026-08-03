# Design: Gems (Premium Currency)

## Context
New standalone currency, not layered onto `resources` or `inventory`
— see proposal.md for why. Every spend use-case in scope here is a
straightforward "check gems >= cost, subtract, grant thing" pattern,
same shape as every existing cost-check in this codebase
(`canAfford`/`spendResources` in `resources.js`,
`canAffordRecipe`/`craftSpecific` in `crafting.js`) — this should
follow that exact precedent, not invent a new pattern.

## Goals
- Working, testable Gems economy today, without pretending the
  real-money half is solved.
- Every spend path reuses this project's existing
  check-then-commit function pair pattern.

## Non-Goals
See proposal.md — most importantly, no real-money purchase code.

## Data Model
```js
// gameState.js — new top-level field alongside resources/inventory
gems: 0
```
Simple integer, no sub-structure needed (no "gem types," just one
currency) unless a future decision splits it.

## Spend Use-Cases (this proposal only)
```js
// dungeons.js — buy a key directly with gems (alternative to
// crafting one or winning one on the wheel)
export const DUNGEON_KEY_GEM_COST = 25; // placeholder, needs tuning
export function canBuyDungeonKeyWithGems(gems) {
  return gems >= DUNGEON_KEY_GEM_COST;
}

// heroes.js — buy a hero roll with gems, same rarity table as the
// free wheel-based recruit path
export const HERO_ROLL_GEM_COST = 100; // placeholder, needs tuning
export function buyHeroRollWithGems(gemsState, rosterState) {
  if (gemsState.gems < HERO_ROLL_GEM_COST) return false;
  gemsState.gems -= HERO_ROLL_GEM_COST;
  rosterState.roster.push(createRolledHero()); // from add-recruit-via-lucky-wheel
  return true;
}

// resources.js — gems-to-resource exchange, flat rate across all 6
// resources for simplicity (see Open Questions on whether that's
// actually desired)
export const GEM_TO_RESOURCE_RATE = 10; // 1 gem = 10 of any resource, placeholder
```
All placeholder numbers — this design doc is establishing the
*shape* of each function, not the final balance. Whoever implements
this should treat every number above as a starting point for
playtesting, not a spec to match exactly.

## Free-Earn Placeholder
```js
// luckyWheel.js REWARD_TABLE — new entry
{ resource: 'gems', amount: 5, weight: 6, color: '#4fc9c9' }
```
Small amount, moderate-low weight — enough that the currency has a
working loop to test against without gems flooding in fast enough to
undercut the "buy with real money" value proposition once that
exists later.

## Risks / Open Questions
- **Exchange rates (25 gems/key, 100 gems/hero-roll, 10:1
  gem:resource) are all unvalidated placeholders** — need real
  playtesting once the real-money purchase question (proposal.md's
  Architecture Gap) is answered, since "how much is a gem worth"
  only makes sense relative to an actual $-to-gem conversion rate
  that doesn't exist yet. Don't treat these as final.
- Flat gems-to-resource rate across all 6 resources, or should
  scarcer resources (ore/stone, gated behind higher-tier buildings)
  cost more gems than common ones (egg/feathers)? Flagged, not
  decided.
- Should the free-earn placeholder (Lucky Wheel gem reward) get
  removed/reduced once real-money purchases ship, to protect the
  currency's value? Worth deciding then, not now — noting it exists
  as a future consideration, not blocking this proposal.
