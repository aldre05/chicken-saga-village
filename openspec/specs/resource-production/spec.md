# Spec: Resource Production

## Current State (implemented)
6 raw resources, each produced by a dedicated building:

| Resource | Icon | Base Rate | Base Cap | Unlocked at TH | Building |
|---|---|---|---|---|---|
| Egg | 🥚 | 0.5/s | 500 | 1 | Old Coop |
| Feathers | 🐓 | 0.3/s | 300 | 1 | Nest Bundle |
| Wood | 🌲 | 0.2/s | 300 | 4 | Woodshed |
| Rice | 🌾 | 0.2/s | 300 | 5 | Rice Paddy |
| Stone | 🗿 | 0.2/s | 300 | 3 | Quarry |
| Ore | ⛏️ | 0.15/s | 300 | 5 | Mine |

(Icons deliberately chosen from Unicode 6.0-era emoji or earlier —
newer glyphs like 🪶/🪵/🪨 render as broken boxes on some Windows font
versions; learned this the hard way, see Session Log in memory.md.)

- **Zero workers assigned = zero production**, hard rule. No baseline
  idle output.
- Each assigned worker adds +5% to that building's rate (matches
  Pixiland's actual documented formula, not our first guess).
- Production accumulates timestamp-based (offline-safe), capped per
  resource, collected via walking up + pressing E.
- When a building's worker count changes (assign/unassign), production
  is "flushed" at the OLD worker count and the timestamp resets —
  prevents wrongly backfilling idle-worker time at the new rate.
- **Rate scaling is tiered by level, COMPOUNDING not additive**
  (`add-tiered-production-scaling`): level 2-9 multiplies the previous
  level's rate by ×1.10 each level; level 10-19 by ×1.15 each level;
  level 20+ by ×1.20 each level — each level compounds on top of the
  accumulated multiplier so far, not a flat per-level bonus added to a
  base. **This replaced an earlier additive formula** (+15%/level
  through level 10, +20%/level through 20, +25%/level through 30,
  +30%/level beyond) that made growth feel flat/linear in practice —
  compounding was the deliberate fix. At a 30/min base rate, this
  works out to: level 9 ≈ 64/min, level 19 ≈ 260/min, level 20 ≈
  312/min, level 50 ≈ 74,107/min — magnitudes an idle-game player
  should recognize as "exponential," not "steadily increasing."
  `buildingLevels.js`'s own comment carries the full back-and-forth
  decision history on the exact tier percentages (10/15/20 shipped;
  earlier drafts considered other splits) — worth reading before
  proposing another rebalance of this curve, so the same ground isn't
  re-litigated from scratch.
- **Storage cap scaling is separate and much steeper** — compounds at
  the same rate as upgrade costs (1.3^(level-1)), reaching ~2000x by
  level 30. Caps stop being a real constraint from roughly level 30+.
- All displayed rates/amounts are whole numbers (rounded/floored) —
  no decimals shown to the player anywhere.

## Egg Upkeep (worker-upkeep spec)
Each assigned worker (village-wide count, not per-building) drains
0.5 egg/minute. Clamped at 0, no penalty yet for hitting 0 — that
consequence is an explicit open design question, not yet decided.

## Constraints for future changes
- Rate scaling must stay compounding (multiply the running total each
  level), not additive (add a flat percentage to a fixed base) — see
  the formula change above and `test/buildingLevels.test.js`'s
  regression coverage pinning both the tier-boundary behavior and
  design.md's own stated magnitude checkpoints. Reverting to additive
  scaling silently flattens the late-game growth curve back to the
  exact feel this change was meant to fix.
- Tile/resource IDs must stay defined in `resources.js`'s
  `RESOURCE_CONFIG` — nothing should hardcode resource behavior
  elsewhere.
- Any new resource needs: a producing building (reuse the existing
  worker+leveling pattern) or a crafting recipe (see crafting-system
  spec) — don't invent a third production mechanism without strong
  reason.
