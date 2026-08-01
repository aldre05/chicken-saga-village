# Design: Dungeon Keys (Consumable Run Gate)

## Context
Extends dungeon-system (the send gate) and crafting-system (a new
recipe). Doesn't touch resolution math (success/failure/reward) at
all — purely an additional precondition on *sending* a hero.

## Goals
- Make dungeon access meaningfully scarce, not just resource-gated
  (resources regenerate passively over time; keys should require
  deliberate investment or luck).
- Two acquisition paths (craft + Lucky Wheel) so key supply doesn't
  become a hard bottleneck tied to a single resource combo.
- Zero change to existing dungeon economics (entry cost, rewards, XP,
  failure/downed mechanics) — purely additive.

## Non-Goals
See proposal.md.

## Item Config
```js
// crafting.js RECIPES — new entry
{ id: 'dungeon_key', name: 'Dungeon Key', cost: { wood: 20, stone: 20, ore: 10 } }
```
Recommends the three "industrial" resources (wood/stone/ore) rather
than egg/feathers — keeps the key tied to the refined-goods lane
per this project's existing resource role split (Decisions:
"Rice/Wood/Stone/Ore = industrial raw→refined lane"), and keeps it
separate from the entryCost's egg/feathers so the two gates draw from
different resource pools.

```js
// luckyWheel.js REWARD_TABLE — new entry
{ resource: 'dungeon_key', amount: 1, weight: 5, color: '#7a4fc9' }
```
Weight 5 is deliberately low relative to the existing 8-30 range —
a key should feel like a notably good spin outcome, not a common one.
**Note:** `spinWheel()`'s reward-application code
(`resourceState.carried[...] += amount`) currently assumes every
reward lands in `resourceState`, not `inventoryState` — a key reward
needs its own small branch there since it's an inventory item, not a
raw resource (same resource-vs-item distinction crafting.js's
`splitCost()` already draws).

## Send Gate Change
```js
// dungeons.js
export const DUNGEON_KEY_ITEM_ID = 'dungeon_key';

export function canSendHeroToDungeon(hero, tierId, resourceState, inventoryState, now) {
  const tier = getDungeonTier(tierId);
  if (!hero || !tier) return false;
  if (!isHeroIdle(hero, now)) return false;
  if (isDowned(hero)) return false;
  if ((inventoryState[DUNGEON_KEY_ITEM_ID] || 0) < 1) return false;
  return canAfford(resourceState, tier.entryCost);
}

export function sendHeroToDungeon(hero, tierId, resourceState, inventoryState, now) {
  if (!canSendHeroToDungeon(hero, tierId, resourceState, inventoryState, now)) return false;
  const tier = getDungeonTier(tierId);
  spendResources(resourceState, tier.entryCost);
  inventoryState[DUNGEON_KEY_ITEM_ID] -= 1;
  hero.busyUntil = now + tier.durationMs;
  hero.dungeonTier = tierId;
  return true;
}
```
**Signature change, not additive-only** — both functions gain a new
required `inventoryState` param. Every existing call site (dungeon
panel Send button, any test coverage) needs updating, same precedent
as `getCraftableRecipes`'s signature change in add-hero-classes.

## Resolution — Key Is Spent Regardless of Outcome
The key is consumed at *send* time (see above), before resolution
runs. A failed mission still cost the key — this is deliberate, not
an oversight: the scarcity/risk is in committing the key to a run,
same spirit as the entry cost already being non-refundable on
failure. Resolution itself (`resolveDungeon`) is completely
unchanged.

## Risks / Open Questions
- One universal key vs. per-tier keys: starting with one universal
  key for simplicity. If Hard-tier runs turn out to feel too
  accessible relative to their reward value, splitting into
  tier-specific keys (`dungeon_key_easy/medium/hard`) is a
  straightforward follow-up, not a redesign.
- Starting supply: should a new save start with 0 keys (first key
  must be earned) or a small starter stock (e.g. 1-2) so a new player
  isn't blocked from ever seeing a dungeon run before their first
  craft/spin? Flagging for a decision before Backend starts — not
  assuming either way.
