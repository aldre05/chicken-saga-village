// questBoard.js — a real quest list with rewards, replacing the old
// stateless tutorial hints. Farmer Joe shows every not-yet-claimed
// quest each time you talk to him; any that are already met get
// auto-claimed (reward granted) and permanently removed from future
// lists via claimedQuestIds.

export const QUEST_LIST = [
  {
    id: 'assign_worker',
    name: 'Put Someone to Work',
    desc: 'Assign a worker to the Old Coop',
    check: gs => gs.workers.assignments.egg > 0,
    reward: { egg: 15 }
  },
  {
    id: 'collect_eggs',
    name: 'First Harvest',
    desc: 'Collect 10 eggs total',
    check: gs => gs.resources.totalCollected.egg >= 10,
    reward: { egg: 10, feathers: 5 }
  },
  {
    id: 'unlock_nest_bundle',
    name: 'Feather Your Nest',
    desc: 'Unlock the Nest Bundle',
    check: gs => !!gs.buildingUnlocks.nest_bundle,
    reward: { feathers: 15 }
  },
  {
    id: 'upgrade_town_hall_2',
    name: 'Growing Village',
    desc: 'Upgrade Town Hall to level 2',
    check: gs => gs.townHall.level >= 2,
    reward: { egg: 30, feathers: 20 }
  },
  {
    id: 'unlock_house_2',
    name: 'More Room',
    desc: 'Unlock House 2',
    check: gs => !!gs.buildingUnlocks.house_2,
    reward: { egg: 20 }
  },
  {
    id: 'spin_wheel',
    name: 'Feeling Lucky',
    desc: 'Spin the Lucky Wheel once',
    check: gs => gs.luckyWheel.totalSpins > 0,
    reward: { egg: 15, feathers: 15 }
  },
  {
    id: 'craft_item',
    name: 'Handmade',
    desc: 'Craft your first item at the Workbench',
    check: gs => Object.keys(gs.inventory).length > 0,
    reward: { feathers: 10, wood: 10 }
  },
  {
    id: 'unlock_woodshed',
    name: 'Timber!',
    desc: 'Unlock the Woodshed',
    check: gs => !!gs.buildingUnlocks.woodshed,
    reward: { wood: 15 }
  },
  {
    id: 'unlock_rice_paddy',
    name: 'Full Harvest',
    desc: 'Unlock the Rice Paddy',
    check: gs => !!gs.buildingUnlocks.rice_paddy,
    reward: { rice: 20 }
  },
  {
    id: 'unlock_quarry',
    name: 'Rock Solid',
    desc: 'Unlock the Quarry',
    check: gs => !!gs.buildingUnlocks.quarry,
    reward: { stone: 20 }
  },
  {
    id: 'unlock_mine',
    name: 'Strike Ore',
    desc: 'Unlock the Mine',
    check: gs => !!gs.buildingUnlocks.mine,
    reward: { ore: 20 }
  }
];

export function createQuestBoardState() {
  return { claimedQuestIds: [] };
}

export function getAvailableQuests(questBoardState) {
  return QUEST_LIST.filter(q => !questBoardState.claimedQuestIds.includes(q.id));
}

export function getReadyToClaimQuests(gameState) {
  return getAvailableQuests(gameState.questBoard).filter(q => q.check(gameState));
}

export function claimQuest(gameState, quest) {
  for (const [resourceId, amount] of Object.entries(quest.reward)) {
    gameState.resources.carried[resourceId] += amount;
    gameState.resources.totalCollected[resourceId] += amount;
  }
  gameState.questBoard.claimedQuestIds.push(quest.id);
}
