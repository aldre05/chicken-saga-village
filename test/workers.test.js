import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  createWorkerState,
  getTotalPopulation,
  getTotalAssigned,
  getIdleWorkers,
  assignWorker,
  unassignWorker,
  clampAssignmentsToCaps
} from '../js/workers.js';
import { createResourceState, RESOURCE_IDS } from '../js/resources.js';
import { createBuildingUnlockState } from '../js/buildingUnlocks.js';
import { createBuildingLevelState, getMaxWorkers, getRateMultiplier, getCapMultiplier } from '../js/buildingLevels.js';

describe('workers.js', () => {
  test('createWorkerState initializes every resource id assignment to 0', () => {
    const state = createWorkerState();
    for (const id of RESOURCE_IDS) assert.equal(state.assignments[id], 0);
  });

  test('getTotalPopulation only counts unlocked houses, at their current capacity', () => {
    const unlocks = createBuildingUnlockState(); // house_1 unlocked by default
    const levels = createBuildingLevelState();
    assert.equal(getTotalPopulation(unlocks, levels), 3); // base house capacity

    unlocks.house_2 = true;
    assert.equal(getTotalPopulation(unlocks, levels), 6);

    levels.house_2 = 2; // capacity now 6 for house_2 alone
    assert.equal(getTotalPopulation(unlocks, levels), 3 + 6);
  });

  test('getTotalAssigned sums assignments across all resources', () => {
    const state = createWorkerState();
    state.assignments.egg = 2;
    state.assignments.wood = 1;
    assert.equal(getTotalAssigned(state), 3);
  });

  test('getIdleWorkers = population - assigned', () => {
    const unlocks = createBuildingUnlockState();
    const levels = createBuildingLevelState();
    const workers = createWorkerState();
    workers.assignments.egg = 1;
    assert.equal(getIdleWorkers(workers, unlocks, levels), getTotalPopulation(unlocks, levels) - 1);
  });

  test('assignWorker fails when no idle workers are available', () => {
    const unlocks = createBuildingUnlockState(); // population = 3 (house_1 base)
    const levels = createBuildingLevelState();
    const workers = createWorkerState();
    const resources = createResourceState();
    const maxWorkers = getMaxWorkers('old_coop', levels);
    const rate = getRateMultiplier('old_coop', levels);
    const cap = getCapMultiplier('old_coop', levels);

    // Assign up to population limit (3), 4th should fail on population, not building cap.
    for (let i = 0; i < 3; i++) {
      assert.equal(assignWorker(workers, resources, 'egg', Date.now(), maxWorkers, rate, cap, unlocks, levels), true);
    }
    assert.equal(getIdleWorkers(workers, unlocks, levels), 0);
    assert.equal(assignWorker(workers, resources, 'egg', Date.now(), maxWorkers, rate, cap, unlocks, levels), false);
  });

  test('assignWorker fails when the building\'s own max worker slots are already full', () => {
    const unlocks = createBuildingUnlockState();
    unlocks.house_2 = true;
    unlocks.house_3 = true;
    unlocks.house_4 = true;
    unlocks.house_5 = true; // plenty of population headroom
    const levels = createBuildingLevelState();
    const workers = createWorkerState();
    const resources = createResourceState();
    const maxWorkers = getMaxWorkers('old_coop', levels); // 3 at level 1
    const rate = getRateMultiplier('old_coop', levels);
    const cap = getCapMultiplier('old_coop', levels);

    for (let i = 0; i < maxWorkers; i++) {
      assert.equal(assignWorker(workers, resources, 'egg', Date.now(), maxWorkers, rate, cap, unlocks, levels), true);
    }
    assert.equal(assignWorker(workers, resources, 'egg', Date.now(), maxWorkers, rate, cap, unlocks, levels), false);
    assert.equal(workers.assignments.egg, maxWorkers);
  });

  test('assignWorker flushes accrued production at the OLD count before incrementing', () => {
    const unlocks = createBuildingUnlockState();
    const levels = createBuildingLevelState();
    const workers = createWorkerState();
    const resources = createResourceState();
    const now = Date.now();
    // No workers assigned yet; simulate the building having been idle
    resources.buildingLastCollectedAt.egg = now - 999999;

    assignWorker(workers, resources, 'egg', now, getMaxWorkers('old_coop', levels), 1, 1, unlocks, levels);
    // Idle time before the FIRST worker must not backfill any production.
    assert.equal(resources.carried.egg, 0);
    assert.equal(resources.buildingLastCollectedAt.egg, now);
  });

  test('unassignWorker fails at 0 and does not go negative', () => {
    const workers = createWorkerState();
    const resources = createResourceState();
    assert.equal(unassignWorker(workers, resources, 'egg', Date.now(), 1, 1), false);
    assert.equal(workers.assignments.egg, 0);
  });

  test('unassignWorker flushes accrued production and decrements', () => {
    const workers = createWorkerState();
    const resources = createResourceState();
    const now = Date.now();
    workers.assignments.egg = 2;
    resources.buildingLastCollectedAt.egg = now - 10000;

    const result = unassignWorker(workers, resources, 'egg', now, 1, 1);
    assert.equal(result, true);
    assert.equal(workers.assignments.egg, 1);
    assert.ok(resources.carried.egg > 0, 'should have flushed some production before unassigning');
  });

  test('clampAssignmentsToCaps clamps down over-cap assignments (legacy save migration case)', () => {
    const workers = createWorkerState();
    workers.assignments.egg = 20; // simulate an old save with a flat higher cap
    clampAssignmentsToCaps(workers, () => 5);
    assert.equal(workers.assignments.egg, 5);
  });

  test('clampAssignmentsToCaps leaves in-range assignments untouched', () => {
    const workers = createWorkerState();
    workers.assignments.egg = 3;
    clampAssignmentsToCaps(workers, () => 5);
    assert.equal(workers.assignments.egg, 3);
  });
});
