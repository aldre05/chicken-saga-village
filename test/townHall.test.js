import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  MAX_TOWN_HALL_LEVEL,
  UPGRADE_COSTS,
  createTownHallState,
  getUpgradeCost,
  canUpgrade,
  upgradeTownHall
} from '../js/townHall.js';
import { createResourceState, RESOURCE_CONFIG } from '../js/resources.js';

describe('townHall.js', () => {
  test('createTownHallState starts at level 1', () => {
    assert.equal(createTownHallState().level, 1);
  });

  test('getUpgradeCost returns null at/above MAX_TOWN_HALL_LEVEL (no cost entry defined)', () => {
    const state = { level: MAX_TOWN_HALL_LEVEL };
    assert.equal(getUpgradeCost(state), null);
  });

  test('canUpgrade is false once at MAX_TOWN_HALL_LEVEL, even with unlimited resources', () => {
    const state = { level: MAX_TOWN_HALL_LEVEL };
    const resources = createResourceState();
    for (const id in resources.carried) resources.carried[id] = 999999;
    assert.equal(canUpgrade(state, resources), false);
  });

  test('canUpgrade / upgradeTownHall: succeeds when affordable, spends cost, increments level', () => {
    const state = createTownHallState();
    const resources = createResourceState();
    resources.carried.egg = 100;
    resources.carried.feathers = 100;

    assert.equal(canUpgrade(state, resources), true);
    const result = upgradeTownHall(state, resources);
    assert.equal(result, true);
    assert.equal(state.level, 2);
    assert.equal(resources.carried.egg, 100 - UPGRADE_COSTS[1].egg);
    assert.equal(resources.carried.feathers, 100 - UPGRADE_COSTS[1].feathers);
  });

  test('upgradeTownHall fails and does not mutate state when unaffordable', () => {
    const state = createTownHallState();
    const resources = createResourceState();
    const result = upgradeTownHall(state, resources);
    assert.equal(result, false);
    assert.equal(state.level, 1);
  });

  test('every UPGRADE_COSTS entry only references resources unlocked at that level (per townHall.js design comment)', () => {
    for (const [levelStr, cost] of Object.entries(UPGRADE_COSTS)) {
      const level = Number(levelStr);
      for (const resId of Object.keys(cost)) {
        const gate = RESOURCE_CONFIG[resId].unlockedAtTownHall;
        assert.ok(gate <= level, `TH${level} upgrade cost references "${resId}" (unlocks at TH${gate}) before it's available`);
      }
    }
  });

  test('a full 1 -> MAX_TOWN_HALL_LEVEL upgrade run works given ample resources of every kind', () => {
    const state = createTownHallState();
    const resources = createResourceState();
    for (const id in resources.carried) resources.carried[id] = 999999;

    let upgrades = 0;
    while (canUpgrade(state, resources)) {
      const ok = upgradeTownHall(state, resources);
      assert.equal(ok, true);
      upgrades += 1;
      if (upgrades > MAX_TOWN_HALL_LEVEL + 1) break; // safety valve against infinite loop bugs
    }
    assert.equal(state.level, MAX_TOWN_HALL_LEVEL);
    assert.equal(upgrades, MAX_TOWN_HALL_LEVEL - 1);
  });

  test('MAX_TOWN_HALL_LEVEL is pinned at 10 (add-th10-houses) -- catches an accidental change to the cap itself', () => {
    assert.equal(MAX_TOWN_HALL_LEVEL, 10);
  });

  test('UPGRADE_COSTS levels 7-9 (add-th10-houses) match design.md exactly', () => {
    assert.deepEqual(UPGRADE_COSTS[7], { egg: 250, feathers: 200, wood: 220, rice: 160, stone: 140, ore: 60 });
    assert.deepEqual(UPGRADE_COSTS[8], { egg: 400, feathers: 320, wood: 350, rice: 260, stone: 220, ore: 120 });
    assert.deepEqual(UPGRADE_COSTS[9], { egg: 650, feathers: 520, wood: 560, rice: 420, stone: 360, ore: 220 });
    // Key 9 is the cost to reach level 10 (the max) -- there should be
    // no key 10, matching the table's "cost FROM this level" convention.
    assert.equal(UPGRADE_COSTS[10], undefined);
  });
});
