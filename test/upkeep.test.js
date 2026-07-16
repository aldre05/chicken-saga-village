import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { EGG_UPKEEP_PER_WORKER_PER_MINUTE, createUpkeepState, applyUpkeep } from '../js/upkeep.js';
import { createResourceState } from '../js/resources.js';
import { createWorkerState } from '../js/workers.js';

describe('upkeep.js', () => {
  test('createUpkeepState starts checkpointed at "now"', () => {
    const before = Date.now();
    const state = createUpkeepState();
    const after = Date.now();
    assert.ok(state.lastCheckedAt >= before && state.lastCheckedAt <= after);
  });

  test('applyUpkeep is a no-op (but advances the checkpoint) when nobody is assigned', () => {
    const upkeep = createUpkeepState();
    const resources = createResourceState();
    resources.carried.egg = 50;
    const workers = createWorkerState(); // all assignments 0
    const now = Date.now() + 999999;

    const consumed = applyUpkeep(upkeep, resources, workers, now);
    assert.equal(consumed, 0);
    assert.equal(resources.carried.egg, 50);
    assert.equal(upkeep.lastCheckedAt, now);
  });

  test('applyUpkeep consumes egg proportional to assigned workers and elapsed time', () => {
    const upkeep = createUpkeepState();
    const resources = createResourceState();
    resources.carried.egg = 100;
    const workers = createWorkerState();
    workers.assignments.egg = 2; // 2 assigned workers, village-wide upkeep (not tied to building)

    const now = upkeep.lastCheckedAt + 10 * 60000; // 10 minutes later
    const consumed = applyUpkeep(upkeep, resources, workers, now);
    const expected = Math.floor(10 * 2 * EGG_UPKEEP_PER_WORKER_PER_MINUTE); // 10
    assert.equal(consumed, expected);
    assert.equal(resources.carried.egg, 100 - expected);
  });

  test('applyUpkeep clamps at 0 egg rather than going negative', () => {
    const upkeep = createUpkeepState();
    const resources = createResourceState();
    resources.carried.egg = 3;
    const workers = createWorkerState();
    workers.assignments.egg = 10;

    const now = upkeep.lastCheckedAt + 60 * 60000; // 1 hour — would consume way more than 3
    const consumed = applyUpkeep(upkeep, resources, workers, now);
    assert.equal(resources.carried.egg, 0);
    assert.equal(consumed, 3);
  });

  test('applyUpkeep preserves sub-egg fractional remainder instead of losing it', () => {
    const upkeep = createUpkeepState();
    const resources = createResourceState();
    resources.carried.egg = 1000;
    const workers = createWorkerState();
    workers.assignments.egg = 1; // 0.5 egg/min => 1 egg every 2 minutes exactly

    // 90 seconds: 0.75 eggs accrued, floors to 0 consumed — checkpoint must not fully reset.
    const now1 = upkeep.lastCheckedAt + 90000;
    const consumed1 = applyUpkeep(upkeep, resources, workers, now1);
    assert.equal(consumed1, 0);

    // An additional 30 seconds should push the total elapsed (2 min) to exactly 1 egg,
    // proving the earlier 90s of "in-between" time wasn't discarded.
    const now2 = now1 + 30000;
    const consumed2 = applyUpkeep(upkeep, resources, workers, now2);
    assert.equal(consumed2, 1);
  });
});
