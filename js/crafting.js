// crafting.js — combines resources into inventory items. No selling,
// no NFTs — just an in-game inventory system.

import { canAfford, spendResources, RESOURCE_IDS } from './resources.js';

export const RECIPES = [
  // Refined goods — rebalanced per
  // openspec/changes/add-crafting-cost-rebalance/. Developer decision:
  // both these AND equipment (below) were "underpowered," cost
  // increase only (no new use-case this pass). ~7-9x the previous
  // cost — these were previously a rounding error (4-5 total
  // resources) against passive production; now a real, felt
  // investment. NOTE: design.md's own "Context" baseline (showing
  // sword costing `ingot`, staff costing `chicken_feed`, etc.) is
  // STALE — it describes a refined-goods supply chain that was never
  // actually implemented. The real baseline this rebalance is against
  // is what's below, verified directly against this file before
  // touching any number, not taken from that doc. One consequence
  // worth flagging: `brick` and `ingot` have ZERO consumers anywhere
  // in this file even after this change (worse than design.md's own
  // "thin use-case" framing assumed) — `plank` has exactly one
  // (Boots). Left as-is since the developer explicitly chose
  // cost-increase-only, not a new-use-case fix, this pass.
  { id: 'nest_charm',   name: 'Nest Charm',   cost: { egg: 20, feathers: 15 } },
  { id: 'basket',       name: 'Basket',       cost: { egg: 15, wood: 20 } },
  { id: 'chicken_feed', name: 'Chicken Feed', cost: { rice: 35 } },
  { id: 'plank',        name: 'Plank',        cost: { wood: 5 } },
  { id: 'brick',        name: 'Brick',        cost: { stone: 5 } },
  { id: 'ingot',        name: 'Ingot',        cost: { ore: 5 } },
  // Equipment + Heal Potion. Equipment costs rebalanced alongside the
  // refined goods above (~2.5x previous — already non-trivial, so a
  // smaller multiple than the refined goods' ~7-9x, but still a real
  // increase per the developer's "other items should matter too"
  // framing, not left untouched while only refined goods went up).
  // Original shapes/resource-flavor kept per
  // openspec/changes/add-hero-classes/design.md's table, just scaled.
  // NOTE: Boots' cost references `plank`, an inventory item (from the
  // recipe above), not a raw resource in resources.js's RESOURCE_IDS
  // — see splitCost()/canAffordRecipe() below, which is why this
  // recipe list can mix the two in one cost dict without every other
  // (resource-only) recipe needing any change.
  { id: 'sword',       name: 'Sword',       cost: { ore: 35, wood: 15 } },
  { id: 'bow',         name: 'Bow',         cost: { wood: 35, feathers: 20 } },
  { id: 'staff',       name: 'Staff',       cost: { wood: 25, stone: 25 } },
  { id: 'armor',       name: 'Armor',       cost: { ore: 25, stone: 25 } },
  { id: 'boots',       name: 'Boots',       cost: { plank: 6, feathers: 15 } },
  { id: 'heal_potion', name: 'Heal Potion', cost: { rice: 10 } },
  // Dungeon Key — openspec/changes/add-dungeon-keys/. Cost is a
  // DELIBERATE DEVIATION from design.md's suggested
  // { wood: 20, stone: 20, ore: 10 } (industrial-lane-only): the
  // developer explicitly asked for a high cost spanning ALL 6
  // resources, specifically to give egg/feathers/rice a crafting-time
  // sink too, not just wood/stone/ore. Roughly comparable in scale to
  // a Town Hall 4->5 upgrade (a one-time cost), which is intentional
  // — a key gates a repeatable action, so it needs to feel like a
  // real, cross-resource investment each time, not a trivial tax.
  // First-pass balance guess, flagged for playtesting like every
  // other cost/multiplier guess in this project (see e.g.
  // HEAL_COST_BASE in heroes.js).
  { id: 'dungeon_key', name: 'Dungeon Key', cost: { egg: 40, feathers: 40, wood: 30, rice: 30, stone: 30, ore: 20 } }
];

export function createInventoryState() {
  return {};
}

// Splits a recipe's cost dict into the raw-resource portion (checked/
// spent via resources.js against resourceState) and the inventory-item
// portion (checked/spent against inventoryState directly) — a cost id
// is a raw resource if and only if it's a key in resources.js's
// RESOURCE_CONFIG; everything else must be a previously-crafted item.
function splitCost(costDict) {
  const resourceCost = {};
  const itemCost = {};
  for (const [id, amount] of Object.entries(costDict)) {
    if (RESOURCE_IDS.includes(id)) resourceCost[id] = amount;
    else itemCost[id] = amount;
  }
  return { resourceCost, itemCost };
}

export function canAffordRecipe(resourceState, inventoryState, recipe) {
  const { resourceCost, itemCost } = splitCost(recipe.cost);
  if (!canAfford(resourceState, resourceCost)) return false;
  return Object.entries(itemCost).every(([id, amount]) => (inventoryState[id] || 0) >= amount);
}

export function getCraftableRecipes(resourceState, inventoryState) {
  return RECIPES.filter(r => canAffordRecipe(resourceState, inventoryState, r));
}

export function getRecipeById(recipeId) {
  return RECIPES.find(r => r.id === recipeId) || null;
}

// Crafts the specific recipe the player picked. Returns true if it
// happened, false if unaffordable.
export function craftSpecific(resourceState, inventoryState, recipeId) {
  const recipe = getRecipeById(recipeId);
  if (!recipe || !canAffordRecipe(resourceState, inventoryState, recipe)) return false;

  const { resourceCost, itemCost } = splitCost(recipe.cost);
  spendResources(resourceState, resourceCost);
  for (const [id, amount] of Object.entries(itemCost)) {
    inventoryState[id] -= amount;
  }

  inventoryState[recipe.id] = (inventoryState[recipe.id] || 0) + 1;
  return true;
}
