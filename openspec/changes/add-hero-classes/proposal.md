# Proposal: Hero Classes + Equipment

## Why
Unblocks the Workbench-rework request (consumables/gear) — classes
need to exist before "class-dependent gear" means anything.

## What Changes
- Each hero gets a `class` field, assigned at recruitment (random,
  independent of rarity).
- 3 classes: Warrior, Archer, Scholar. Each has a weapon-type
  restriction; armor and boots are universal.
- Equipment: 3 slots per hero (weapon, armor, boots). Equipped items
  add flat power. Workbench crafts the equipment — this is also what
  finally gives Plank/Ingot/Brick a purpose.

## Non-Goals
- DON'T add class-specific abilities — classes only gate weapon type.
- DON'T add a re-roll/change-class mechanic.
- DON'T let equipment be tradeable/sellable (same boundary as
  everything else).

## Impact
- Affected specs: hero-system, crafting-system
- Affected code: heroes.js (class field, equipment slots, power
  calc), crafting.js (new equipment recipes), main.js (hero panel
  equip UI)
