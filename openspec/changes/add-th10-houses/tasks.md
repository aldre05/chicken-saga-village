# Tasks: 10 Houses, Town Hall to Level 10

## Backend Engineer
- [x] 1.1 Update `MAX_TOWN_HALL_LEVEL` and extend `UPGRADE_COSTS` in
      townHall.js exactly per design.md's table — don't reinterpret
      the numbers
- [x] 1.2 Extend `HOUSE_IDS` in buildingLevels.js to include
      house_6-10
- [x] 1.3 Extend `UNLOCK_CONFIG` in buildingUnlocks.js with the 5 new
      house entries per design.md
- [x] 1.4 Verify (don't assume) that population sum, capacity
      formula, and upgrade cost formula all correctly pick up the
      extended HOUSE_IDS array with zero other code changes — this
      is the whole point of the array being iterated generically,
      confirm it actually holds
      (Verification found 2 real gaps design.md's claim missed:
      `BASE_UPGRADE_COST` and `HOUSE_DISPLAY_NAME` both stopped at
      house_5 and needed their own new entries — fixed, see
      memory.md 2026-07-22 entry for detail.)

## Frontend Engineer
- [x] 2.1 Add 5 new house buildings to map.js
- [x] 2.2 Run the existing collision-verification script — zero
      overlaps, nothing on solid tiles, same standard as every prior
      building
- [x] 2.3 Confirm HUD/population display correctly shows the new max
      (150) once all 10 houses are unlocked and maxed

## Code Reviewer
- [x] 3.1 Verify house_6 genuinely requires Town Hall 6 (not
      buildable early via some gap in the gating logic)
      (2026-07-30: scripted — for all 5 new houses [house_6-10]:
      `UNLOCK_CONFIG[id].requiresTownHall` matches design.md exactly;
      `meetsTownHallRequirement` correctly false one level below,
      true at exactly the required level; `canUnlockBuilding` false
      one level below even given 1,000,000 of every resource [isolates
      the TH-level gate specifically, ruling out "it only looks gated
      because nobody could afford it yet"]; exact unlock costs
      cross-checked against design.md's table for all 5.)
- [x] 3.2 Verify Town Hall level 10 is a real hard cap (upgrade
      button correctly disables/hides past level 10)
      (2026-07-30: scripted — `canUpgrade` returns false at level 10
      even given 1,000,000,000 of every resource; `getUpgradeCost`
      returns null at level 10 [no cost-table entry for key 10, since
      9 is correctly the last "upgrading FROM" key]; confirmed the cap
      is exactly AT 10 and doesn't over-block — level 9->10 is
      genuinely allowed. Also cross-checked all 9 `UPGRADE_COSTS`
      table entries against design.md exactly, and confirmed
      `HOUSE_IDS`'s generic downstream logic
      [`isHouseMaxed`/`canUpgradeBuilding`/`getUpgradeCost`] actually
      extends correctly to house_6-10, not just house_1-5 — and
      computed the population-cap math directly [10 houses x 15
      capacity = 150] rather than trusting design.md's claim
      unverified.)
- [x] 3.3 Standard verification: syntax, full import-graph trace,
      `npm test`
      (2026-07-30: `node --check` on all 22 `js/*.js` files — clean.
      Import-graph trace via `import()` on every file individually —
      only expected failure was `main.js` hitting `document is not
      defined` at its first DOM call, after full graph linking
      succeeded [no stale-import regressions anywhere in the graph].
      Full suite: 161/161 non-deferred tests passing, same 3
      pre-existing/deliberately-deferred failures as prior sessions [2
      dungeon partial-credit tests + 1 crafting resource-reference
      test — both explicitly Documentation & Testing's job to update
      per `add-dungeon-failure`/`add-hero-classes`'s own tasks.md, not
      reintroduced or worsened this session].)

## Documentation & Testing
- [ ] 4.1 Update `openspec/specs/town-hall-progression/spec.md` and
      `building-progression/spec.md` with the new caps
- [ ] 4.2 Update `openspec/specs/world-map/spec.md` building count
- [ ] 4.3 Add/extend tests for the new TH levels and house unlocks
- [ ] 4.4 Update `memory.md`
