// interactionHandlers.js — ties building/NPC ids to dynamic behavior.
// Each handler's interact() runs when the player presses E in range,
// returns { title, text, floatingAmount?, floatingIcon? } for the
// dialogue box + optional floating popup. map.js stays purely about
// layout/visuals; this is where game logic lives. Upgrading is a
// separate, deliberate action (the on-screen Upgrade button) — E
// never auto-upgrades anything.

import { collectFromBuilding, RESOURCE_CONFIG, isResourceUnlocked } from './resources.js';
import { getUpgradeCost as getTownHallUpgradeCost, MAX_TOWN_HALL_LEVEL } from './townHall.js';
import { getIdleWorkers } from './workers.js';
import { UNLOCK_CONFIG, isBuildingUnlocked, meetsTownHallRequirement } from './buildingUnlocks.js';
import { getMaxWorkers, getRateMultiplier, getCapMultiplier, getHouseCapacity, isHouseMaxed, HOUSE_IDS } from './buildingLevels.js';
import { getReadyToClaimQuests, getAvailableQuests, claimQuest } from './questBoard.js';

// Maps a resource-producing building's id to which resource it produces.
export const BUILDING_RESOURCE = {
  old_coop: 'egg',
  nest_bundle: 'feathers',
  woodshed: 'wood',
  rice_paddy: 'rice',
  quarry: 'stone',
  mine: 'ore'
};

const HOUSE_DISPLAY_NAME = {
  house_1: 'House 1', house_2: 'House 2', house_3: 'House 3',
  house_4: 'House 4', house_5: 'House 5'
};

function formatCost(costDict) {
  const entries = Object.entries(costDict);
  if (entries.length === 0) return 'nothing';
  return entries.map(([id, amt]) => `${amt} ${RESOURCE_CONFIG[id].name}`).join(', ');
}

function makeResourceBuildingHandler(buildingId, resourceId) {
  return {
    interact(gameState) {
      const now = Date.now();
      const cfg = RESOURCE_CONFIG[resourceId];
      const unlockCfg = UNLOCK_CONFIG[buildingId];

      if (!isBuildingUnlocked(gameState.buildingUnlocks, buildingId)) {
        if (!meetsTownHallRequirement(buildingId, gameState.townHall.level)) {
          return { title: cfg.name, text: `Requires Town Hall level ${unlockCfg.requiresTownHall} to unlock.` };
        }
        return { title: cfg.name, text: `Needs ${formatCost(unlockCfg.cost)} to unlock. Use the Unlock button.` };
      }

      if (!isResourceUnlocked(resourceId, gameState.townHall.level)) {
        return { title: cfg.name, text: `Requires Town Hall level ${cfg.unlockedAtTownHall}.` };
      }

      const level = gameState.buildingLevels[buildingId] || 1;
      const titleWithLevel = `${cfg.name} (Lvl ${level})`;
      const maxWorkers = getMaxWorkers(buildingId, gameState.buildingLevels);
      const rateMultiplier = getRateMultiplier(buildingId, gameState.buildingLevels);
      const capMultiplier = getCapMultiplier(buildingId, gameState.buildingLevels);
      const assigned = gameState.workers.assignments[resourceId];

      if (assigned <= 0) {
        return {
          title: titleWithLevel,
          text: `No workers assigned — nothing is being produced. Use the +/- panel to assign one.`
        };
      }

      const ratePerMin = Math.round(cfg.rate * rateMultiplier * (1 + assigned * 0.05) * 60);
      const statusLine = `${ratePerMin}/min · Workers ${assigned}/${maxWorkers}`;

      const collected = collectFromBuilding(gameState.resources, resourceId, now, gameState.townHall.level, assigned, rateMultiplier, capMultiplier);
      if (collected > 0) {
        return {
          title: titleWithLevel,
          text: `Collected ${collected}! ${statusLine}`,
          floatingAmount: collected,
          floatingIcon: cfg.icon
        };
      }

      return { title: titleWithLevel, text: `Nothing to collect yet. ${statusLine}` };
    }
  };
}

