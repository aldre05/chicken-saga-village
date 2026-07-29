// townHall.js — Town Hall level state and upgrade logic. Gates which
// resources are producible (see resources.js RESOURCE_CONFIG's
// unlockedAtTownHall field — this module just owns the level + costs).

import { canAfford, spendResources } from './resources.js';

export const MAX_TOWN_HALL_LEVEL = 10;

// Cost to go FROM the given level TO level+1. Only ever costs
// resources already unlocked at the *current* level (see design.md).
export const UPGRADE_COSTS = {
  1: { egg: 20, feathers: 10 },
  2: { egg: 50, feathers: 30 },
  3: { egg: 100, feathers: 60 },
  4: { egg: 40, feathers: 50, wood: 80 },
  5: { egg: 80, feathers: 70, wood: 100, rice: 60 },
  6: { egg: 150, feathers: 120, wood: 150, rice: 100, stone: 80 },
  7: { egg: 250, feathers: 200, wood: 220, rice: 160, stone: 140, ore: 60 },
  8: { egg: 400, feathers: 320, wood: 350, rice: 260, stone: 220, ore: 120 },
  9: { egg: 650, feathers: 520, wood: 560, rice: 420, stone: 360, ore: 220 }
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
