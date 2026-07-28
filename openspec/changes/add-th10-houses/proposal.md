# Proposal: 10 Houses, Town Hall to Level 10

## Why
Confirmed decision: double both caps. Existing "1 house per Town Hall
level" pattern extends cleanly — no new mechanic, just more of one.

## What Changes
- `MAX_TOWN_HALL_LEVEL`: 5 → 10, with 5 new cost table entries.
- 5 new houses (`house_6`-`house_10`), same pattern as existing ones.
- Max village population: 10 houses × 15 = 150 (up from 75).
- New map placements for 5 more houses, collision-verified.

## Non-Goals
- DON'T introduce new resource types/buildings at TH6-10 — the prize
  for these levels is purely more houses/population.
- DON'T change per-house capacity formula (still 3/6/9/12/15).
- DON'T change Barracks/Dungeon Gate's existing TH3/TH4 gates.

## Impact
- Affected specs: town-hall-progression, building-progression,
  world-map
- Affected code: townHall.js (cost table), buildingUnlocks.js (house
  configs), buildingLevels.js (HOUSE_IDS array), map.js (5 new
  buildings)
