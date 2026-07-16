import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RESOURCE_BUILDINGS,
  HOUSE_IDS,
  LEVELABLE_BUILDINGS,
  BASE_UPGRADE_COST,
  BASE_WORKER_SLOTS,
  WORKER_SLOTS_PER_LEVEL,
  MAX_WORKER_SLOTS,
  MAX_HOUSE_CAPACITY,
  MAX_HOUSE_LEVEL,
  isHouse,
  createBuildingLevelState,
  getMaxWorkers,
  rateMultiplierForLevel,
  getRateMultiplier,
  capMultiplierForLevel,
  getCapMultiplier,
  getHouseCapacity,
  isHouseMaxed,
  getUpgradeCost,
  canUpgradeBuilding,
  upgradeBuilding
} from '../js/buildingLevels.js';
import { createResourceState } from '../js/resources.js';

describe('buildingLevels.js', () => {
  test('createBuildingLevelState starts every levelable building at level 1', () => {
    const levels = createBuildingLevelState();
    for (const id of LEVELABLE_BUILDINGS) {
      assert.equal(levels[id], 1);
    }
  });

  test('isHouse only true for house ids', () => {
    for (const id of HOUSE_IDS) assert.equal(isHouse(id), true);
    for (const id of RESOURCE_BUILDINGS) assert.equal(isHouse(id), false);
  });

  test('getMaxWorkers grows linearly and clamps at MAX_WORKER_SLOTS', () => {
    const levels = createBuildingLevelState();
    assert.equal(getMaxWorkers('old_coop', levels), BASE_WORKER_SLOTS);
    levels.old_coop = 5;
    assert.equal(getMaxWorkers('old_coop', levels), BASE_WORKER_SLOTS + 4 * WORKER_SLOTS_PER_LEVEL);
    levels.old_coop = 1000;
    assert.equal(getMaxWorkers('old_coop', levels), MAX_WORKER_SLOTS);
  });

  test('rateMultiplierForLevel is 1 at level 1 and continuous across tier boundaries', () => {
    assert.equal(rateMultiplierForLevel(1), 1);
    // Tier 1: levels 1-10 @ +0.15/level. Level 10 => 1 + 9*0.15
    const atTenExpected = 1 + 9 * 0.15;
    assert.ok(Math.abs(rateMultiplierForLevel(10) - atTenExpected) < 1e-9);
    // Tier 2 picks up exactly where tier 1 left off at level 11.
    const atElevenExpected = atTenExpected + 1 * 0.20;
    assert.ok(Math.abs(rateMultiplierForLevel(11) - atElevenExpected) < 1e-9);
    // Level 20 -> level 21 crosses into tier 3 (+0.25/level)
    const atTwentyExpected = atTenExpected + 10 * 0.20;
    assert.ok(Math.abs(rateMultiplierForLevel(20) - atTwentyExpected) < 1e-9);
    const atTwentyOneExpected = atTwentyExpected + 1 * 0.25;
    assert.ok(Math.abs(rateMultiplierForLevel(21) - atTwentyOneExpected) < 1e-9);
  });

  test('rateMultiplierForLevel is monotonically non-decreasing (no regressions across the whole curve)', () => {
    let prev = rateMultiplierForLevel(1);
    for (let lvl = 2; lvl <= 60; lvl++) {
      const cur = rateMultiplierForLevel(lvl);
      assert.ok(cur >= prev, `multiplier dropped between level ${lvl - 1} (${prev}) and ${lvl} (${cur})`);
      prev = cur;
    }
  });

  test('getRateMultiplier reads the building\'s own level from the levels map', () => {
    const levels = createBuildingLevelState();
    levels.woodshed = 11;
    assert.equal(getRateMultiplier('woodshed', levels), rateMultiplierForLevel(11));
  });

  test('capMultiplierForLevel compounds at 1.3^(level-1)', () => {
    assert.equal(capMultiplierForLevel(1), 1);
    assert.ok(Math.abs(capMultiplierForLevel(2) - 1.3) < 1e-9);
    assert.ok(Math.abs(capMultiplierForLevel(11) - Math.pow(1.3, 10)) < 1e-6);
  });

  test('getHouseCapacity grows per level and clamps at MAX_HOUSE_CAPACITY beyond MAX_HOUSE_LEVEL', () => {
    const levels = createBuildingLevelState();
    assert.equal(getHouseCapacity('house_1', levels), 3);
    levels.house_1 = MAX_HOUSE_LEVEL;
    assert.equal(getHouseCapacity('house_1', levels), MAX_HOUSE_CAPACITY);
    levels.house_1 = MAX_HOUSE_LEVEL + 50; // saves shouldn't be able to exceed the cap even if corrupted
    assert.equal(getHouseCapacity('house_1', levels), MAX_HOUSE_CAPACITY);
  });

  test('isHouseMaxed flips exactly at MAX_HOUSE_LEVEL', () => {
    const levels = createBuildingLevelState();
    levels.house_1 = MAX_HOUSE_LEVEL - 1;
    assert.equal(isHouseMaxed('house_1', levels), false);
    levels.house_1 = MAX_HOUSE_LEVEL;
    assert.equal(isHouseMaxed('house_1', levels), true);
  });

  test('getUpgradeCost at level 1 equals the base cost exactly (growth^0 = 1)', () => {
    const levels = createBuildingLevelState();
    const cost = getUpgradeCost('old_coop', levels);
    assert.deepEqual(cost, BASE_UPGRADE_COST.old_coop);
  });

  test('getUpgradeCost is a pure function of the building\'s OWN level — unaffected by unrelated buildings\' levels', () => {
    // Regression guard for the exact bug documented in memory.md: cost
    // must never react to Town Hall level or other buildings' state.
    const levelsA = createBuildingLevelState();
    levelsA.old_coop = 6;
    const costA = getUpgradeCost('old_coop', levelsA);

    const levelsB = createBuildingLevelState();
    levelsB.old_coop = 6;
    levelsB.mine = 40; // unrelated building far along
    levelsB.woodshed = 25;
    const costB = getUpgradeCost('old_coop', levelsB);

    assert.deepEqual(costA, costB);
  });

  test('getUpgradeCost is deterministic — same building/level always returns the same cost', () => {
    const levels = createBuildingLevelState();
    levels.mine = 17;
    const first = getUpgradeCost('mine', levels);
    const second = getUpgradeCost('mine', levels);
    assert.deepEqual(first, second);
  });

  test('getUpgradeCost adds exactly one new resource type every EXTRA_RESOURCE_LEVEL_INTERVAL (5) levels', () => {
    const levels = createBuildingLevelState();
    const baseKeys = Object.keys(BASE_UPGRADE_COST.old_coop).length; // old_coop base = {egg} => 1

    levels.old_coop = 1;
    assert.equal(Object.keys(getUpgradeCost('old_coop', levels)).length, baseKeys);

    levels.old_coop = 5; // still under interval boundary (floor((5-1)/5)=0)
    assert.equal(Object.keys(getUpgradeCost('old_coop', levels)).length, baseKeys);

    levels.old_coop = 6; // floor((6-1)/5)=1 -> +1 resource type
    assert.equal(Object.keys(getUpgradeCost('old_coop', levels)).length, baseKeys + 1);

    levels.old_coop = 11; // floor((11-1)/5)=2 -> +2 resource types
    assert.equal(Object.keys(getUpgradeCost('old_coop', levels)).length, baseKeys + 2);
  });

  test('canUpgradeBuilding / upgradeBuilding: succeeds when affordable, spends resources, increments level', () => {
    const levels = createBuildingLevelState();
    const resources = createResourceState();
    resources.carried.egg = 100;

    assert.equal(canUpgradeBuilding('old_coop', levels, resources), true);
    const result = upgradeBuilding('old_coop', levels, resources);
    assert.equal(result, true);
    assert.equal(levels.old_coop, 2);
    assert.equal(resources.carried.egg, 100 - BASE_UPGRADE_COST.old_coop.egg);
  });

  test('upgradeBuilding fails and does not mutate state when unaffordable', () => {
    const levels = createBuildingLevelState();
    const resources = createResourceState(); // 0 of everything
    const result = upgradeBuilding('old_coop', levels, resources);
    assert.equal(result, false);
    assert.equal(levels.old_coop, 1);
    assert.equal(resources.carried.egg, 0);
  });

  test('canUpgradeBuilding is false for a maxed house even with infinite resources', () => {
    const levels = createBuildingLevelState();
    levels.house_1 = MAX_HOUSE_LEVEL;
    const resources = createResourceState();
    for (const id in resources.carried) resources.carried[id] = 999999;
    assert.equal(canUpgradeBuilding('house_1', levels, resources), false);
  });

  test('a maxed house never upgrades even if upgradeBuilding is called directly', () => {
    const levels = createBuildingLevelState();
    levels.house_1 = MAX_HOUSE_LEVEL;
    const resources = createResourceState();
    for (const id in resources.carried) resources.carried[id] = 999999;
    const result = upgradeBuilding('house_1', levels, resources);
    assert.equal(result, false);
    assert.equal(levels.house_1, MAX_HOUSE_LEVEL);
  });
});
