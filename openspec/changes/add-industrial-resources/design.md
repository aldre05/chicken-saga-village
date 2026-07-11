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
EGG_UPKEEP_PER_WORKER_PER_MINUTE = 0.5
New `upkeep.js` module, timestamp-based accrual (same offline-safe
pattern as resource production):
```js
function applyUpkeep(upkeepState, resourceState, workerState, now) {
  const elapsedMinutes = (now - upkeepState.lastCheckedAt) / 60000;
  const totalAssigned = getTotalAssigned(workerState);
  const consumed = Math.floor(elapsedMinutes * totalAssigned * EGG_UPKEEP_PER_WORKER_PER_MINUTE);
  if (consumed > 0) {
    resourceState.carried.egg = Math.max(0, resourceState.carried.egg - consumed);
    upkeepState.lastCheckedAt = now;
  }
}
```
Called once per frame in the main loop (cheap check, only actually
deducts once enough time has passed to consume ≥1 egg). Egg is
clamped at 0 — never goes negative. **No consequence for hitting 0
yet** — that's explicitly deferred pending a proper design pass on
what "unfed workers" should actually do (production penalty? Something
else?). Shown in the HUD egg tooltip once egg reaches 0, so players
at least see it's happening.

## Feathers

No functional change in this proposal. Documented intent only:
feathers become hero-crafting material once a hero system exists.
Revisit when that system is actually designed.

## Risks / Open Questions
- Upkeep rate (0.5 egg/worker/min) is a guess — will need real
  playtesting once population reaches the 40-50 range, where the
  drain compounds fast. Flagged for tuning, not blocking.
- Ore's unlock cost requiring stone (30) means Mine can't be unlocked
  the same session Quarry is, by design (keeps ore feeling like a
  genuine "later" resource) — confirm this pacing feels right once
  playtested, not just reasoned about on paper.
