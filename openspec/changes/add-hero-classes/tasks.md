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
- [x] 3.1 Verify class-restricted weapons genuinely can't be equipped
      on the wrong class (test all 3 mismatches, not just one)
      (2026-07-30: scripted — all 3 weapons x all 2 wrong-classes-each
      = 6 mismatch combinations tested individually: `canEquipItem`
      and `equipHero` both reject, equipment slot stays empty,
      inventory count untouched. Confirmed the reverse too: each
      weapon DOES equip successfully on its own correct class.
      Confirmed armor/boots are genuinely unrestricted across all 3
      classes, per design.md.)
- [x] 3.2 Verify swapping equipment returns the old item to inventory
      rather than destroying it
      (2026-07-30: scripted — `unequipHero` returns the previously-
      equipped item to inventory (count 0->1) and clears the slot;
      no-ops safely (returns false) on an already-empty slot without
      touching inventory. `equipHero`'s swap-to-a-different-item-in-
      the-same-slot path reuses this same return-to-inventory
      mechanic — confirmed via a same-slot re-equip scenario since
      only one armor item type currently exists in EQUIPMENT_ITEMS to
      construct a "real" cross-item swap with.)
- [x] 3.3 Verify `effectivePower()` correctly sums multiple equipped
      items (not just one slot)
      (2026-07-30: scripted — incrementally equipped sword (+8), armor
      (+6), boots (+4) onto the same hero and confirmed power
      increased by exactly each item's bonus at each step, landing on
      the exact sum of all three (base+18). Confirmed removing one
      item drops power by exactly that item's bonus with the other
      two unaffected — rules out a "last slot wins" or "only first
      slot counted" bug. Confirmed a fully-unequipped hero's power
      equals exactly `basePower`, no phantom bonus from null slots.)
      **Also found and fixed a real bug beyond the assigned scope**
      while reading crafting.js/design.md for this review: Heal
      Potion's `useHealPotion()` was implemented as a full heal
      instead of the 25% design.md specifies — see
      add-dungeon-failure's 3.3 note (filed there since it's a
      heal-mechanic bug, not a class/equipment one, but touches a file
      this review also covered) and memory.md for full detail.
- [x] 3.4 Standard verification: syntax, full import-graph trace,
      `npm test`
      (2026-07-30: same standard sweep as the other three proposals
      this session — see add-th10-houses's 3.3 note for full detail,
      identical results. Also independently verified all 6 new
      crafting.js recipes [5 equipment + Heal Potion] match design.md's
      cost table exactly, and specifically confirmed Boots' item-based
      cost [3 plank, a crafted good, not a raw resource] is genuinely
      enforced — uncraftable with 0 plank even given unlimited raw
      resources, craftable once exactly 3 plank exist, consumes them
      correctly on craft.)

## Documentation & Testing
- [ ] 4.1 Add `test/heroes.test.js` cases for class assignment,
      equip/unequip, power calculation with equipment
- [ ] 4.2 Update `openspec/specs/hero-system/spec.md` and
      `crafting-system/spec.md` (crafting-system's "refined goods
      have no use yet" open question is resolved by this change —
      update that note explicitly)
- [ ] 4.3 Update `memory.md`: mark "give refined goods a purpose" as
      resolved in Completed Tasks
