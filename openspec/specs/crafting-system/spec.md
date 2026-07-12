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

Crafted items go to `gameState.inventory` (a simple `{itemId: count}`
dict), separate from the main resource HUD — refined goods and
decorative items alike currently have **no defined use** beyond
sitting in inventory. That's an open question, not an oversight.

Each successful craft increments "Land Popularity" (see
town-hall-progression spec) by 1.

## Constraints for future changes
- New recipes are additive — just append to `RECIPES`, the panel UI
  and craft logic don't need touching.
- Before giving refined goods (Plank/Brick/Ingot/Chicken Feed) an
  actual use (e.g. as building-upgrade costs, or hero-gear crafting),
  that's a real design decision worth its own proposal, not a
  drive-by addition.
