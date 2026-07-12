// crafting.js — combines resources into inventory items. No selling,
// no NFTs — just an in-game inventory system.

import { canAfford, spendResources } from './resources.js';

export const RECIPES = [
  { id: 'nest_charm',   name: 'Nest Charm',   cost: { egg: 2, feathers: 2 } },
  { id: 'basket',       name: 'Basket',       cost: { egg: 3, wood: 2 } },
  { id: 'chicken_feed', name: 'Chicken Feed', cost: { rice: 5 } },
  { id: 'plank',        name: 'Plank',        cost: { wood: 5 } },
  { id: 'brick',        name: 'Brick',        cost: { stone: 5 } },
  { id: 'ingot',        name: 'Ingot',        cost: { ore: 5 } }
];

export function createInventoryState() {
  return {};
}

export function getCraftableRecipes(resourceState) {
  return RECIPES.filter(r => canAfford(resourceState, r.cost));
}

export function getRecipeById(recipeId) {
  return RECIPES.find(r => r.id === recipeId) || null;
}

// Crafts the specific recipe the player picked. Returns true if it
// happened, false if unaffordable.
export function craftSpecific(resourceState, inventoryState, recipeId) {
  const recipe = getRecipeById(recipeId);
  if (!recipe || !canAfford(resourceState, recipe.cost)) return false;

  spendResources(resourceState, recipe.cost);
  inventoryState[recipe.id] = (inventoryState[recipe.id] || 0) + 1;
  return true;
}
