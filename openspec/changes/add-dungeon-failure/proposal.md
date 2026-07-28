# Proposal: Dungeon Failure Consequences (Hero HP + Healing)

## Why
Confirmed decision, reversing an earlier one: dungeon failure should
carry real risk, not just a softer partial-reward outcome. A failed
hero drops to 0 HP and must be healed (paid) before it can be sent
again.

**This explicitly reverses design.md's "not-punishing failure states"
principle from the original heroes-dungeons change.** Documenting the
reversal here rather than silently overwriting it — the earlier
choice wasn't wrong when made, it's just been superseded by a direct
decision.

## What Changes
- Heroes gain a `currentHp` field (starts at max HP for their rarity).
- Dungeon failure (`effectivePower < difficulty`) sets `currentHp` to
  0 instead of the old 50%-partial-credit outcome. Success still
  grants full reward + XP, unchanged.
- A hero with `currentHp <= 0` is "downed" — shown distinctly in the
  roster, cannot be sent to a dungeon until healed.
- Healing: a paid action at the Barracks, cost scales with rarity.
  Instant, no timer.
- Dungeon panel shows potential reward (full reward + XP) before
  sending, alongside the existing entry cost.

## Non-Goals
- DON'T add healing-over-time — instant, paid-only for now.
- DON'T touch partial-reward math anywhere else (Lucky Wheel,
  resource production) — dungeon-specific only.
- DON'T add permanent hero death/loss — 0 HP is recoverable.

## Impact
- Affected specs: hero-system, dungeon-system
- Affected code: heroes.js (currentHp, heal function), dungeons.js
  (failure branch), interactionHandlers.js (Barracks heal action),
  main.js (dungeon panel reward preview, roster "downed" display)
