# Tasks: Tiered Compounding Production Rate Curve

## Backend Engineer
- [x] 1.1 **Confirm the ~74,000/min level-50 magnitude with the
      developer before implementing** (design.md's Magnitude Check) —
      the percentages are unambiguous, the resulting scale is worth a
      quick gut-check first
      (Developer's first answer was "too high, reduce the
      percentages"; presented 4 computed candidate sets with their
      actual level 9/20/35/50 outputs, developer picked one
      (5%/7.5%/10%, ~1,753/min at level 50) and it was briefly
      implemented. Developer then explicitly reconsidered and
      confirmed the ORIGINAL ~74,000/min magnitude is the intended
      target after all — final decision: design.md's percentages
      exactly, unmodified. See memory.md for the full back-and-forth.)
- [x] 1.2 Replace `rateMultiplierForLevel` per design.md's formula
      (Implemented exactly as design.md specifies — 10%/15%/20%,
      unmodified, per the final confirmed decision above.)
- [x] 1.3 Spot-check a few other levels (5, 15, 25, 35) against the
      formula by hand/console to confirm no off-by-one at tier
      boundaries before handing off
      (level 5: 44/min, level 15: 149/min, level 25: 777/min, level
      35: 4,810/min — matches design.md's own stated checkpoints
      (level 9≈64, level 19≈260, level 20≈312, level 50≈74,107)
      exactly, confirmed programmatically with a real pass/fail gate,
      not just eyeballed. Also verified tier-boundary step ratios are
      exactly 1.15 at level 9->10 and exactly 1.20 at level 19->20 —
      confirming both transitions land on the correct level, no
      off-by-one in either direction. Also re-confirmed the cap
      non-binding conclusion directly at this exact magnitude (cap
      ~115M vs. hourly production ~4.4M at level 50 — over 25x
      headroom), rather than just trusting design.md's check of the
      same numbers.)

## Frontend Engineer
- [x] 2.1 Verify the Workbench/building panels display the new rates
      correctly at a few different levels (existing display code
      should just work once the underlying multiplier changes — this
      is a verification pass, not new UI)
      (Confirmed: `panelRateEl`/`upgradePreviewEl` call
      `rateMultiplierForLevel`/`getEffectiveRatePerSecond` directly
      with zero hardcoded formula assumptions on the display side.
      Directly computed displayed rates at levels 1/2/9/10/19/20/50
      via a throwaway script — all sensible, monotonically increasing,
      level 50 lands in the same order of magnitude Backend confirmed
      (~74k-93k/min depending on worker count). `Math.round(rate)/min`
      formatting has no overflow/breakage risk at these magnitudes.
      No code changes needed.)

## Code Reviewer
- [x] 3.1 Verify tier boundaries are correct (level 9→10 uses which
      percentage, level 19→20 uses which — confirm against design.md's
      exact tier definition, off-by-one errors are easy here)
      (2026-08-05: scripted — manually computed the expected multiplier
      at levels 9/10/19/20 from first principles [levels 2-9 = 8
      compounding steps at 10%, level 10 is the FIRST level at 15%,
      etc.] and confirmed the actual `rateMultiplierForLevel` output
      matches exactly, catching the specific off-by-one design.md's
      own task warns about [does level 10 use 10% or 15%? — confirmed
      15%, correctly the new tier's own rate applies starting AT the
      boundary level, not one level late]. Cross-checked all 4 stated
      magnitude targets [level 9 ~64/min, 19 ~260/min, 20 ~312/min, 50
      ~74,000/min] against a 30/min base — all within rounding
      tolerance of design.md's numbers. Also confirmed strict
      monotonicity level 1→50 [no dips] and that level 1 is exactly
      1x [no growth applied before any upgrade].)
- [x] 3.2 Verify no other code assumes the old additive formula's
      shape (e.g. anything that hardcoded or estimated rate values
      based on the old curve)
      (2026-08-05: grepped for the old formula's tier percentages
      [0.15/0.20/0.25/0.30] and related terms [`bonusPerLevel`,
      `levelsInTier`] across all `js/*.js` files — the only 2 matches
      are both unrelated constants [Heal Potion's restore fraction,
      Ore's base collection rate], not leftover assumptions about the
      old production-rate formula. Also independently reconfirmed
      design.md's own cap-non-binding claim [caps compound via a
      separate, steeper `CAP_GROWTH_RATE=1.3` formula]: computed the
      actual level-50 cap [~1.15e8] against an hour of level-50
      production under the NEW curve [~4.45e6] — caps stay well clear,
      confirming the rate-curve change didn't accidentally make caps a
      binding constraint either.)
- [x] 3.3 Standard verification: syntax, full import-graph trace,
      `node --test`
      (2026-08-05: same standard sweep as the other 3 proposals this
      session — see `add-crafting-cost-rebalance`'s 3.2 note for the
      full breakdown; identical results [225/232, same 7 traced,
      already-assigned failures]. This proposal's own contribution:
      `buildingLevels.js`'s `rateMultiplierForLevel is 1 at level 1
      and continuous across tier boundaries` test still asserts the
      OLD additive formula's output — expected fallout, Documentation
      & Testing's task 4.1 to rewrite, not add-alongside.)

## Documentation & Testing
- [ ] 4.1 Update `test/buildingLevels.test.js` for the new formula —
      replace old-formula assertions, don't just add new ones
      alongside stale ones
- [ ] 4.2 Update whichever spec documents production rates with the
      new curve and concrete example numbers (level 1/9/19/20/50)
- [ ] 4.3 Update `memory.md`
