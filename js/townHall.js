// townHall.js — Town Hall level state and upgrade logic. Gates which
// resources are producible (see resources.js RESOURCE_CONFIG's
// unlockedAtTownHall field — this module just owns the level + costs).

import { canAfford, spendResources } from './resources.js';

export const MAX_TOWN_HALL_LEVEL = 5;

// Cost to go FROM the given level TO level+1. Only ever costs
// resources already unlocked at the *current* level (see design.md).
export const UPGRADE_COSTS = {
  1: { egg: 20, feathers: 10 },
  2: { egg: 50, feathers: 30 },
  3: { egg: 100, feathers: 60 },
  4: { egg: 40, feathers: 50, wood: 80 }
};

export function createTownHallState() {
  return { level: 1 };
}

export function getUpgradeCost(townHallState) {
  return UPGRADE_COSTS[townHallState.level] || null;
}

export function canUpgrade(townHallState, resourceState) {
  if (townHallState.level >= MAX_TOWN_HALL_LEVEL) return false;
  const cost = getUpgradeCost(townHallState);
  return !!cost && canAfford(resourceState, cost);
}

// Returns true if the upgrade happened.
export function upgradeTownHall(townHallState, resourceState) {
  if (!canUpgrade(townHallState, resourceState)) return false;
  const cost = getUpgradeCost(townHallState);
  spendResources(resourceState, cost);
  townHallState.level += 1;
  return true;
}
