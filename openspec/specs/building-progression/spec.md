# Spec: Building Progression (Unlock + Leveling)

## Current State (implemented)

### Unlocking
Every building except the starting Old Coop and House 1 must be
unlocked: walk up, press E, pay a one-time resource cost, gated by a
minimum Town Hall level. Defined per-building in
`buildingUnlocks.js`'s `UNLOCK_CONFIG`. Mine is deliberately gated
behind having Stone on hand (its unlock cost includes stone), so it
can't be unlocked the same session as Quarry.

### Leveling (unbounded for resource buildings, capped for houses)
Resource buildings (Old Coop, Nest Bundle, Woodshed, Rice Paddy,
Quarry, Mine) level up with no ceiling. Each level:
- +4 worker slots (from a base of 3), capped at 50 max per building
- Rate bonus per the tiered formula (see resource-production spec)
- Storage cap bonus per the steeper compounding formula

Houses level 1-5 only, each level adding +2 worker capacity (base 2,
capped at 10 per house). 5 houses × 10 = 50 max village population.

**Upgrading is always a separate, deliberate action** — a dedicated
Upgrade button in the building panel, never triggered by E-press.
E-press only collects/interacts; this was a deliberate fix after
early versions auto-upgraded on interact, which felt wrong to the
developer.

### Upgrade cost scaling
`cost(level) = baseCost * 1.3^(level-1)`, and starting at level 6,
one additional resource type joins the cost every 5 levels
(cycling through types the building doesn't already require) — keeps
all 6 resources relevant late-game instead of only the original 1-2.

### Insufficient-cost UI
Any resource amount in a displayed cost that the player can't afford
shows in red (`.cost-insufficient` CSS class) — added after a
developer bug report that turned out to be "1 resource short," not a
missing-requirement bug, but exposed that shortfalls were hard to
spot at a glance.

## Constraints for future changes
- New buildings should default into this same
  unlock-then-level-then-upgrade-via-button pattern unless there's a
  specific reason not to (Lucky Wheel is the one exception — it's a
  fixed UI widget, not a walkable/levelable building, by design).
- Keep upgrade math in `buildingLevels.js` — don't scatter cost
  formulas into UI code.
