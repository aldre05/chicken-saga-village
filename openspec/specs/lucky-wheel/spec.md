# Spec: Lucky Wheel

## Current State (implemented)
- **Not a walkable building** — a fixed UI widget, lower-left of the
  screen, always clickable once unlocked. This was a deliberate
  redesign from an earlier walkable-building version.
- Auto-unlocks at Town Hall 2, no separate cost.
- Tickets accrue over time (currently 1/minute — **this is a testing
  value**, flagged clearly in code comments to change to 1/hour
  before this goes near real players), capped at 5 (TH2) +5 per Town
  Hall level above that (TH5 = 20 cap).
- Clicking opens a modal with a real animated spinning wheel — colored
  segments sized proportional to actual reward odds (not equal
  wedges), thin divider lines between every segment (including the
  wrap-around seam — a real visual bug caught and fixed), a 4-second
  spin animation that lands precisely on whatever reward was actually
  won.
- Reward outcome is determined immediately on click (ticket spent,
  resources granted right away); the animation is a visual reveal of
  an already-decided result, not a suspense mechanic with real stakes.
- **Rewards scale with Town Hall level** (1x at TH2 up to 3.25x at
  TH5) — added after early feedback that fixed small rewards felt
  pointless once resource counts got large.
- Purely non-monetary: no real tickets-for-cash, no gacha-for-money,
  no PvP "steal" item. This was a deliberate design choice to prove
  out the engagement loop for free before any monetization
  conversation, which stays deferred pending legal review regardless.

## Constraints for future changes
- If a "buy tickets with real money" or gacha-adjacent feature is ever
  proposed, it goes through the same legal-review gate as every other
  monetization-adjacent idea — this spec being "done" doesn't change
  that.
- Reward table lives in `luckyWheel.js`'s `REWARD_TABLE` — segment
  colors and weights both come from there, so the visual wheel and
  actual odds can never drift out of sync.
