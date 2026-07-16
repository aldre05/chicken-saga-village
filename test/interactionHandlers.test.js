import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { HANDLERS, BUILDING_RESOURCE } from '../js/interactionHandlers.js';
import { createGameState } from '../js/gameState.js';
import { interactables } from '../js/map.js';

describe('interactionHandlers.js', () => {
  test('every map interactable has a matching HANDLERS entry (no dead E-press)', () => {
    for (const obj of interactables) {
      assert.ok(HANDLERS[obj.id], `no interact handler registered for map object "${obj.id}"`);
    }
  });

  test('a locked, below-Town-Hall-level building reports its Town Hall requirement, not its resource cost', () => {
    const gameState = createGameState(); // TH1, woodshed locked (requires TH4)
    const result = HANDLERS.woodshed.interact(gameState);
    assert.match(result.text, /Requires Town Hall level 4/);
  });

  test('a locked building that DOES meet the Town Hall gate reports its unlock cost instead', () => {
    const gameState = createGameState();
    gameState.townHall.level = 4; // woodshed requires TH4, meets it but still not unlocked
    const result = HANDLERS.woodshed.interact(gameState);
    assert.match(result.text, /Needs .* to unlock/);
  });

  test('an unlocked resource building with no assigned workers reports nothing is being produced', () => {
    const gameState = createGameState();
    gameState.buildingUnlocks.old_coop = true; // already true by default, explicit for clarity
    const result = HANDLERS.old_coop.interact(gameState);
    assert.match(result.text, /No workers assigned/);
  });

  test('an unlocked resource building with workers and accrued production returns a floating collect amount', () => {
    const gameState = createGameState();
    gameState.workers.assignments.egg = 1;
    gameState.resources.buildingLastCollectedAt.egg = Date.now() - 20000; // 20s accrued
    const result = HANDLERS.old_coop.interact(gameState);
    assert.ok(result.floatingAmount > 0);
    assert.equal(result.floatingIcon, '🥚');
    assert.match(result.text, /^Collected \d+!/);
  });

  test('town_hall handler reports max level text once MAX_TOWN_HALL_LEVEL is reached', async () => {
    const { MAX_TOWN_HALL_LEVEL } = await import('../js/townHall.js');
    const gameState = createGameState();
    gameState.townHall.level = MAX_TOWN_HALL_LEVEL;
    const result = HANDLERS.town_hall.interact(gameState);
    assert.match(result.text, /Max level/);
  });

  test('farmer_npc handler auto-claims every ready quest and lists remaining ones', () => {
    const gameState = createGameState();
    gameState.workers.assignments.egg = 1; // satisfies "assign_worker" quest
    const result = HANDLERS.farmer_npc.interact(gameState);
    assert.match(result.text, /Completed:/);
    assert.ok(gameState.questBoard.claimedQuestIds.includes('assign_worker'));
    // Should not double-claim on a second interact.
    const result2 = HANDLERS.farmer_npc.interact(gameState);
    assert.doesNotMatch(result2.text, /assign_worker/i);
  });

  test('BUILDING_RESOURCE keys match RESOURCE_BUILDINGS exactly', async () => {
    const { RESOURCE_BUILDINGS } = await import('../js/buildingLevels.js');
    assert.deepEqual(Object.keys(BUILDING_RESOURCE).sort(), [...RESOURCE_BUILDINGS].sort());
  });
});
