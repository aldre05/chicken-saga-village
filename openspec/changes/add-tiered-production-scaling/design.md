# Design: Tiered Compounding Production Rate Curve

## Context
Current formula (`buildingLevels.js`) is additive/linear-per-tier:
`multiplier += levelsInTier * bonusPerLevel`, tiers at 15%/20%/25%/30%
per level across 4 brackets (≤10, ≤20, ≤30, 30+). At level 50 with a
30/min base, that's roughly **385/min** — confirmed by running the
existing `rateMultiplierForLevel(50)` against a 30 base.

The developer's specified curve reads as **compounding**: "lvl 2
should be = past level generation rate + 10%" means `rate(2) =
rate(1) * 1.10`, not `rate(2) = base + 10%-of-base`. Compounding
percentage growth is a fundamentally different (much steeper) shape
than the current linear-per-tier formula — flagging the magnitude
difference below since it's large enough to be worth a 30-second
confirmation before Backend builds it, not because anything about the
request is unclear.

## Goals
- Match the developer's specified curve exactly: 10%/level for
  levels 2-9, 15%/level for levels 10-19, 20%/level for level 20+,
  compounding on the previous level's rate each step.
- Keep `rateMultiplierForLevel(level)`'s existing signature/call sites
  unchanged — this is a formula swap inside the same function, not a
  wider refactor.

## Non-Goals
See proposal.md.

## Formula
```js
// buildingLevels.js
const COMPOUND_RATE_TIERS = [
  { uptoLevel: 9, growthPerLevel: 0.10 },   // levels 2-9
  { uptoLevel: 19, growthPerLevel: 0.15 },  // levels 10-19
  { uptoLevel: Infinity, growthPerLevel: 0.20 } // level 20+
];

export function rateMultiplierForLevel(level) {
  let multiplier = 1;
  for (let lvl = 2; lvl <= level; lvl++) {
    const tier = COMPOUND_RATE_TIERS.find(t => lvl <= t.uptoLevel);
    multiplier *= (1 + tier.growthPerLevel);
  }
  return multiplier;
}
```
(Loop form for clarity — an Engineer implementing this should feel
free to use a closed-form `Math.pow` per tier instead for
performance, same result, whichever's clearer to maintain given the
uneven tier boundaries.)

## Magnitude Check — Worth Confirming Before Building
With a 30/min base, this compounding formula produces:
- Level 9: ~64/min
- Level 19: ~260/min
- Level 20: ~312/min
- **Level 50: ~74,000/min**

That's roughly **192x higher** than the current formula's ~385/min at
level 50. This isn't a rounding difference — it's a genuinely
different endgame shape (current formula: rates stay in the
low-hundreds even at max level; this formula: rates go into the tens
of thousands). That's not necessarily wrong — "current rates feel too
low" was the actual complaint — but the jump is large enough that
it's worth the developer explicitly confirming ~74,000/min at level
50 is the intended target before Backend builds it, rather than
discovering the magnitude only after implementation. If that number
feels too extreme once seen concretely, an easy dial-back is capping
the *number of levels* the 20% compounding tier applies to (e.g. flat
rate cap after level 40) rather than changing the percentages
themselves.

## Risks / Open Questions
- Confirm the ~74,000/min level-50 target explicitly (see above) —
  the specified percentages are unambiguous, only the resulting scale
  is worth a gut-check.
- This changes `capMultiplierForLevel`'s relationship to the rate
  curve — caps grow via a separate, much steeper compounding formula
  (`CAP_GROWTH_RATE = 1.3`). Checked this directly rather than
  flagging it speculatively: at level 50, the cap multiplier is
  ~383,000x base, giving a cap around 115M (base cap 300) — an hour
  of production at the new ~74,000/min rate is only ~4.4M, well under
  that. Caps stay non-binding under the new curve; not a real risk,
  noting only that it was checked.
