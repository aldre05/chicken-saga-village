import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RECIPES,
  createInventoryState,
  getCraftableRecipes,
  getRecipeById,
  craftSpecific
} from '../js/crafting.js';
import { createResourceState, RESOURCE_CONFIG } from '../js/resources.js';

describe('crafting.js', () => {
  test('every recipe cost only references known resources', () => {
    for (const recipe of RECIPES) {
      for (const resId of Object.keys(recipe.cost)) {
        assert.ok(resId in RESOURCE_CONFIG, `recipe "${recipe.id}" references unknown resource "${resId}"`);
      }
    }
  });

  test('recipe ids are unique', () => {
    const ids = RECIPES.map(r => r.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('createInventoryState starts empty', () => {
    assert.deepEqual(createInventoryState(), {});
  });

  test('getRecipeById finds a real recipe and returns null for an unknown id', () => {
    assert.equal(getRecipeById('plank').id, 'plank');
    assert.equal(getRecipeById('does_not_exist'), null);
  });

  test('getCraftableRecipes only returns recipes the player can currently afford', () => {
    const resources = createResourceState();
    assert.deepEqual(getCraftableRecipes(resources), []);

    resources.carried.rice = 5;
    const craftable = getCraftableRecipes(resources);
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

  test('craftSpecific fails cleanly for an unaffordable or unknown recipe', () => {
    const resources = createResourceState();
    const inventory = createInventoryState();

    assert.equal(craftSpecific(resources, inventory, 'plank'), false);
    assert.deepEqual(inventory, {});

    assert.equal(craftSpecific(resources, inventory, 'not_a_recipe'), false);
    assert.deepEqual(inventory, {});
  });
});
