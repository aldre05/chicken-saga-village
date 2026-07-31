# Tasks: Hero Classes + Equipment

## Backend Engineer
- [x] 1.1 Add `class` field + random assignment to hero creation
      (heroes.js)
- [x] 1.2 Add `equipment` field (weapon/armor/boots, all null) to
      hero creation
- [x] 1.3 Add `EQUIPMENT_POWER` config + update `effectivePower()` to
      include equipment bonus
- [x] 1.4 Add 5 new equipment recipes + Heal Potion to crafting.js's
      RECIPES, per design.md's table exactly
      (Required extending crafting.js's cost-checking itself: Boots'
      `plank` cost is an inventory item, not a raw resource, and the
      old canAfford/spendResources only checked raw resources — see
      memory.md 2026-07-22 entry. Also breaks 1 pre-existing
      crafting.test.js invariant test as expected fallout, left for
      Documentation & Testing's 4.1.)
- [x] 1.5 Add equip/unequip functions (validate slot + class
      restriction before allowing equip, return old item to inventory
      on swap)

## Frontend Engineer
- [x] 2.1 Hero roster panel: show each hero's class + equipped items
- [x] 2.2 Equip UI: per-slot picker showing inventory items that fit
      (slot + class match), wired to the new equip functions
- [x] 2.3 Workbench crafting panel: add the 5 new equipment recipes +
      Heal Potion to the existing recipe list (reuse existing
      recipe-row/Craft-button pattern, don't rebuild it)
- [x] 2.4 Heal Potion: consumable-use UI (use directly from
      inventory, applies to a chosen hero, instant)

## Code Reviewer
- [ ] 3.1 Verify class-restricted weapons genuinely can't be equipped
      on the wrong class (test all 3 mismatches, not just one)
- [ ] 3.2 Verify swapping equipment returns the old item to inventory
      rather than destroying it
- [ ] 3.3 Verify `effectivePower()` correctly sums multiple equipped
      items (not just one slot)
- [ ] 3.4 Standard verification: syntax, full import-graph trace,
      `npm test`

## Documentation & Testing
- [ ] 4.1 Add `test/heroes.test.js` cases for class assignment,
      equip/unequip, power calculation with equipment
- [ ] 4.2 Update `openspec/specs/hero-system/spec.md` and
      `crafting-system/spec.md` (crafting-system's "refined goods
      have no use yet" open question is resolved by this change —
      update that note explicitly)
- [ ] 4.3 Update `memory.md`: mark "give refined goods a purpose" as
      resolved in Completed Tasks
