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
  resources** (`add-dungeon-keys`, `add-recruit-via-lucky-wheel`,
  `add-gems-currency`): a `dungeon_key` inventory item (weight 5), a
  `hero` recruitment (weight 4, rarer than a key, since a hero is the
  bigger prize), and a `gems` reward (amount 5 per win — see
  gems-currency spec, this is gems' only earn path).
  `spinWheel()`'s reward-branch logic distinguishes four cases by
  `entry.resource`'s identity: a raw resource (in `RESOURCE_IDS`) adds
  to `resourceState.carried`; `dungeon_key` (or any future crafted-
  item reward) adds to `inventoryState` via the same resource-vs-item
  distinction `crafting.js`'s `splitCost()` draws; the literal string
  `'hero'` is a dedicated branch that calls `heroes.js`'s
  `createRolledHero()` and pushes the result onto `rosterState.roster`
  directly rather than incrementing any count; the literal string
  `'gems'` is a dedicated branch that adds directly to
  `gemsState.gems`. The `'gems'` branch specifically had to be its own
  dedicated case, not folded into the generic resource/item handling
  — `'gems'` isn't in `RESOURCE_IDS` (it's not a raw resource) and
  isn't a `crafting.js` recipe id either (nothing "crafts" gems), so
  without a dedicated branch it would have silently fallen into the
  inventory-item catch-all and been added to `inventoryState.gems`
  instead of `gemsState.gems` — a real bug caught and fixed before
  shipping, not a hypothetical (see `test/luckyWheel.test.js`'s
  regression test asserting `inventoryState` stays untouched on a
  gems-reward spin). This required `spinWheel()` to gain a required
  `gemsState` param on top of the earlier `inventoryState`/
  `rosterState` additions (signature change, not additive-only — same
  precedent as `add-hero-classes`' `getCraftableRecipes` change; every
  call site needed updating, both in `main.js` and the test suite).
- **Non-resource rewards are NEVER Town-Hall-level-scaled.** A key, a
  hero, or a gems payout is a discrete count/event, not a quantity —
  "1.75 keys," "2 heroes from one spin," or "8.75 gems" has no
  game-design meaning the way "12 eggs instead of 5" does.
  `getRewardScale()` is applied only when `entry.resource` is a raw
  resource; key/hero/gems rewards always pay out exactly
  `baseEntry.amount` (1, 1, and 5 respectively) regardless of Town
  Hall level.
- Winning a hero via the wheel produces the exact same hero shape as
  the old paid Barracks recruit path did (field-for-field identical,
  test-verified) — see hero-system spec for the
  `createRolledHero()`/`recruitHero()` split that guarantees this.
- **Ticket-spending itself is still free-only — no real-money
  ticket purchase, gacha-for-money, or PvP "steal" item exists in the
  current implementation.** This was originally framed as "deferred
  pending legal review, full stop" — that blanket framing is stale
  (see gems-currency spec's write-up of the 2026-08-01 reversal to a
  standard Web2 paid-game-economy model; corrected here for the same
  reason). The accurate framing now: real-money monetization is an
  accepted future direction by developer decision, but nothing here
  implements it yet, and the wheel's loot-box/gacha structure (a
  random-reward spin, not a direct known-item purchase) is specifically
  the shape that carries real jurisdiction-dependent legal weight if a
  real-money path is ever attached to it — worth being deliberate
  about, not a rubber-stamp extension of "gems already sort of work
  like this." This extends to hero recruitment and gems too — both are
  gacha-style/wheel-earned rewards, currently entirely free either way.
- Landing on a hero (vs. a resource reward) gets a distinctly different
  visual/popup treatment, not just different text — same principle
  already applied to dungeon success vs. failure popups (see
  dungeon-system spec) — since it's the biggest possible spin outcome
  and should read as a genuinely different moment.

## Constraints for future changes
- If a "buy tickets with real money" or gacha-adjacent monetization
  feature is ever proposed for this wheel, treat the random-reward-
  spin-vs-direct-purchase legal distinction (see gems-currency spec)
  as a real design input for that proposal — not something to default
  past because the currency plumbing already exists.
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
- **Any new non-resource reward type needs an `ITEM_CONFIG` entry in
  `main.js`, not just a `spinWheel()` branch.** `iconFor()`/`nameFor()`
  (used by both the wheel segment label and the win popup) look up a
  reward id in `RESOURCE_CONFIG` first, then `ITEM_CONFIG`, falling
  back to a generic `❔` placeholder if neither has it. The `gems`
  reward shipped without an `ITEM_CONFIG` entry initially — a real,
  always-visible bug (the gems wheel segment showed `❔` on every page
  load, not just an edge case), found and fixed while writing this
  spec. Adding a reward to `REWARD_TABLE` is not sufficient by itself;
  check `iconFor`/`nameFor` resolve it correctly too.
