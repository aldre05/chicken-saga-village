# Tasks: Tiered Compounding Production Rate Curve

## Backend Engineer
- [ ] 1.1 **Confirm the ~74,000/min level-50 magnitude with the
      developer before implementing** (design.md's Magnitude Check) —
      the percentages are unambiguous, the resulting scale is worth a
      quick gut-check first
- [ ] 1.2 Replace `rateMultiplierForLevel` per design.md's formula
- [ ] 1.3 Spot-check a few other levels (5, 15, 25, 35) against the
      formula by hand/console to confirm no off-by-one at tier
      boundaries before handing off

## Frontend Engineer
- [ ] 2.1 Verify the Workbench/building panels display the new rates
      correctly at a few different levels (existing display code
      should just work once the underlying multiplier changes — this
      is a verification pass, not new UI)

## Code Reviewer
- [ ] 3.1 Verify tier boundaries are correct (level 9→10 uses which
      percentage, level 19→20 uses which — confirm against design.md's
      exact tier definition, off-by-one errors are easy here)
- [ ] 3.2 Verify no other code assumes the old additive formula's
      shape (e.g. anything that hardcoded or estimated rate values
      based on the old curve)
- [ ] 3.3 Standard verification: syntax, full import-graph trace,
      `node --test`

## Documentation & Testing
- [ ] 4.1 Update `test/buildingLevels.test.js` for the new formula —
      replace old-formula assertions, don't just add new ones
      alongside stale ones
- [ ] 4.2 Update whichever spec documents production rates with the
      new curve and concrete example numbers (level 1/9/19/20/50)
- [ ] 4.3 Update `memory.md`
