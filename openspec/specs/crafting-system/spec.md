# Spec: Crafting System

## Current State (implemented)
Workbench (a building, unlock-gated like any other) shows a real
recipe-picker panel when you're standing near it and it's unlocked —
every recipe listed with its cost (insufficient resources shown in
red) and its own Craft button. Player picks exactly what to make;
nothing is auto-selected. This replaced an earlier "auto-craft the
best affordable recipe" version that didn't give the player control.

Current recipes (`crafting.js`'s `RECIPES`):
| Item | Cost |
|---|---|
| Nest Charm | 20 egg, 15 feathers |
| Basket | 15 egg, 20 wood |
| Chicken Feed | 35 rice |
| Plank | 5 wood |
| Brick | 5 stone |
| Ingot | 5 ore |
| Sword | 35 ore, 15 wood |
| Bow | 35 wood, 20 feathers |
| Staff | 25 wood, 25 stone |
| Armor | 25 ore, 25 stone |
| Boots | 6 plank, 15 feathers |
| Heal Potion | 10 rice (unaffected by the rebalance below) |
| Dungeon Key | 40 egg, 40 feathers, 30 wood, 30 rice, 30 stone, 20 ore |

Crafted items go to `gameState.inventory` (a simple `{itemId: count}`
dict), separate from the main resource HUD.

**Costs above were rebalanced upward — `add-crafting-cost-rebalance`,
a cost-increase-only pass, no new use-cases added.** Developer
decision: both refined goods and equipment were "underpowered"
relative to passive production — refined goods (Nest Charm/Basket/
Chicken Feed) previously cost a "rounding error" (4-5 total resources)
against how fast resources accumulate passively, so a ~7-9x increase
makes crafting a real, felt investment instead of something to do
absent-mindedly; equipment increased roughly ~2.5x for the same
underlying reason at a different scale. **`design.md`'s own "Context"
baseline is stale** — it describes a refined-goods supply chain
(sword costing `ingot`, staff costing `chicken_feed`, etc.) that was
never actually implemented; the real baseline this rebalance worked
against was the live `RECIPES` array itself, verified directly rather
than trusted from that doc. **One consequence worth flagging, not
silently left implicit**: `brick` and `ingot` now have **zero
consumers** anywhere in `RECIPES` — worse than design.md's own
"thin use-case" framing assumed, since a cost-increase-only pass makes
an already-thin use case (previously at least nominally craftable
toward something) into a genuinely dead end for those two items
specifically. The developer's explicit scope for this pass was
cost-increase-only, not a new-use-case fix — `test/crafting.test.js`
has a dedicated test keeping this fact verified/visible rather than
letting it silently drift further unnoticed.

**Dungeon Key's cost deliberately spans all 6 resources — a
developer-requested deviation from `add-dungeon-keys/design.md`'s
original suggestion** (`{wood: 20, stone: 20, ore: 10}`, industrial-
lane only). The developer explicitly wanted every resource to have
crafting utility, not just wood/stone/ore. Documented inline in
`crafting.js` and pinned against the actual shipped value (not the
superseded suggestion) in `test/crafting.test.js`. **Known side
effect, not a bug**: rice and ore don't unlock until Town Hall 5, but
the Dungeon Gate that consumes this key unlocks at TH4 — so a player
genuinely cannot craft (or therefore use) a Dungeon Key until TH5, one
full Town Hall level after the building that needs it becomes
available. Flagged for awareness, left as the developer's explicit
choice rather than silently adjusted. See dungeon-system spec for the
key's actual gating mechanics.

**Refined goods now have a purpose — resolved by `add-hero-classes`.**
The equipment/consumable recipes above (Sword/Bow/Staff/Armor/Boots/
Heal Potion) are for the hero system (see hero-system spec): weapons
are class-restricted, armor/boots are universal, Heal Potion is a
consumable. This is what turned Plank from "sits in inventory, no
purpose" into something with a real use (via Boots). Brick/Ingot are
back to having no consumers post-rebalance (see above) — the
resolution only ever applied to Plank specifically, not the whole
refined-goods category, and remains only partial. Nest Charm and
Basket remain purely decorative/no-defined-use, a separate open
question from the refined-goods one.

**Boots' cost mixes a raw resource (`feathers`) with a crafted-item
cost (`plank`, 6 of it as of the rebalance above)** — the first recipe
to do this. `crafting.js` splits any recipe's cost dict into a
raw-resource portion (checked/spent via `resources.js`) and an
inventory-item portion (checked/spent directly against
`inventoryState`) via `splitCost()`: a cost key is a raw resource if
and only if it's in `resources.js`'s `RESOURCE_IDS`; anything else
must be a previously-crafted item's own recipe id. This required
extending `canAffordRecipe()`/`craftSpecific()` (previously
resource-only) to accept and check `inventoryState` too — every other
(resource-only) recipe works unchanged since its item-cost half is
just empty.

Each successful craft increments "Land Popularity" (see
town-hall-progression spec) by 1.

## Constraints for future changes
- New recipes are additive — just append to `RECIPES`, the panel UI
  and craft logic don't need touching (equipment/Heal Potion/Dungeon
  Key recipes reused the existing recipe-row/Craft-button pattern
  exactly, no new UI was built for them).
- A recipe's cost dict CAN reference another recipe's id as an
  inventory-item cost (like Boots referencing `plank`) — this is
  supported, not a special case to avoid. Keep `splitCost()`'s
  resource-vs-item distinction (membership in `RESOURCE_IDS`) as the
  single source of truth for which half of a cost a given key belongs
  to; don't hardcode a list of "item-cost recipes" elsewhere.
- Nest Charm/Basket (and any future purely-decorative item) having no
  defined use is still an open question, separate from the
  refined-goods question — don't conflate the two when reasoning about
  "do crafted items have a purpose" going forward.
- **Brick and Ingot currently have zero consumers.** If a future
  change gives them one (a new recipe, a new building cost, a hero
  material), update the "zero consumers" claim above and its
  accompanying test rather than leaving stale text/assertions once
  it's no longer true.
- If recipe costs are rebalanced again, verify against the live
  `RECIPES` array as the baseline, not `design.md`'s own "Context"
  section — that section is already known-stale for this project (see
  above) and re-reading it as ground truth would silently reintroduce
  wrong numbers.
