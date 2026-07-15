# Design: Town Hall Progression + 4-Resource Economy + Crafting

## Context
Extends the existing resource-production spec (currently just the Old
Coop/eggs) into a generalized multi-resource system, gated by a new
Town Hall building. Adds crafting as a first consumer of resources,
and a non-monetary popularity stat to prototype the "market your land"
social dynamic without any real economic stakes.

## Goals
- Generalize resource production so adding a 5th, 6th resource later
  is additive (new config entry + building), not a rewrite
- Town Hall gates progression in a way that feels earned, not just a
  number going up
- Crafting gives resources a purpose beyond quest turn-ins
- Land Popularity captures the "why market your land" dynamic as a
  free, single-player-safe stat

## Non-Goals
- No multiplayer, no NFTs, no marketplace (see proposal.md)

## Resource System (generalized)

Replace the Old-Coop-specific logic in resources.js with a config-
driven system:

```js
export const RESOURCE_CONFIG = {
  egg:      { name: 'Egg',      rate: 0.5, cap: 30, unlockedAtTownHall: 1 },
  feathers: { name: 'Feathers', rate: 0.3, cap: 20, unlockedAtTownHall: 1 },
  wood:     { name: 'Wood',     rate: 0.2, cap: 20, unlockedAtTownHall: 4 },
  grain:    { name: 'Grain',    rate: 0.2, cap: 20, unlockedAtTownHall: 5 }
};
```

Each producing building maps 1:1 to a resource id and reuses the same
timestamp-based accumulation function (generalized from
`collectFromCoop` → `collectFromBuilding(resourceId, buildingState, now)`).

Resource state becomes a dict rather than a single `carriedEggs`
field:
```js
resources: {
  carried: { egg: 0, feathers: 0, wood: 0, grain: 0 },
  totalCollected: { egg: 0, feathers: 0, wood: 0, grain: 0 },
  buildingLastCollectedAt: { egg: <ts>, feathers: <ts>, wood: <ts>, grain: <ts> }
}
```
(Quest logic from the previous change already reads `carriedEggs`/
`totalEggsCollected` — this change updates quests.js to read
`carried.egg`/`totalCollected.egg` instead, no quest behavior changes.)

## Town Hall

5 levels. Upgrade cost is consumed (spent) resources, using only
resources already unlocked at the *current* level (so a level-3→4
upgrade can't require wood, since wood only unlocks upon reaching 4):

| Upgrade | Cost | Unlocks |
|---|---|---|
| 1 → 2 | 20 egg, 10 feathers | — |
| 2 → 3 | 50 egg, 30 feathers | — |
| 3 → 4 | 100 egg, 60 feathers | Wood (Woodshed building) |
| 4 → 5 | 40 egg, 50 feathers, 80 wood | Grain (Grain Store building) |

Interacting with the Town Hall shows current level, progress toward
next level's cost, and triggers the upgrade if affordable (same
"walk up, press E" pattern as everything else).

## Crafting

Fixed recipe list for this change (more can be added later, purely
additive):

| Item | Recipe | Unlocked at |
|---|---|---|
| Nest Charm | 2 egg + 2 feathers | Town Hall 1 (day one) |
| Basket | 3 egg + 2 wood | Town Hall 4 |
| Feed Mix | 2 feathers + 2 grain | Town Hall 5 |

Crafting happens at a new "Workbench" interactable (reuses the
building-slot pattern from map.js). Crafted items go into a simple
inventory dict (`{ itemId: count }`) — no selling, no NFTs, just
storage for now. Each successful craft increments Land Popularity
(see below).

## Land Popularity (non-monetary prototype)

- A single stat, `popularity`, incremented by 1 per successful craft
  action.
- Displayed at the Town Hall on interact: "Your land popularity: N —
  keep crafting to grow your reputation!"
- No decay, no multiplayer visibility in this change — purely there
  to test, with real players, whether "watching a popularity number
  grow from activity" feels motivating before any real economic
  system gets built on top of it.

## Persistence
Extends the existing localStorage schema (gameState.js) with
`resources.carried`/`totalCollected`/`buildingLastCollectedAt` (now
dicts), `townHall: { level }`, `inventory: {}`, `popularity: 0`.

## Risks / Open Questions
- Generalizing resources.js touches code the quest system already
  depends on — quests.js needs a small update to read the new dict
  shape. Flagged as a task, not expected to be risky, but worth
  testing the full quest chain again after this change.
- Land Popularity is genuinely just a number with no mechanical
  effect yet (no bonuses tied to it). That's intentional for this
  change — validate the "does watching it grow feel good" question
  before attaching any bonus/reward logic to it.
