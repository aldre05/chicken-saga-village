# Design: Building Unlock/Upgrade Rework + Onboarding + QoL

## Context
Extends the resource-production and interaction-system specs. The
current flat "everything is free and available" state doesn't give
players anything to work toward beyond Town Hall — this adds real
per-building progression, at the cost of more systems to keep in sync
(worker caps, rates) as buildings level up.

## Goals
- Every building past the starter Old Coop feels like a real unlock,
  not a freebie
- Building levels matter — visibly more workers, visibly more
  production
- Reduce tedium (auto-claim) now that there are more buildings to
  manage
- Farmer Joe teaches new players the loop instead of just tracking
  one quest
- Market Stall's removal doesn't lose functionality — it folds into
  Farmer Joe

## Non-Goals
- No new resource types or buildings (see proposal.md)
- No changes to Town Hall's own upgrade cost table

## Building Unlocking

Old Coop stays free/pre-unlocked (the player needs *something*
producing from second one, or there's no way to earn the first
unlock cost). Everything else requires walking up + spending
resources, gated by Town Hall level:

| Building | Requires Town Hall | Unlock Cost |
|---|---|---|
| Nest Bundle | 1 | 10 egg |
| Workbench | 2 | 20 egg, 15 feathers |
| Woodshed | 4 | 60 egg, 30 feathers |
| Grain Store | 5 | 80 egg, 60 feathers, 30 wood |

Interacting with a locked building shows the requirement (Town Hall
level and/or cost) and unlocks it immediately if both are met —
same "walk up, press E" pattern as everything else, no separate
confirm step.

## Building Leveling (unbounded)

Each resource building (Old Coop, Nest Bundle, Woodshed, Grain Store)
has its own `level`, starting at 1 once unlocked. No level cap.

```
maxWorkersForBuilding(level) = 2 + (level - 1) * 1   // +1 worker slot/level
rateMultiplierForLevel(level) = 1 + (level - 1) * 0.15  // +15% rate/level
```

Upgrade cost scales per building, using a mix of egg + that
building's own resource (keeps egg relevant as a universal cost
throughout the game):

```
cost(level) = baseCost * 1.3 ^ (level - 1)
```

| Building | Base upgrade cost |
|---|---|
| Old Coop | 20 egg |
| Nest Bundle | 15 egg, 10 feathers |
| Woodshed | 20 egg, 15 wood |
| Grain Store | 25 egg, 15 grain |

Total effective production:
```
effectiveRate = baseRate * rateMultiplierForLevel(level) * (1 + assignedWorkers * 0.05)
```
(worker bonus formula unchanged from the previous change)

## Auto-Claim

A HUD button, always visible, collects from every *unlocked* resource
building at once (regardless of player position), using the same
`collectFromBuilding` logic per building. Shows one summary popup
(e.g. "+12 🥚 +8 🪶") rather than one per building.

## Rate + Time Visibility

- Each resource building's interact prompt/dialogue now shows
  `rate/min` (effectiveRate * 60), not just current stored amount.
- House construction shows both percentage AND seconds remaining in
  the live prompt (dialogue already showed seconds; this extends it
  to the walk-by prompt too).

## House Slots (gated like resource buildings)

5 house slots, each gated by Town Hall level (not by cost growth
alone — that stays too, per workers.js's existing exponential cost):

| House # | Requires Town Hall |
|---|---|
| 1 | 1 |
| 2 | 1 |
| 3 | 2 |
| 4 | 3 |
| 5 | 4 |

Attempting to build past your current Town Hall level's allowance
shows "Requires Town Hall level N" instead of the cost.

## Market Stall Removal + Farmer Joe Onboarding

Market Stall and its handler are deleted. The old 2-quest chain
(collect 10 → deliver 10) is replaced by a linear, state-checked
tutorial sequence — no separate "turn in" location needed, since each
step just checks whether the player has already done the thing
elsewhere:

```js
const TUTORIAL_STEPS = [
  { check: gs => gs.resources.totalCollected.egg > 0,
    text: "Walk up to the Old Coop and press E to collect your first eggs!" },
  { check: gs => gs.buildingUnlocks.nest_bundle,
    text: "Nice! Use those eggs to unlock the Nest Bundle." },
  { check: gs => gs.workers.houses >= 1,
    text: "Build a House so you can put workers to work." },
  { check: gs => Object.values(gs.workers.assignments).some(n => n > 0),
    text: "Assign a worker to a resource building — stand near one and press F." },
  { check: gs => gs.townHall.level >= 2,
    text: "Upgrade your Town Hall to unlock more buildings and resources." },
  { check: gs => Object.keys(gs.inventory).length > 0,
    text: "Try crafting something at the Workbench!" }
];
```
Farmer Joe always shows the first step whose `check()` is still
false. Once all pass, he shows a closing "you've got the hang of it"
message. This is stateless/derived — no separate progress tracking
needed, it just reads existing game state.

## Persistence
Extends gameState.js schema with `buildingUnlocks: {}` (bool per
building id) and `buildingLevels: {}` (int per resource building id,
default 1). `quests` field becomes unused by this change but left in
the schema for backward compatibility with existing saves (harmless
dead data, not worth a migration step for this).

## Risks / Open Questions
- Per-building worker caps replace the old flat
  MAX_WORKERS_PER_BUILDING=10 — existing saves with workers already
  assigned above a new lower level-1 cap (2) need a graceful
  clamp-down, not a crash. Task added to handle this.
- Unbounded levels mean unbounded upgrade costs — no explicit balance
  testing beyond early levels in this change; flag for future tuning
  once real playtesting happens at higher levels.
