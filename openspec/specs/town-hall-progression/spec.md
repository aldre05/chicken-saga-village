# Spec: Town Hall Progression

## Current State (implemented)
- **10 levels** (`MAX_TOWN_HALL_LEVEL`, raised from 5 by
  `add-th10-houses` — its `openspec/changes/` folder has been archived
  per this project's standard process). Gates which resources/
  buildings are unlockable at all (see resource-production and
  building-progression specs for exact per-item requirements),
  including Barracks (TH3) and Dungeon Gate (TH4) from the hero/dungeon
  system, and houses 6-10 (TH6-TH10, one new house per level).
- Upgrade cost defined per-level in `townHall.js`'s `UPGRADE_COSTS`
  (hand-tuned table, not a formula — levels 7-9 were added in the same
  hand-tuned style as 1-6, continuing to only cost resources already
  unlocked at the *current* level, per the module's own design
  comment):

  | Level → | Egg | Feathers | Wood | Rice | Stone | Ore |
  |---|---|---|---|---|---|---|
  | 1→2 | 20 | 10 | – | – | – | – |
  | 2→3 | 50 | 30 | – | – | – | – |
  | 3→4 | 100 | 60 | – | – | – | – |
  | 4→5 | 40 | 50 | 80 | – | – | – |
  | 5→6 | 80 | 70 | 100 | 60 | – | – |
  | 6→7 | 150 | 120 | 150 | 100 | 80 | – |
  | 7→8 | 250 | 200 | 220 | 160 | 140 | 60 |
  | 8→9 | 400 | 320 | 350 | 260 | 220 | 120 |
  | 9→10 | 650 | 520 | 560 | 420 | 360 | 220 |

  There is no level-10 entry (`UPGRADE_COSTS[10]` is `undefined`) —
  10 is the cap, nothing costs anything to leave it since you can't.
- Same "separate Upgrade button, never auto-triggered by E" pattern
  as every other levelable building.
- Also unlocks the Lucky Wheel (fixed UI widget) at level 2 —
  automatic, no separate unlock cost.
- Shows "Land Popularity" (see crafting-system spec's popularity
  tie-in) in its dialogue — currently just a number with no mechanical
  effect, intentionally, pending validation that watching it grow
  feels rewarding before attaching bonuses to it.

## Constraints for future changes
- Keep MAX_TOWN_HALL_LEVEL and the cost table centralized in
  townHall.js — several other systems (resource unlocks, house
  slots, Barracks/Dungeon Gate gates, Lucky Wheel) read
  `gameState.townHall.level` directly, so changing the level range
  affects all of them.
- Any new per-level cost entry should keep following the "only
  resources already unlocked at that level" rule the existing table
  follows — `test/townHall.test.js` has a generic test enforcing this
  across every entry, not just the ones added so far.
