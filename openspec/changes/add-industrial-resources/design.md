# Design: Industrial Resources

## Context
Extends resource-production and crafting-system. Reuses every existing
pattern (production buildings, crafting panel) rather than inventing
new systems — the only genuinely new mechanic here is egg upkeep.

## Goals
- Rice/Wood/Stone/Ore → refined goods, using infrastructure that
  already exists (production buildings + crafting panel)
- Give egg and feathers real, distinct jobs instead of just being two
  more industrial resources
- Keep the HUD from getting overcrowded — refined goods live in
  inventory, not the main resource strip

## Non-Goals
See proposal.md — no upkeep penalty yet, no hero system yet, no use
for refined goods yet beyond existing.

## Resource Rename: grain → rice

`RESOURCE_CONFIG.grain` becomes `RESOURCE_CONFIG.rice` (same rate/cap/
unlockedAtTownHall as before — this is a rename, not a rebalance).
The `grain_store` building becomes `rice_paddy` (id renamed for
clarity going forward). Old saves migrate: `resources.carried.grain`
→ `carried.rice`, `buildingUnlocks.grain_store` → `rice_paddy`,
`buildingLevels.grain_store` → `rice_paddy`, same pattern as every
prior migration in gameState.js.

## New Raw Resources: Stone, Ore

Same shape as every existing resource — added to RESOURCE_CONFIG:
```js
stone: { name: 'Stone', icon: '🪨', rate: 0.2, cap: 300, unlockedAtTownHall: 3 },
ore:   { name: 'Ore',   icon: '⛏️', rate: 0.15, cap: 300, unlockedAtTownHall: 5 }
```
(icons picked from Unicode 9.0/2016 or earlier — same font-compatibility
reasoning as the egg/feathers/wood fix)

Two new buildings, identical pattern to existing production buildings
(worker-assigned, levelable, unlock-gated):
- **Quarry** (stone) — unlock requires Town Hall 3, cost ~{egg: 40, feathers: 20}
- **Mine** (ore) — unlock requires Town Hall 5, cost ~{egg: 100, feathers: 60, stone: 30}
  (ore is the rarest/latest resource, gated behind having stone first)

Placed in the existing resource cluster (top-right of map), verified
via the same collision-check process used for every prior building.

## Refined Goods: crafted, not produced

Refined goods are **not** a new production-building category — they're
new Workbench recipes, using the exact same `craftSpecific()` flow
already built for Nest Charm/Basket:

```js
{ id: 'chicken_feed', name: 'Chicken Feed', cost: { rice: 5 } },
{ id: 'plank',        name: 'Plank',        cost: { wood: 5 } },
{ id: 'brick',        name: 'Brick',        cost: { stone: 5 } },
{ id: 'ingot',        name: 'Ingot',        cost: { ore: 5 } }
```

Output goes to `gameState.inventory`, same as every existing crafted
item. The old `feed_mix` recipe (feathers+grain) is removed — Chicken
Feed now fills that conceptual slot properly.

## Egg Upkeep

Each **assigned** (not idle) worker consumes a small amount of egg
over time, village-wide (not per-building):
