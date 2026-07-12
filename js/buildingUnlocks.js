// buildingUnlocks.js — every building except the starting Old Coop
// must be unlocked with a one-time resource cost, gated by Town Hall
// level. Old Coop is pre-unlocked (see createBuildingUnlockState).

import { canAfford, spendResources } from './resources.js';

export const UNLOCK_CONFIG = {
  old_coop:    { requiresTownHall: 1, cost: {} }, // pre-unlocked, cost unused
  nest_bundle: { requiresTownHall: 1, cost: { egg: 10 } },
  workbench:   { requiresTownHall: 2, cost: { egg: 20, feathers: 15 } },
  woodshed:    { requiresTownHall: 4, cost: { egg: 60, feathers: 30 } },
  rice_paddy:  { requiresTownHall: 5, cost: { egg: 80, feathers: 60, wood: 30 } },
  quarry:      { requiresTownHall: 3, cost: { egg: 40, feathers: 20 } },
  mine:        { requiresTownHall: 5, cost: { egg: 100, feathers: 60, stone: 30 } },
  house_1:     { requiresTownHall: 1, cost: {} }, // pre-unlocked, cost unused
  house_2:     { requiresTownHall: 2, cost: { egg: 20, feathers: 10 } },
  house_3:     { requiresTownHall: 3, cost: { egg: 40, feathers: 25 } },
  house_4:     { requiresTownHall: 4, cost: { egg: 70, feathers: 45 } },
  house_5:     { requiresTownHall: 5, cost: { egg: 110, feathers: 70 } }
};

export function createBuildingUnlockState() {
  return { old_coop: true, house_1: true };
}

export function isBuildingUnlocked(unlockState, buildingId) {
  return !!unlockState[buildingId];
}

export function meetsTownHallRequirement(buildingId, townHallLevel) {
  const cfg = UNLOCK_CONFIG[buildingId];
  return !cfg || townHallLevel >= cfg.requiresTownHall;
}

export function canUnlockBuilding(buildingId, townHallLevel, resourceState) {
  const cfg = UNLOCK_CONFIG[buildingId];
  if (!cfg) return false;
  if (townHallLevel < cfg.requiresTownHall) return false;
  return canAfford(resourceState, cfg.cost);
}

// Returns true if the unlock happened.
export function unlockBuilding(unlockState, buildingId, townHallLevel, resourceState) {
  if (!canUnlockBuilding(buildingId, townHallLevel, resourceState)) return false;
  spendResources(resourceState, UNLOCK_CONFIG[buildingId].cost);
  unlockState[buildingId] = true;
  return true;
}
