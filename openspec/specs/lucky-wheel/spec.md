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
  wedges), a 4-second spin animation that lands precisely on whatever
  reward was actually won.
- **Segment dividers are real DOM line elements, one per segment
  boundary, rotated into place — not part of the conic-gradient.** An
  earlier version tried baking thin (1.5°) divider bands directly
  into the gradient itself; those rendered inconsistently to the
  point of near-invisibility (likely anti-aliased away), inconsistent
  across browser/GPU. Actual rotated `<div>` line elements don't have
  that failure mode.
- **Segment labels position with `translate(x, -radius)`, not
  `translate(radius, x)`.** A prior bug had labels landing roughly 90°
  away from the reward they actually described — visually, spinning
  the wheel could land on the egg segment while the label under the
  pointer read something else. Root cause: `rotate(0deg)` points
  straight up (matching the conic-gradient's own 0° reference), so
  "how far outward from center" a label sits has to be the **Y**
  component of the translate applied *before* rotation, not the X
  component — `translate(radius, -12px)` was placing every label near
  the 3-o'clock position pre-rotation, so after rotating by the
  segment's `midAngle` every label ended up offset by roughly a
  quarter-turn from its actual wedge. The wheel's landing animation
  itself was always computing the correct segment; only the label
  markup was wrong.
- Reward outcome is determined immediately on click (ticket spent,
  resources granted right away); the animation is a visual reveal of
  an already-decided result, not a suspense mechanic with real stakes.
- **Rewards scale with Town Hall level** (1x at TH2 up to 3.25x at
  TH5) — added after early feedback that fixed small rewards felt
  pointless once resource counts got large. This scaling applies to
  raw-resource rewards only (see below).
- **Reward table now includes non-resource rewards, not just raw
  resources** (`add-dungeon-keys`, `add-recruit-via-lucky-wheel`):
  a `dungeon_key` inventory item (weight 5) and a `hero` recruitment
  (weight 4, rarer than a key, since a hero is the bigger prize).
  `spinWheel()`'s reward-branch logic distinguishes three cases by
  `entry.resource`'s identity: a raw resource (in `RESOURCE_IDS`) adds
  to `resourceState.carried`; `dungeon_key` (or any future crafted-
  item reward) adds to `inventoryState` via the same resource-vs-item
  distinction `crafting.js`'s `splitCost()` draws; the literal string
  `'hero'` is a dedicated branch that calls `heroes.js`'s
  `createRolledHero()` and pushes the result onto `rosterState.roster`
  directly rather than incrementing any count. This required
  `spinWheel()` to gain required `inventoryState`/`rosterState`
  params (signature change, not additive-only — same precedent as
  `add-hero-classes`' `getCraftableRecipes` change; every call site
  needed updating, both in `main.js` and the test suite).
- **Non-resource rewards are NEVER Town-Hall-level-scaled.** A key or
  a hero is a discrete count/event, not a quantity — "1.75 keys" or
  "2 heroes from one spin" has no game-design meaning the way "12 eggs
  instead of 5" does. `getRewardScale()` is applied only when
  `entry.resource` is a raw resource; key/hero rewards always pay out
  exactly `baseEntry.amount` (1 for both) regardless of Town Hall
  level.
- Winning a hero via the wheel produces the exact same hero shape as
  the old paid Barracks recruit path did (field-for-field identical,
  test-verified) — see hero-system spec for the
  `createRolledHero()`/`recruitHero()` split that guarantees this.
- Purely non-monetary: no real tickets-for-cash, no gacha-for-money,
  no PvP "steal" item. This was a deliberate design choice to prove
  out the engagement loop for free before any monetization
  conversation, which stays deferred pending legal review regardless.
  This now extends to hero recruitment too — heroes are a gacha-style
  reward, but still entirely free, no real-money gacha mechanics.
- Landing on a hero (vs. a resource reward) gets a distinctly different
  visual/popup treatment, not just different text — same principle
  already applied to dungeon success vs. failure popups (see
  dungeon-system spec) — since it's the biggest possible spin outcome
  and should read as a genuinely different moment.

## Constraints for future changes
- If a "buy tickets with real money" or gacha-adjacent feature is ever
  proposed, it goes through the same legal-review gate as every other
  monetization-adjacent idea — this spec being "done" doesn't change
  that.
- Reward table lives in `luckyWheel.js`'s `REWARD_TABLE` — segment
  colors and weights both come from there, so the visual wheel and
  actual odds can never drift out of sync.
- Keep dividers as real DOM elements and labels positioned via the Y
  component of `translate` (see the two bugs above) — don't
  reintroduce gradient-baked divider bands or an X-component label
  offset without re-verifying against every segment, not just the
  one being eyeballed during a quick check.
- Keep the resource/item/hero reward-branch logic as one shared
  conditional chain inside `spinWheel()`, not three separately-
  maintained implementations — a future non-resource reward type
  should extend this same chain (using the `RESOURCE_IDS`-membership
  test as the resource/item split, and a dedicated identity check like
  `'hero'` for anything that isn't a stackable count) rather than
  bolting on a fourth parallel branch structure.
- Keep non-resource reward amounts exempt from `getRewardScale()` —
  don't scale a discrete item/hero count just because resource rewards
  do.
