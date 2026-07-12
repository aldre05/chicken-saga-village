# Spec: Town Hall Progression

## Current State (implemented)
- 5 levels, gates which resources/buildings are unlockable at all
  (see resource-production and building-progression specs for exact
  per-item requirements).
- Upgrade cost defined per-level in `townHall.js`'s `UPGRADE_COSTS`
  (hand-tuned table, not a formula, since only 5 levels exist).
- Same "separate Upgrade button, never auto-triggered by E" pattern
  as every other levelable building.
- Also unlocks the Lucky Wheel (fixed UI widget) at level 2 —
  automatic, no separate unlock cost.
- Shows "Land Popularity" (see quest-board spec's crafting tie-in) in
  its dialogue — currently just a number with no mechanical effect,
  intentionally, pending validation that watching it grow feels
  rewarding before attaching bonuses to it.

## Constraints for future changes
- Keep MAX_TOWN_HALL_LEVEL and the cost table centralized in
  townHall.js — several other systems (resource unlocks, house
  slots, Lucky Wheel) read `gameState.townHall.level` directly, so
  changing the level range affects all of them.