function makeHouseHandler(houseId) {
  const displayName = HOUSE_DISPLAY_NAME[houseId];
  return {
    interact(gameState) {
      const unlockCfg = UNLOCK_CONFIG[houseId];

      if (!isBuildingUnlocked(gameState.buildingUnlocks, houseId)) {
        if (!meetsTownHallRequirement(houseId, gameState.townHall.level)) {
          return { title: displayName, text: `Requires Town Hall level ${unlockCfg.requiresTownHall} to unlock.` };
        }
        return { title: displayName, text: `Needs ${formatCost(unlockCfg.cost)} to unlock. Use the Unlock button.` };
      }

      const level = gameState.buildingLevels[houseId] || 1;
      const capacity = getHouseCapacity(houseId, gameState.buildingLevels);
      const idle = getIdleWorkers(gameState.workers, gameState.buildingUnlocks, gameState.buildingLevels);
      const maxedText = isHouseMaxed(houseId, gameState.buildingLevels) ? ' (max level)' : '';

      return {
        title: `${displayName} (Lvl ${level})`,
        text: `Houses ${capacity} workers${maxedText}. Village idle workers: ${idle}. Use the Upgrade button to grow it.`
      };
    }
  };
}

export const HANDLERS = {
  old_coop: makeResourceBuildingHandler('old_coop', 'egg'),
  nest_bundle: makeResourceBuildingHandler('nest_bundle', 'feathers'),
  woodshed: makeResourceBuildingHandler('woodshed', 'wood'),
  rice_paddy: makeResourceBuildingHandler('rice_paddy', 'rice'),
  quarry: makeResourceBuildingHandler('quarry', 'stone'),
  mine: makeResourceBuildingHandler('mine', 'ore'),

  town_hall: {
    interact(gameState) {
      const th = gameState.townHall;
      const titleWithLevel = `Town Hall (Lvl ${th.level})`;

      if (th.level >= MAX_TOWN_HALL_LEVEL) {
        return { title: titleWithLevel, text: `Max level. Land popularity: ${gameState.popularity}.` };
      }

      const cost = getTownHallUpgradeCost(th);
      return {
        title: titleWithLevel,
        text: `Next upgrade needs: ${formatCost(cost)}. Land popularity: ${gameState.popularity}. Use the Upgrade button to grow it.`
      };
    }
  },

  workbench: {
    interact(gameState) {
      const unlockCfg = UNLOCK_CONFIG.workbench;

      if (!isBuildingUnlocked(gameState.buildingUnlocks, 'workbench')) {
        if (!meetsTownHallRequirement('workbench', gameState.townHall.level)) {
          return { title: 'Workbench', text: `Requires Town Hall level ${unlockCfg.requiresTownHall} to unlock.` };
        }
        return { title: 'Workbench', text: `Needs ${formatCost(unlockCfg.cost)} to unlock. Use the Unlock button.` };
      }

      return { title: 'Workbench', text: "Use the crafting panel below to pick what you'd like to make." };
    }
  },

  farmer_npc: {
    interact(gameState) {
      let claimedText = '';
      const ready = getReadyToClaimQuests(gameState);
      if (ready.length > 0) {
        const summaries = ready.map(q => {
          claimQuest(gameState, q);
          return `${q.name} (+${formatCost(q.reward)})`;
        });
        claimedText = `🎉 Completed: ${summaries.join(', ')}\n\n`;
      }

      const remaining = getAvailableQuests(gameState.questBoard);
      if (remaining.length === 0) {
        return { title: 'Farmer Joe', text: claimedText + "You've completed every quest I've got! Great work." };
      }

      const listText = remaining.map(q => `• ${q.name}: ${q.desc} (+${formatCost(q.reward)})`).join('\n');
      return { title: 'Farmer Joe', text: claimedText + `Quests:\n${listText}` };
    }
  }
};

for (const houseId of HOUSE_IDS) {
  HANDLERS[houseId] = makeHouseHandler(houseId);
}
