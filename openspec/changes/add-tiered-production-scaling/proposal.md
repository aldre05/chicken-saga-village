# Proposal: Tiered Compounding Production Rate Curve

## Why
Developer feedback: production rates feel too low at high levels
(e.g. level 50). Developer specified the desired curve directly:
level 1 = 30/min baseline, each level's rate = previous level's rate
+ a percentage (10% below level 10, 15% for levels 10-19, 20% for
level 20+) — i.e. **compounding** growth, not the current formula's
additive/linear-per-tier growth. See design.md for the exact
magnitude difference this produces and a flag worth a quick
confirmation before Backend builds it.

## What Changes
- Replace `buildingLevels.js`'s `RATE_TIERS`/`rateMultiplierForLevel`
  (currently additive: `multiplier += levelsInTier * bonusPerLevel`)
  with a compounding version: `rate(level) = rate(level-1) * (1 +
  tierPercentForLevel(level))`, using the developer's specified tier
  percentages (10% for levels 2-9, 15% for levels 10-19, 20% for
  level 20+).

## Non-Goals
- DON'T change worker-slot scaling or storage-cap scaling
  (`WORKER_SLOTS_PER_LEVEL`, `capMultiplierForLevel`) — only the
  production-rate curve is in scope here.
- DON'T change upgrade *costs* (`UPGRADE_COST_GROWTH`) — separate
  concern, not raised in this feedback.

## Impact
- Affected specs: resource-production (or whichever spec documents
  `rateMultiplierForLevel`)
- Affected code: `buildingLevels.js` (`RATE_TIERS`,
  `rateMultiplierForLevel`)
