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

  // REGRESSION (add-crafting-cost-rebalance): every cost below was
  // increased by the developer's explicit request (refined goods
  // ~7-9x, equipment ~2.5x — see crafting.js's own comment for the
  // full reasoning and the stale-design.md-baseline note). Pinned
  // against the ACTUAL shipped RECIPES array, verified directly
  // against the live file, not design.md's own "Context" baseline
  // (which the file's comment explicitly flags as stale/never-
  // implemented).
  test('the 6 refined-goods recipes match the actual shipped (rebalanced) costs', () => {
    const expected = {
      nest_charm: { egg: 20, feathers: 15 },
      basket: { egg: 15, wood: 20 },
      chicken_feed: { rice: 35 },
      plank: { wood: 5 },
      brick: { stone: 5 },
      ingot: { ore: 5 }
    };
    for (const [id, cost] of Object.entries(expected)) {
      const recipe = getRecipeById(id);
      assert.ok(recipe, `expected a "${id}" recipe to exist`);
      assert.deepEqual(recipe.cost, cost, `"${id}" cost doesn't match the actual shipped RECIPES array`);
    }
  });

  test('the 5 equipment recipes + Heal Potion match the actual shipped (rebalanced) costs', () => {
    const expected = {
      sword: { ore: 35, wood: 15 },
      bow: { wood: 35, feathers: 20 },
      staff: { wood: 25, stone: 25 },
      armor: { ore: 25, stone: 25 },
      boots: { plank: 6, feathers: 15 },
      heal_potion: { rice: 10 } // unaffected by the rebalance
    };
    for (const [id, cost] of Object.entries(expected)) {
      const recipe = getRecipeById(id);
      assert.ok(recipe, `expected a "${id}" recipe to exist`);
      assert.deepEqual(recipe.cost, cost, `"${id}" cost doesn't match the actual shipped RECIPES array`);
    }
  });

  test('brick and ingot have zero consumers anywhere in RECIPES (a known, flagged gap -- not fixed this rebalance, cost-increase-only was the developer\'s explicit scope)', () => {
    // Documented directly in crafting.js's own comment: this rebalance
    // made the gap WORSE than design.md's own "thin use-case" framing
    // assumed (brick/ingot going from "at least somewhat thin" to
    // "literally zero uses"), but the developer explicitly chose
    // cost-increase-only, not a new-use-case fix, this pass. This test
    // exists so that fact stays verified/visible rather than silently
    // drifting further without anyone noticing.
    const consumesResource = (resId) => RECIPES.some(r => resId in r.cost);
    assert.equal(consumesResource('brick'), false, 'brick should currently have no consumers -- if this now fails, a consumer was added and this comment/test should be updated to reflect it');
    assert.equal(consumesResource('ingot'), false, 'ingot should currently have no consumers -- if this now fails, a consumer was added and this comment/test should be updated to reflect it');
    assert.equal(consumesResource('plank'), true, 'plank DOES have exactly one consumer (Boots) -- sanity check that the assertion style above is actually discriminating, not vacuously true for every item');
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
    // Boots needs { plank: 6, feathers: 15 } — feathers is a raw
    // resource, plank is a crafted item. Neither alone is enough.
    resources.carried.feathers = 15;
    assert.equal(canAffordRecipe(resources, inventory, getRecipeById('boots')), false, 'missing plank should still block it');

    inventory.plank = 6;
    resources.carried.feathers = 0;
    assert.equal(canAffordRecipe(resources, inventory, getRecipeById('boots')), false, 'missing feathers should still block it');

    resources.carried.feathers = 15;
    assert.equal(canAffordRecipe(resources, inventory, getRecipeById('boots')), true, 'both parts satisfied should afford it');
  });

  test('getCraftableRecipes only returns recipes the player can currently afford (resources AND inventory items)', () => {
    const resources = createResourceState();
    const inventory = createInventoryState();
    assert.deepEqual(getCraftableRecipes(resources, inventory), []);

    resources.carried.rice = 35; // chicken_feed's actual (rebalanced) cost
    const craftable = getCraftableRecipes(resources, inventory);
    // heal_potion (rice: 10, cheaper) also becomes affordable at this
    // rice amount -- any quantity that unlocks chicken_feed (35)
    // necessarily also unlocks heal_potion (10), so the correct
    // expectation is both, not "only chicken_feed".
    assert.deepEqual(craftable.map(r => r.id).sort(), ['chicken_feed', 'heal_potion']);
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
    craftSpecific(resources, inventory, 'plank'); // inventory.plank = 1, not enough for Boots yet (needs 6)

    resources.carried.feathers = 15;
    assert.equal(craftSpecific(resources, inventory, 'boots'), false, 'only 1 plank on hand, Boots needs 6');
    assert.equal(inventory.boots, undefined);

    inventory.plank = 6;
    const result = craftSpecific(resources, inventory, 'boots');
    assert.equal(result, true);
    assert.equal(inventory.plank, 0, 'the 6 plank should be consumed, not just checked');
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

