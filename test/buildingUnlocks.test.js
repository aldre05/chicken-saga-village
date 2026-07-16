import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  UNLOCK_CONFIG,
  createBuildingUnlockState,
  isBuildingUnlocked,
  meetsTownHallRequirement,
  canUnlockBuilding,
  unlockBuilding
} from '../js/buildingUnlocks.js';
import { createResourceState } from '../js/resources.js';

describe('buildingUnlocks.js', () => {
  test('createBuildingUnlockState pre-unlocks only old_coop and house_1', () => {
    const state = createBuildingUnlockState();
    assert.equal(state.old_coop, true);
    assert.equal(state.house_1, true);
    for (const id of Object.keys(UNLOCK_CONFIG)) {
      if (id === 'old_coop' || id === 'house_1') continue;
      assert.equal(!!state[id], false, `${id} should not be pre-unlocked`);
    }
  });

  test('isBuildingUnlocked reflects state truthiness', () => {
    const state = createBuildingUnlockState();
    assert.equal(isBuildingUnlocked(state, 'old_coop'), true);
    assert.equal(isBuildingUnlocked(state, 'mine'), false);
  });

  test('meetsTownHallRequirement checks the configured gate per building', () => {
    for (const [id, cfg] of Object.entries(UNLOCK_CONFIG)) {
      assert.equal(meetsTownHallRequirement(id, cfg.requiresTownHall - 1), false, `${id} should fail one level below its gate`);
      assert.equal(meetsTownHallRequirement(id, cfg.requiresTownHall), true, `${id} should pass exactly at its gate`);
    }
  });

  test('canUnlockBuilding requires both Town Hall level AND affordability', () => {
    const resources = createResourceState();
    resources.carried.egg = 100;
    resources.carried.feathers = 100;

    // mine requires TH5
    assert.equal(canUnlockBuilding('mine', 1, resources), false, 'should fail TH gate');
    assert.equal(canUnlockBuilding('mine', 5, resources), false, 'should fail affordability (missing stone)');

    resources.carried.stone = 100;
    assert.equal(canUnlockBuilding('mine', 5, resources), true);
  });

  test('canUnlockBuilding returns false for an unknown building id', () => {
    const resources = createResourceState();
    assert.equal(canUnlockBuilding('not_a_real_building', 5, resources), false);
  });

  test('unlockBuilding spends the exact cost and flips the unlock flag; fails cleanly otherwise', () => {
    const unlockState = createBuildingUnlockState();
    const resources = createResourceState();
    resources.carried.egg = 20;

    // nest_bundle requires TH1, cost { egg: 10 }
    const result = unlockBuilding(unlockState, 'nest_bundle', 1, resources);
    assert.equal(result, true);
    assert.equal(unlockState.nest_bundle, true);
    assert.equal(resources.carried.egg, 10);
  });

  test('unlockBuilding fails and does not mutate state when unaffordable', () => {
    const unlockState = createBuildingUnlockState();
    const resources = createResourceState(); // nothing carried
    const result = unlockBuilding(unlockState, 'nest_bundle', 1, resources);
    assert.equal(result, false);
    assert.equal(!!unlockState.nest_bundle, false);
    assert.equal(resources.carried.egg, 0);
  });

  test('every UNLOCK_CONFIG cost resource id exists in RESOURCE_CONFIG (no dangling references)', async () => {
    const { RESOURCE_CONFIG } = await import('../js/resources.js');
    for (const [buildingId, cfg] of Object.entries(UNLOCK_CONFIG)) {
      for (const resId of Object.keys(cfg.cost)) {
        assert.ok(resId in RESOURCE_CONFIG, `${buildingId}'s unlock cost references unknown resource "${resId}"`);
      }
    }
  });
});
