# Proposal: Crafting Cost + Use-Case Rebalance

## Why
Developer feedback after playtesting: Workbench items are still too
cheap, and still don't have enough use-case even after
`add-hero-classes` gave equipment a purpose (crafting inputs for
hero gear). This proposal exists to make that concrete, but the exact
shape needs a developer decision before Backend starts — see Open
Questions. Drafting this now so the ask is captured precisely rather
than left as a vague "make it cost more."

## What Changes (shape TBD — see design.md)
- Raise `crafting.js`'s `RECIPES` costs across some or all of: the 3
  refined goods (nest_charm, basket, chicken_feed), the 3
  building-material refined goods (plank, brick, ingot), and/or the
  5 equipment pieces (sword, bow, staff, armor, boots) + Heal Potion.
- Possibly add new use-cases beyond the current ones (equipment →
  hero gear, dungeon_key → dungeon runs if `add-dungeon-keys` ships)
  — e.g. a refined good becoming a Town Hall upgrade cost input, or a
  quest requiring a specific crafted item.

## Non-Goals
- DON'T touch the raw-resource economy (egg/feathers/wood/rice/
  stone/ore production rates) — that's `add-tiered-production-scaling`,
  a separate proposal.
- DON'T assume which items specifically feel underpowered — captured
  as an open question, not guessed at.

## Impact
- Affected specs: crafting-system, and possibly town-hall-system or
  quest-system depending on which new use-case (if any) is chosen
- Affected code: `crafting.js` (`RECIPES` costs), possibly
  `townHall.js` or `questBoard.js` if a new use-case is added there
