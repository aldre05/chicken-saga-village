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

  test('rateMultiplierForLevel is exactly 1 at level 1 (no growth applied before any upgrade)', () => {
    assert.equal(rateMultiplierForLevel(1), 1);
  });

  // REGRESSION (add-tiered-production-scaling): replaced the OLD
  // additive formula's assertions (levels 1-10 @ +0.15/level flat,
  // then +0.20/level, then +0.25/level -- a linear-per-tier shape)
  // with the new tiered COMPOUNDING formula: each level multiplies
  // the previous level's rate by (1 + growthPerLevel) for its tier,
  // not a flat per-level addition. Tier boundaries also moved (9/19
  // instead of 10/20) and percentages changed (10%/15%/20% instead of
  // 15%/20%/25%) -- see buildingLevels.js's own DECISION HISTORY
  // comment for the full back-and-forth on the exact percentages.
  // Expected values below are computed directly from the formula
  // (levels 2-9: x1.10 each; 10-19: x1.15 each; 20+: x1.20 each) and
  // cross-checked against design.md's own stated magnitude
  // checkpoints (level 9~64/min, 19~260/min, 20~312/min, 50~74,107/min
  // at a 30/min base rate) and tasks.md's Backend spot-check (level 5:
  // 44/min, 15: 149/min, 25: 777/min, 35: 4,810/min) -- two
  // independently-derived sources agreeing is stronger evidence than
  // either alone.
  test('rateMultiplierForLevel compounds exactly 10%/level through the first tier (levels 2-9)', () => {
    assert.ok(Math.abs(rateMultiplierForLevel(2) - 1.1) < 1e-9);
    assert.ok(Math.abs(rateMultiplierForLevel(5) - Math.pow(1.1, 4)) < 1e-9);
    assert.ok(Math.abs(rateMultiplierForLevel(9) - Math.pow(1.1, 8)) < 1e-9);
  });

  test('level 10 is the FIRST level at the new (15%) tier rate, not one level late (the exact off-by-one design.md\'s own task warned about)', () => {
    const atNine = Math.pow(1.1, 8);
    const atTen = atNine * 1.15; // the boundary level itself uses the NEW tier's rate
    assert.ok(Math.abs(rateMultiplierForLevel(10) - atTen) < 1e-9);
  });

  test('rateMultiplierForLevel compounds exactly 15%/level through the second tier (levels 10-19)', () => {
    const atNineteen = Math.pow(1.1, 8) * Math.pow(1.15, 10); // 10 compounding steps: level 10 through 19
    assert.ok(Math.abs(rateMultiplierForLevel(19) - atNineteen) < 1e-9);
  });

  test('level 20 is the FIRST level at the final (20%) tier rate', () => {
    const atNineteen = Math.pow(1.1, 8) * Math.pow(1.15, 10);
    const atTwenty = atNineteen * 1.20;
    assert.ok(Math.abs(rateMultiplierForLevel(20) - atTwenty) < 1e-9);
  });

  test('rateMultiplierForLevel matches design.md\'s magnitude checkpoints at a 30/min base rate (level 9~64, 19~260, 20~312, 50~74,107)', () => {
    const BASE_RATE = 30;
    assert.ok(Math.abs(rateMultiplierForLevel(9) * BASE_RATE - 64.3) < 1, 'level 9 ~64/min');
    assert.ok(Math.abs(rateMultiplierForLevel(19) * BASE_RATE - 260.2) < 1, 'level 19 ~260/min');
    assert.ok(Math.abs(rateMultiplierForLevel(20) * BASE_RATE - 312.2) < 1, 'level 20 ~312/min');
    assert.ok(Math.abs(rateMultiplierForLevel(50) * BASE_RATE - 74107) < 10, 'level 50 ~74,107/min');
  });

  test('rateMultiplierForLevel matches tasks.md\'s independent Backend spot-check at levels 5/15/25/35', () => {
    const BASE_RATE = 30;
    assert.ok(Math.abs(rateMultiplierForLevel(5) * BASE_RATE - 44) < 1, 'level 5: 44/min');
    assert.ok(Math.abs(rateMultiplierForLevel(15) * BASE_RATE - 149) < 1, 'level 15: 149/min');
    assert.ok(Math.abs(rateMultiplierForLevel(25) * BASE_RATE - 777) < 1, 'level 25: 777/min');
    assert.ok(Math.abs(rateMultiplierForLevel(35) * BASE_RATE - 4810) < 1, 'level 35: 4,810/min');
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

  test('HOUSE_IDS extends through house_10 (add-th10-houses)', () => {
    assert.equal(HOUSE_IDS.length, 10);
    for (let i = 6; i <= 10; i++) assert.ok(HOUSE_IDS.includes(`house_${i}`));
  });

  test('BASE_UPGRADE_COST for house_6 through house_10 matches design.md exactly ({egg: 15, feathers: 10} each)', () => {
    for (let i = 6; i <= 10; i++) {
      assert.deepEqual(BASE_UPGRADE_COST[`house_${i}`], { egg: 15, feathers: 10 }, `house_${i} base upgrade cost mismatch`);
    }
  });

  test('house_6-10 extend the generic getMaxWorkers/getHouseCapacity/isHouseMaxed formulas exactly like house_1-5 (no per-house special-casing needed)', () => {
    const levels = createBuildingLevelState();
    for (let i = 6; i <= 10; i++) {
      const id = `house_${i}`;
      assert.equal(getHouseCapacity(id, levels), 3, `${id} base capacity should match house_1-5's formula`);
      levels[id] = MAX_HOUSE_LEVEL;
      assert.equal(getHouseCapacity(id, levels), MAX_HOUSE_CAPACITY);
      assert.equal(isHouseMaxed(id, levels), true);
    }
  });

  test('total village population cap with all 10 houses maxed is exactly 150 (10 x MAX_HOUSE_CAPACITY)', () => {
    const levels = createBuildingLevelState();
    for (const id of HOUSE_IDS) levels[id] = MAX_HOUSE_LEVEL;
    const totalCapacity = HOUSE_IDS.reduce((sum, id) => sum + getHouseCapacity(id, levels), 0);
    assert.equal(totalCapacity, 150);
  });
});
