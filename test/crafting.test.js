import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPES,
  createInventoryState,
  canAffordRecipe,
  getCraftableRecipes,
  getRecipeById,
  craftSpecific
} from '../js/crafting.js';
import { createResourceState, RESOURCE_CONFIG, RESOURCE_IDS } from '../js/resources.js';

// A recipe cost key must be either a raw resource, or a previously
// crafted item's own recipe id (an "inventory item" cost, per
// crafting.js's splitCost()). Boots' `plank` cost is the one case of
// the latter — this replaces the older, now-incorrect assumption that
// every cost key is necessarily a raw resource.
const KNOWN_RECIPE_IDS = new Set(RECIPES.map(r => r.id));

describe('crafting.js', () => {
  test('every recipe cost key is either a known resource or a known crafted-item id (no dangling references)', () => {
    for (const recipe of RECIPES) {
      for (const resId of Object.keys(recipe.cost)) {
        const isResource = resId in RESOURCE_CONFIG;
        const isCraftedItem = KNOWN_RECIPE_IDS.has(resId);
        assert.ok(isResource || isCraftedItem, `recipe "${recipe.id}" references unknown cost id "${resId}" (neither a resource nor a recipe)`);
      }
    }
  });

  test('Boots is the one recipe with an inventory-item (not raw-resource) cost component, per design', () => {
    const boots = getRecipeById('boots');
    assert.ok('plank' in boots.cost);
    assert.equal('plank' in RESOURCE_CONFIG, false, 'plank must NOT be a raw resource — this is the whole point of the mixed-cost test');
    assert.ok(KNOWN_RECIPE_IDS.has('plank'), 'plank must be a real recipe id for the item-cost to resolve to anything');
  });

  test('recipe ids are unique', () => {
    const ids = RECIPES.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('the 5 equipment recipes + Heal Potion exist with the exact costs from design.md', () => {
    const expected = {
      sword: { ore: 15, wood: 5 },
      bow: { wood: 15, feathers: 10 },
      staff: { wood: 10, stone: 10 },
      armor: { ore: 10, stone: 10 },
      boots: { plank: 3, feathers: 5 },
      heal_potion: { rice: 10 }
    };
    for (const [id, cost] of Object.entries(expected)) {
      const recipe = getRecipeById(id);
      assert.ok(recipe, `expected a "${id}" recipe to exist`);
      assert.deepEqual(recipe.cost, cost, `"${id}" cost doesn't match design.md`);
    }
  });

  test('dungeon_key recipe matches the ACTUAL shipped cost, a deliberate developer-requested deviation from design.md\'s original suggestion', () => {
    // add-dungeon-keys' design.md originally suggested
    // {wood:20, stone:20, ore:10} (industrial-lane only). The
    // developer explicitly asked for a cost spanning all 6 resources
    // instead, so every resource has crafting utility -- pinning the
    // real, attributed value here (not the superseded suggestion),
    // per crafting.js's own comment on this recipe.
    const recipe = getRecipeById('dungeon_key');
    assert.ok(recipe, 'expected a "dungeon_key" recipe to exist');
    assert.deepEqual(recipe.cost, { egg: 40, feathers: 40, wood: 30, rice: 30, stone: 30, ore: 20 });
  });

  test('createInventoryState starts empty', () => {
    assert.deepEqual(createInventoryState(), {});
  });

  test('getRecipeById finds a real recipe and returns null for an unknown id', () => {
    assert.equal(getRecipeById('plank').id, 'plank');
    assert.equal(getRecipeById('does_not_exist'), null);
  });

  test('canAffordRecipe checks raw-resource cost and inventory-item cost independently', () => {
    const resources = createResourceState();
    const inventory = createInventoryState();
    // Boots needs { plank: 3, feathers: 5 } — feathers is a raw
    // resource, plank is a crafted item. Neither alone is enough.
    resources.carried.feathers = 5;
    assert.equal(canAffordRecipe(resources, inventory, getRecipeById('boots')), false, 'missing plank should still block it');

    inventory.plank = 3;
    resources.carried.feathers = 0;
    assert.equal(canAffordRecipe(resources, inventory, getRecipeById('boots')), false, 'missing feathers should still block it');

    resources.carried.feathers = 5;
    assert.equal(canAffordRecipe(resources, inventory, getRecipeById('boots')), true, 'both parts satisfied should afford it');
  });

  test('getCraftableRecipes only returns recipes the player can currently afford (resources AND inventory items)', () => {
    const resources = createResourceState();
    const inventory = createInventoryState();
    assert.deepEqual(getCraftableRecipes(resources, inventory), []);

    resources.carried.rice = 5;
    const craftable = getCraftableRecipes(resources, inventory);
    assert.equal(craftable.length, 1);
    assert.equal(craftable[0].id, 'chicken_feed');
  });

  test('craftSpecific spends resources and increments inventory count', () => {
    const resources = createResourceState();
    resources.carried.wood = 5;
    const inventory = createInventoryState();

    const result = craftSpecific(resources, inventory, 'plank');
    assert.equal(result, true);
    assert.equal(resources.carried.wood, 0);
    assert.equal(inventory.plank, 1);

    resources.carried.wood = 5;
    craftSpecific(resources, inventory, 'plank');
    assert.equal(inventory.plank, 2, 'crafting the same recipe again should stack the count');
  });

  test('craftSpecific consumes an inventory-item cost (Boots consuming plank), not just raw resources', () => {
    const resources = createResourceState();
    resources.carried.wood = 5;
    const inventory = createInventoryState();
    craftSpecific(resources, inventory, 'plank'); // inventory.plank = 1, not enough for Boots yet

    resources.carried.feathers = 5;
    assert.equal(craftSpecific(resources, inventory, 'boots'), false, 'only 1 plank on hand, Boots needs 3');
    assert.equal(inventory.boots, undefined);

    inventory.plank = 3;
    const result = craftSpecific(resources, inventory, 'boots');
    assert.equal(result, true);
    assert.equal(inventory.plank, 0, 'the 3 plank should be consumed, not just checked');
    assert.equal(inventory.boots, 1);
    assert.equal(resources.carried.feathers, 0);
  });

  test('craftSpecific fails cleanly for an unaffordable or unknown recipe', () => {
    const resources = createResourceState();
    const inventory = createInventoryState();

    assert.equal(craftSpecific(resources, inventory, 'plank'), false);
    assert.deepEqual(inventory, {});

    assert.equal(craftSpecific(resources, inventory, 'not_a_recipe'), false);
    assert.deepEqual(inventory, {});
  });

  test('every raw-resource cost id across all recipes is a real RESOURCE_IDS entry (sanity check on the resource half of the split)', () => {
    for (const recipe of RECIPES) {
      for (const resId of Object.keys(recipe.cost)) {
        if (RESOURCE_IDS.includes(resId)) continue; // it's a resource, fine
        assert.ok(KNOWN_RECIPE_IDS.has(resId), `"${resId}" in recipe "${recipe.id}" is neither a RESOURCE_IDS entry nor a recipe id`);
      }
    }
  });
});

