# Spec: Building Progression (Unlock + Leveling)

## Current State (implemented)

### Unlocking
Every building except the starting Old Coop and House 1 must be
unlocked: a one-time resource cost, gated by a minimum Town Hall
level, defined per-building in `buildingUnlocks.js`'s
`UNLOCK_CONFIG`. Mine is deliberately gated behind having Stone on
hand (its unlock cost includes stone), so it can't be unlocked the
same session as Quarry.

**Unlocking is a deliberate button-click, matching the Upgrade
pattern below — not triggered by E-press.** Earlier versions
auto-unlocked on interact, the same pattern the Upgrade flow used to
have and was fixed away from for the same reason: unlocking a
building is a resource-spending decision and shouldn't happen from a
single accidental keypress. Standing near any locked building/house
now shows a persistent requirements panel:
- Below the building's own Town Hall gate: panel shows "Requires Town
  Hall level N" and the Unlock button is disabled — no cost is shown
  yet, since it isn't actionable.
- At or above the gate: panel shows "Meets Town Hall requirement" and
  the unlock cost (via the same `formatCostHTML` used for upgrades,
  including red highlighting for any resource the player can't
  currently afford), with the Unlock button enabled once affordable.

Pressing E on a locked building now only shows informational dialogue
(current Town Hall requirement, or unlock cost once the requirement's
met) — it never unlocks anything by itself.

### Leveling (unbounded for resource buildings, capped for houses)
Resource buildings (Old Coop, Nest Bundle, Woodshed, Rice Paddy,
Quarry, Mine) level up with no ceiling. Each level:
- +4 worker slots (from a base of 3), capped at 50 max per building
- Rate bonus per the tiered formula (see resource-production spec)
- Storage cap bonus per the steeper compounding formula

Houses level 1-5 only, each level adding +3 worker capacity (base 3,
capped at 15 per house — bumped from a max of 10 after the
resource-building count grew from 4 to 6 with Quarry/Mine, to keep
population headroom scaling with how many buildings there are to
staff). 5 houses × 15 = 75 max village population.

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

**Upgrade cost is a pure function of the building's own level only —
never reactive to unrelated game state.** An earlier version computed
this by scanning which resources were unlocked at the player's
*current* Town Hall level on every call, which meant a building
already fixed at some level could suddenly demand a brand-new
resource type the instant something unrelated elsewhere in the
village (a different building leveling, or a new resource unlocking)
crossed that resource's Town Hall threshold — with zero further
leveling on the building itself. Fixed by replacing the live
Town-Hall scan with a fixed, deterministic rotation keyed only to the
building's own level (`getUpgradeCost(buildingId, buildingLevels)`
takes no Town Hall argument at all anymore): every 5 levels, one more
resource type is added, picked in a fixed order from the resources
not already in the building's base cost. Calling it twice at the same
level always returns the identical cost.

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
- Upgrade (and unlock) costs must stay pure functions of the
  building's own level/lock state — never derive a cost by scanning
  live, unrelated game state (see the Town-Hall-reactive bug above).
  If a cost genuinely needs to react to global progression, that
  needs a deliberate design discussion, not an incidental dependency.
