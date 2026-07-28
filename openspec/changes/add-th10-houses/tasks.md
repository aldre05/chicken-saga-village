# Tasks: 10 Houses, Town Hall to Level 10

## Backend Engineer
- [ ] 1.1 Update `MAX_TOWN_HALL_LEVEL` and extend `UPGRADE_COSTS` in
      townHall.js exactly per design.md's table — don't reinterpret
      the numbers
- [ ] 1.2 Extend `HOUSE_IDS` in buildingLevels.js to include
      house_6-10
- [ ] 1.3 Extend `UNLOCK_CONFIG` in buildingUnlocks.js with the 5 new
      house entries per design.md
- [ ] 1.4 Verify (don't assume) that population sum, capacity
      formula, and upgrade cost formula all correctly pick up the
      extended HOUSE_IDS array with zero other code changes — this
      is the whole point of the array being iterated generically,
      confirm it actually holds

## Frontend Engineer
- [ ] 2.1 Add 5 new house buildings to map.js
- [ ] 2.2 Run the existing collision-verification script — zero
      overlaps, nothing on solid tiles, same standard as every prior
      building
- [ ] 2.3 Confirm HUD/population display correctly shows the new max
      (150) once all 10 houses are unlocked and maxed

## Code Reviewer
- [ ] 3.1 Verify house_6 genuinely requires Town Hall 6 (not
      buildable early via some gap in the gating logic)
- [ ] 3.2 Verify Town Hall level 10 is a real hard cap (upgrade
      button correctly disables/hides past level 10)
- [ ] 3.3 Standard verification: syntax, full import-graph trace,
      `npm test`

## Documentation & Testing
- [ ] 4.1 Update `openspec/specs/town-hall-progression/spec.md` and
      `building-progression/spec.md` with the new caps
- [ ] 4.2 Update `openspec/specs/world-map/spec.md` building count
- [ ] 4.3 Add/extend tests for the new TH levels and house unlocks
- [ ] 4.4 Update `memory.md`
