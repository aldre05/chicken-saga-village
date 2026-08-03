# Design: Crafting Cost + Use-Case Rebalance

## Context
Current costs, for reference (from `crafting.js`):
```
nest_charm:   { egg: 10 }
basket:       { egg: 8, feathers: 5 }
chicken_feed: { egg: 5, rice: 5 }
plank:        { wood: 8 }
brick:        { stone: 8 }
ingot:        { ore: 10 }
sword:        { ingot: 4, wood: 2 }
bow:          { plank: 4, feathers: 3 }
staff:        { plank: 3, chicken_feed: 2 }
boots:        { plank: 3, feathers: 5 }
armor:        { brick: 4, ingot: 2 }
heal_potion:  { chicken_feed: 3, egg: 10 }
```
All costs are small multiples of already-abundant raw resources with
no scarcity mechanic gating raw-resource production itself (aside
from worker assignment). This proposal doesn't have enough
information yet to pick new numbers — this section exists to give
whoever picks it up the starting point, not the answer.

## Goals
- Make crafted items feel like a real resource sink, not a rounding
  error against passive production.
- Give currently-thin-use-case items (the 3 non-equipment refined
  goods specifically — nest_charm/basket/chicken_feed's only current
  use is as a cost input to *other* crafted items, they have no
  standalone purpose) an actual reason to exist.

## Non-Goals
See proposal.md.

## Open Questions — needs a developer decision before Backend starts
- **Which items specifically feel underpowered?** "Workbench items"
  was the framing, but equipment (sword/bow/staff/armor/boots) just
  got a real use-case from `add-hero-classes` (hero gear) — is the
  complaint about equipment too, or specifically about the 3 raw
  refined goods (nest_charm/basket/chicken_feed) that still don't do
  anything except feed into other recipes?
- **What's the target cost multiple?** "Still cheap" without a
  number is hard to act on precisely — even a rough target (e.g. "2x
  current," "should take a full worker-shift's worth of production
  to afford one") would let Backend pick concrete numbers instead of
  guessing.
- **New use-case, or just cost increase?** If the ask is really "give
  these items a reason to exist" rather than "make crafting more
  expensive," that's a different (bigger) task — e.g. a Town Hall
  upgrade tier that costs `basket`s instead of raw eggs, or a new
  Farmer Joe quest chain built around crafted items specifically.
  Flagging as a real fork in scope, not picking one silently.
