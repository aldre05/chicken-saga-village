import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  QUEST_LIST,
  createQuestBoardState,
  getAvailableQuests,
  getReadyToClaimQuests,
  claimQuest
} from '../js/questBoard.js';
import { createGameState } from '../js/gameState.js';

describe('questBoard.js', () => {
  test('quest ids are unique', () => {
    const ids = QUEST_LIST.map(q => q.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('every quest reward only references known resources', async () => {
    const { RESOURCE_CONFIG } = await import('../js/resources.js');
    for (const quest of QUEST_LIST) {
      for (const resId of Object.keys(quest.reward)) {
        assert.ok(resId in RESOURCE_CONFIG, `quest "${quest.id}" reward references unknown resource "${resId}"`);
      }
    }
  });

  test('createQuestBoardState starts with no claimed quests', () => {
    assert.deepEqual(createQuestBoardState().claimedQuestIds, []);
  });

  test('getAvailableQuests excludes already-claimed quests', () => {
    const state = createQuestBoardState();
    state.claimedQuestIds.push('assign_worker');
    const available = getAvailableQuests(state);
    assert.equal(available.some(q => q.id === 'assign_worker'), false);
    assert.equal(available.length, QUEST_LIST.length - 1);
  });

  test('getReadyToClaimQuests only returns quests whose check() passes against the live game state', () => {
    const gameState = createGameState();
    assert.equal(getReadyToClaimQuests(gameState).length, 0);

    gameState.workers.assignments.egg = 1; // satisfies "assign_worker"
    const ready = getReadyToClaimQuests(gameState);
    assert.equal(ready.length, 1);
    assert.equal(ready[0].id, 'assign_worker');
  });

  test('claimQuest grants the reward and marks the quest permanently claimed', () => {
    const gameState = createGameState();
    const quest = QUEST_LIST.find(q => q.id === 'collect_eggs');
    const before = gameState.resources.carried.egg;

    claimQuest(gameState, quest);
    assert.equal(gameState.resources.carried.egg, before + quest.reward.egg);
    assert.equal(gameState.resources.totalCollected.egg, quest.reward.egg);
    assert.ok(gameState.questBoard.claimedQuestIds.includes('collect_eggs'));

    // A claimed quest should no longer show up as available.
    assert.equal(getAvailableQuests(gameState.questBoard).some(q => q.id === 'collect_eggs'), false);
  });
});
