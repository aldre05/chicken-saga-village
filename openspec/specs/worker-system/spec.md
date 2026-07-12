# Spec: Worker System

## Current State (implemented)
- Population comes entirely from unlocked Houses (see
  building-progression spec) — no other population source.
- Workers are assigned to specific resource buildings via a clickable
  +/- panel (or F/G keyboard shortcuts) that appears when standing
  near an unlocked resource building.
- No worker can be assigned beyond a building's current level-based
  cap, and none can be assigned beyond total village population minus
  already-assigned workers.
- Assign/unassign both "flush" that building's production at the OLD
  worker count before changing it — prevents wrongly backfilling
  idle-worker time at the new (different) rate. This was a real bug
  caught during implementation, not a hypothetical.

## Constraints for future changes
- Worker cap formulas live in `buildingLevels.js`
  (`getMaxWorkers`/house capacity functions) — `workers.js` itself
  only tracks assignment counts, it doesn't own any cap math.
- Any future "worker happiness/skill/specialization" system should
  extend the assignment data shape, not replace it — other systems
  (production, upkeep) key off `workers.assignments[resourceId]`
  directly.
