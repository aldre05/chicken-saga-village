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
| Nest Charm | 2 egg, 2 feathers |
| Basket | 3 egg, 2 wood |
| Chicken Feed | 5 rice |
| Plank | 5 wood |
| Brick | 5 stone |
| Ingot | 5 ore |
| Sword | 15 ore, 5 wood |
| Bow | 15 wood, 10 feathers |
| Staff | 10 wood, 10 stone |
| Armor | 10 ore, 10 stone |
| Boots | 3 plank, 5 feathers |
| Heal Potion | 10 rice |
| Dungeon Key | 40 egg, 40 feathers, 30 wood, 30 rice, 30 stone, 20 ore |

Crafted items go to `gameState.inventory` (a simple `{itemId: count}`
dict), separate from the main resource HUD.

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
The last 6 recipes above (Sword/Bow/Staff/Armor/Boots/Heal Potion) are
equipment and consumables for the hero system (see hero-system spec):
weapons are class-restricted, armor/boots are universal, Heal Potion
is a consumable. This is what turned Plank/Ingot from "sits in
inventory, no purpose" into something with a real use. Nest Charm and
Basket remain purely decorative/no-defined-use, same open question as
before — only the industrial refined goods (Plank/Brick/Ingot) got
resolved, not every crafted item.

**Boots' cost mixes a raw resource (`feathers`) with a crafted-item
cost (`plank`, 3 of it)** — the first recipe to do this. `crafting.js`
splits any recipe's cost dict into a raw-resource portion (checked/
spent via `resources.js`) and an inventory-item portion (checked/spent
directly against `inventoryState`) via `splitCost()`: a cost key is a
raw resource if and only if it's in `resources.js`'s `RESOURCE_IDS`;
anything else must be a previously-crafted item's own recipe id. This
required extending `canAffordRecipe()`/`craftSpecific()` (previously
resource-only) to accept and check `inventoryState` too — every other
(resource-only) recipe works unchanged since its item-cost half is
just empty.

Each successful craft increments "Land Popularity" (see
town-hall-progression spec) by 1.

## Constraints for future changes
- New recipes are additive — just append to `RECIPES`, the panel UI
  and craft logic don't need touching (equipment/Heal Potion recipes
  reused the existing recipe-row/Craft-button pattern exactly, no new
  UI was built for them).
- A recipe's cost dict CAN reference another recipe's id as an
  inventory-item cost (like Boots referencing `plank`) — this is
  supported, not a special case to avoid. Keep `splitCost()`'s
  resource-vs-item distinction (membership in `RESOURCE_IDS`) as the
  single source of truth for which half of a cost a given key belongs
  to; don't hardcode a list of "item-cost recipes" elsewhere.
- Nest Charm/Basket (and any future purely-decorative item) having no
  defined use is still an open question, separate from the now-
  resolved industrial-refined-goods question — don't conflate the two
  when reasoning about "do refined goods have a purpose" going
  forward.
