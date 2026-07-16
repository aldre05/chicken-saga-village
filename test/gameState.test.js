import { test, describe, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import './helpers/localStorage-mock.js'; // must be imported before gameState.js
import { resetLocalStorage } from './helpers/localStorage-mock.js';
import { createGameState, loadGameState, saveGameState, RESOURCE_IDS } from '../js/gameState.js';
import { HOUSE_IDS } from '../js/buildingLevels.js';

describe('gameState.js', () => {
  beforeEach(() => {
    resetLocalStorage();
  });

  test('createGameState produces a fully-initialized state with every subsystem present', () => {
    const state = createGameState();
    assert.ok(state.resources);
    assert.ok(state.townHall);
    assert.ok(state.inventory);
    assert.ok(state.workers);
    assert.ok(state.buildingUnlocks);
    assert.ok(state.buildingLevels);
    assert.ok(state.questBoard);
    assert.ok(state.luckyWheel);
    assert.ok(state.upkeep);
    assert.equal(state.popularity, 0);
    assert.equal(state.townHall.level, 1);
  });

  test('loadGameState with no prior save returns a fresh game state', () => {
    const state = loadGameState();
    assert.equal(state.townHall.level, 1);
    assert.equal(state.resources.carried.egg, 0);
  });

  test('save -> load round-trip preserves resource, level, and unlock progress exactly', () => {
    const state = createGameState();
    state.resources.carried.egg = 42;
    state.resources.carried.wood = 7;
    state.townHall.level = 3;
    state.buildingLevels.old_coop = 6;
    state.buildingUnlocks.nest_bundle = true;
    state.workers.assignments.egg = 2;
    state.popularity = 15;

    saveGameState(state);
    const loaded = loadGameState();

    assert.equal(loaded.resources.carried.egg, 42);
    assert.equal(loaded.resources.carried.wood, 7);
    assert.equal(loaded.townHall.level, 3);
    assert.equal(loaded.buildingLevels.old_coop, 6);
    assert.equal(loaded.buildingUnlocks.nest_bundle, true);
    assert.equal(loaded.workers.assignments.egg, 2);
    assert.equal(loaded.popularity, 15);
  });

  test('loadGameState recovers gracefully from corrupted JSON in localStorage', () => {
    globalThis.localStorage.setItem('chickenVillageSave', '{ this is not valid json');
    const state = loadGameState();
    // Should fall back to a fresh game state rather than throwing.
    assert.equal(state.townHall.level, 1);
    assert.equal(state.resources.carried.egg, 0);
  });

  test('loadGameState migrates the pre-resource-economy flat egg fields (carriedEggs/totalEggsCollected)', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      resources: { carriedEggs: 77, totalEggsCollected: 200, coopLastCollectedAt: 123456 }
    }));
    const state = loadGameState();
    assert.equal(state.resources.carried.egg, 77);
    assert.equal(state.resources.totalCollected.egg, 200);
    assert.equal(state.resources.buildingLastCollectedAt.egg, 123456);
    // Every other resource should still be present and zeroed, not missing.
    for (const id of RESOURCE_IDS) {
      assert.ok(id in state.resources.carried);
    }
  });

  test('loadGameState migrates the grain -> rice resource rename', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      resources: {
        carried: { egg: 5, grain: 33 },
        totalCollected: { egg: 5, grain: 50 },
        buildingLastCollectedAt: { grain: 999 }
      }
    }));
    const state = loadGameState();
    assert.equal(state.resources.carried.rice, 33);
    assert.equal(state.resources.totalCollected.rice, 50);
    assert.equal(state.resources.buildingLastCollectedAt.rice, 999);
    assert.equal(state.resources.carried.grain, undefined, 'renamed key should not linger in the new shape');
  });

  test('loadGameState migrates grain_store -> rice_paddy unlock/level state without clobbering an existing rice_paddy entry', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      buildingUnlocks: { grain_store: true },
      buildingLevels: { grain_store: 4 }
    }));
    const state = loadGameState();
    assert.equal(state.buildingUnlocks.rice_paddy, true);
    assert.equal(state.buildingLevels.rice_paddy, 4);
  });

  test('loadGameState infers buildingUnlocks for pre-buildingUnlocks saves from production evidence', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      resources: {
        carried: { egg: 0, feathers: 0, wood: 5 },
        totalCollected: { egg: 0, feathers: 0, wood: 12 }
      },
      inventory: { plank: 1 }
      // no buildingUnlocks key at all — simulates a save from before that system existed
    }));
    const state = loadGameState();
    assert.equal(state.buildingUnlocks.woodshed, true, 'wood ever collected implies woodshed was unlocked');
    assert.equal(state.buildingUnlocks.workbench, true, 'having inventory items implies workbench was unlocked');
    assert.equal(!!state.buildingUnlocks.nest_bundle, false, 'no feathers ever collected implies nest_bundle was not unlocked');
  });

  test('loadGameState migrates a legacy flat "houses" count into individual house_N unlocks', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      workers: { houses: 3, assignments: { egg: 1 } }
    }));
    const state = loadGameState();
    assert.equal(state.buildingUnlocks.house_1, true);
    assert.equal(state.buildingUnlocks.house_2, true);
    assert.equal(state.buildingUnlocks.house_3, true);
    assert.equal(!!state.buildingUnlocks.house_4, false);
    assert.equal(!!state.buildingUnlocks.house_5, false);
  });

  test('loadGameState never unlocks more houses than actually exist, even from a corrupted/inflated legacy count', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      workers: { houses: 999 }
    }));
    const state = loadGameState();
    for (const id of HOUSE_IDS) {
      assert.equal(state.buildingUnlocks[id], true);
    }
    assert.equal(Object.keys(state.buildingUnlocks).filter(k => HOUSE_IDS.includes(k)).length, HOUSE_IDS.length);
  });

  test('loadGameState clamps legacy over-cap worker assignments down to the new level-based per-building caps', () => {
    globalThis.localStorage.setItem('chickenVillageSave', JSON.stringify({
      workers: { assignments: { egg: 999 } }, // old flat cap of 10, now way over any real cap
      buildingLevels: { old_coop: 1 } // level 1 -> max 3 workers
    }));
    const state = loadGameState();
    assert.equal(state.workers.assignments.egg, 3);
  });
});
