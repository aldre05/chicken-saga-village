import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESOURCE_CONFIG,
  RESOURCE_IDS,
  createResourceState,
  isResourceUnlocked,
  getBuildingStored,
  getEffectiveRatePerSecond,
  flushAndResetCheckpoint,
  collectFromBuilding,
  canAfford,
  spendResources,
  GEM_TO_RESOURCE_RATE,
  canExchangeGemsForResource,
  exchangeGemsForResource
} from '../js/resources.js';

describe('resources.js', () => {
  test('createResourceState initializes every resource id to zero', () => {
    const state = createResourceState();
    for (const id of RESOURCE_IDS) {
      assert.equal(state.carried[id], 0);
      assert.equal(state.totalCollected[id], 0);
      assert.equal(typeof state.buildingLastCollectedAt[id], 'number');
    }
  });

  test('isResourceUnlocked respects each resource\'s Town Hall gate', () => {
    for (const id of RESOURCE_IDS) {
      const gate = RESOURCE_CONFIG[id].unlockedAtTownHall;
      if (gate > 1) {
        assert.equal(isResourceUnlocked(id, gate - 1), false, `${id} should be locked below TH${gate}`);
      }
      assert.equal(isResourceUnlocked(id, gate), true, `${id} should unlock exactly at TH${gate}`);
      assert.equal(isResourceUnlocked(id, gate + 1), true, `${id} should stay unlocked above TH${gate}`);
    }
  });

  test('getBuildingStored returns 0 with no assigned workers, regardless of elapsed time', () => {
    const state = createResourceState();
    state.buildingLastCollectedAt.egg = Date.now() - 100000;
    assert.equal(getBuildingStored(state, 'egg', Date.now(), 0), 0);
  });

  test('getBuildingStored accrues linearly with elapsed time and worker bonus', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now - 10000; // 10s elapsed
    // rate=0.5/s, 1 worker => *1.05 multiplier, rateMultiplier=1
    const stored = getBuildingStored(state, 'egg', now, 1, 1, 1);
    assert.ok(Math.abs(stored - 0.5 * 1.05 * 10) < 1e-9, `expected ~5.25, got ${stored}`);
  });

  test('getBuildingStored clamps to the effective cap', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now - 100000000; // huge elapsed time
    const stored = getBuildingStored(state, 'egg', now, 1, 1, 1);
    assert.equal(stored, RESOURCE_CONFIG.egg.cap * 1);
  });

  test('getBuildingStored scales cap with capMultiplier independent of rateMultiplier', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now - 100000000;
    const stored = getBuildingStored(state, 'egg', now, 1, 1, 2);
    assert.equal(stored, RESOURCE_CONFIG.egg.cap * 2);
  });

  test('getEffectiveRatePerSecond is 0 with no workers, scales with rateMultiplier and worker bonus otherwise', () => {
    assert.equal(getEffectiveRatePerSecond('egg', 0, 5), 0);
    const rate = getEffectiveRatePerSecond('egg', 3, 2);
    assert.ok(Math.abs(rate - (0.5 * 2 * (1 + 3 * 0.05))) < 1e-9);
  });

  test('flushAndResetCheckpoint collects whole units at OLD worker count and resets timestamp', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now - 20000; // 20s @ rate 0.5 = 10 eggs
    flushAndResetCheckpoint(state, 'egg', now, 1, 1, 1);
    assert.equal(state.carried.egg, 10); // 0.5 * 1.05 * 20 = 10.5, floored to 10
    assert.equal(state.totalCollected.egg, 10);
    assert.equal(state.buildingLastCollectedAt.egg, now);
  });

  test('flushAndResetCheckpoint does not backfill production for a building that just got its first worker', () => {
    // Regression guard for the exact bug flushAndResetCheckpoint's own
    // comment describes: an idle (0-worker) building sitting for a
    // long time should NOT retroactively earn production the instant
    // a worker is assigned.
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now - 3600000; // idle for 1 hour
    flushAndResetCheckpoint(state, 'egg', now, /* assignedWorkersBeforeChange */ 0, 1, 1);
    assert.equal(state.carried.egg, 0);
    assert.equal(state.buildingLastCollectedAt.egg, now);
  });

  test('collectFromBuilding returns 0 and does not mutate state if resource is not yet unlocked', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.wood = now - 100000;
    const before = state.carried.wood;
    const collected = collectFromBuilding(state, 'wood', now, /* townHallLevel */ 1, 5, 1, 1);
    assert.equal(collected, 0);
    assert.equal(state.carried.wood, before);
  });

  test('collectFromBuilding collects and updates carried/totalCollected/timestamp together', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now - 20000;
    const collected = collectFromBuilding(state, 'egg', now, 1, 1, 1, 1);
    assert.equal(collected, 10);
    assert.equal(state.carried.egg, 10);
    assert.equal(state.totalCollected.egg, 10);
    assert.equal(state.buildingLastCollectedAt.egg, now);
  });

  test('collectFromBuilding returns 0 without mutating timestamp when nothing has accrued yet', () => {
    const state = createResourceState();
    const now = Date.now();
    state.buildingLastCollectedAt.egg = now; // just reset, nothing elapsed
    const collected = collectFromBuilding(state, 'egg', now, 1, 1, 1, 1);
    assert.equal(collected, 0);
    assert.equal(state.buildingLastCollectedAt.egg, now);
  });

  test('canAfford / spendResources agree on affordability and spend is exact', () => {
    const state = createResourceState();
    state.carried.egg = 20;
    state.carried.feathers = 5;
    assert.equal(canAfford(state, { egg: 20, feathers: 5 }), true);
    assert.equal(canAfford(state, { egg: 21 }), false);
    spendResources(state, { egg: 20, feathers: 5 });
    assert.equal(state.carried.egg, 0);
    assert.equal(state.carried.feathers, 0);
  });

  test('canAfford treats an empty cost dict as always affordable', () => {
    const state = createResourceState();
    assert.equal(canAfford(state, {}), true);
  });

  describe('exchangeGemsForResource (add-gems-currency)', () => {
    test('canExchangeGemsForResource requires a positive gem amount AND enough gems', () => {
      const gemsState = { gems: 10 };
      assert.equal(canExchangeGemsForResource(gemsState, 0), false, 'a 0-gem exchange is meaningless, must be rejected');
      assert.equal(canExchangeGemsForResource(gemsState, -5), false, 'a negative amount must be rejected, not silently granted as a refund');
      assert.equal(canExchangeGemsForResource(gemsState, 11), false, 'one more than available must be rejected');
      assert.equal(canExchangeGemsForResource(gemsState, 10), true, 'exactly the available amount must succeed');
    });

    test('exchangeGemsForResource grants exactly gemAmount * GEM_TO_RESOURCE_RATE and deducts exactly gemAmount, for every one of the 6 resources', () => {
      for (const resourceId of RESOURCE_IDS) {
        const gemsState = { gems: 20 };
        const resources = createResourceState();
        const before = resources.carried[resourceId];
        const beforeTotal = resources.totalCollected[resourceId];

        const result = exchangeGemsForResource(gemsState, resources, resourceId, 3);
        assert.equal(result, true, `exchange for ${resourceId} should succeed`);
        assert.equal(gemsState.gems, 17);
        assert.equal(resources.carried[resourceId], before + 3 * GEM_TO_RESOURCE_RATE);
        assert.equal(resources.totalCollected[resourceId], beforeTotal + 3 * GEM_TO_RESOURCE_RATE, 'totalCollected should credit an exchange the same as any other resource-crediting path');
      }
    });

    test('exchangeGemsForResource rejects an unknown resource id, without touching gems at all', () => {
      const gemsState = { gems: 20 };
      const resources = createResourceState();
      const result = exchangeGemsForResource(gemsState, resources, 'not_a_real_resource', 3);
      assert.equal(result, false);
      assert.equal(gemsState.gems, 20, 'a rejected exchange must not deduct gems even if the resource id is bogus');
    });

    test('exchangeGemsForResource rejects an unaffordable exchange without mutating either gems or resources', () => {
      const gemsState = { gems: 2 };
      const resources = createResourceState();
      const before = resources.carried.egg;
      const result = exchangeGemsForResource(gemsState, resources, 'egg', 5);
      assert.equal(result, false);
      assert.equal(gemsState.gems, 2);
      assert.equal(resources.carried.egg, before);
    });

    test('exchangeGemsForResource credits carried uncapped, matching every other resource-crediting path (not bounded by RESOURCE_CONFIG.cap)', () => {
      const gemsState = { gems: 100000 };
      const resources = createResourceState();
      const cap = RESOURCE_CONFIG.egg.cap;
      exchangeGemsForResource(gemsState, resources, 'egg', 100000);
      assert.ok(resources.carried.egg > cap, `expected an uncapped credit to exceed the building-buffer cap (${cap}), got ${resources.carried.egg}`);
    });

    test('repeated exchanges accumulate rather than overwrite', () => {
      const gemsState = { gems: 10 };
      const resources = createResourceState();
      exchangeGemsForResource(gemsState, resources, 'wood', 2);
      exchangeGemsForResource(gemsState, resources, 'wood', 3);
      assert.equal(resources.carried.wood, 5 * GEM_TO_RESOURCE_RATE);
      assert.equal(gemsState.gems, 5);
    });
  });
});
