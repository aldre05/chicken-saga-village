// buildingLevels.js — unbounded per-building levels for resource
// buildings, and capped-at-10 levels for houses. Each resource-building
// level increases worker capacity, production rate, AND storage cap —
// each using its own growth curve (see below), not a single shared one.

import { canAfford, spendResources, RESOURCE_IDS, isResourceUnlocked } from './resources.js';

// Worker slots: linear, capped at 50. Steeper than before (was +1/level)
// so resource buildings can keep pace with how fast house population
// grows (5 houses reach 50 total population in just 5 upgrades each).
export const BASE_WORKER_SLOTS = 3;
export const WORKER_SLOTS_PER_LEVEL = 4;
export const MAX_WORKER_SLOTS = 50;

export const UPGRADE_COST_GROWTH = 1.3;

export const RESOURCE_BUILDINGS = ['old_coop', 'nest_bundle', 'woodshed', 'rice_paddy', 'quarry', 'mine'];
export const HOUSE_IDS = ['house_1', 'house_2', 'house_3', 'house_4', 'house_5'];
export const LEVELABLE_BUILDINGS = [...RESOURCE_BUILDINGS, ...HOUSE_IDS];

export const BASE_UPGRADE_COST = {
  old_coop: { egg: 20 },
  nest_bundle: { egg: 15, feathers: 10 },
  woodshed: { egg: 20, wood: 15 },
  rice_paddy: { egg: 25, rice: 15 },
  quarry: { egg: 30, stone: 15 },
  mine: { egg: 40, ore: 15 },
  house_1: { egg: 15, feathers: 10 },
  house_2: { egg: 15, feathers: 10 },
  house_3: { egg: 15, feathers: 10 },
  house_4: { egg: 15, feathers: 10 },
  house_5: { egg: 15, feathers: 10 }
};

// House-specific: capacity per level, capped at 15 workers/house.
// Bumped from a max of 10 (+50%) after adding Quarry/Mine took the
// resource-building count from 4 to 6 (also +50%) — keeps population
// headroom scaling with how many buildings there are to staff.
export const BASE_HOUSE_CAPACITY = 3;
export const HOUSE_CAPACITY_PER_LEVEL = 3;
export const MAX_HOUSE_CAPACITY = 15;
export const MAX_HOUSE_LEVEL = 1 + (MAX_HOUSE_CAPACITY - BASE_HOUSE_CAPACITY) / HOUSE_CAPACITY_PER_LEVEL; // level 5

export function isHouse(buildingId) {
  return HOUSE_IDS.includes(buildingId);
}

export function createBuildingLevelState() {
  const levels = {};
  for (const id of LEVELABLE_BUILDINGS) levels[id] = 1;
  return levels;
}

export function getMaxWorkers(buildingId, buildingLevels) {
  const level = buildingLevels[buildingId] || 1;
  return Math.min(MAX_WORKER_SLOTS, BASE_WORKER_SLOTS + (level - 1) * WORKER_SLOTS_PER_LEVEL);
}

// Rate scaling: tiered, steeper at higher levels — a level-40 building
// should feel dramatically stronger than a level-10 one, not just
// proportionally. Piecewise-linear and continuous across tier
// boundaries (each tier picks up exactly where the last left off).
const RATE_TIERS = [
  { uptoLevel: 10, bonusPerLevel: 0.15 },
  { uptoLevel: 20, bonusPerLevel: 0.20 },
  { uptoLevel: 30, bonusPerLevel: 0.25 },
  { uptoLevel: Infinity, bonusPerLevel: 0.30 }
];

export function rateMultiplierForLevel(level) {
  let multiplier = 1;
  let fromLevel = 1;
  for (const tier of RATE_TIERS) {
    if (level <= fromLevel) break;
    const levelsInTier = Math.min(level, tier.uptoLevel) - fromLevel;
    multiplier += levelsInTier * tier.bonusPerLevel;
    fromLevel += levelsInTier;
    if (level <= tier.uptoLevel) break;
  }
  return multiplier;
}

export function getRateMultiplier(buildingId, buildingLevels) {
  const level = buildingLevels[buildingId] || 1;
  return rateMultiplierForLevel(level);
}

// Cap scaling: deliberately much steeper than the rate curve — caps
// should stop being a meaningful constraint by around level 30+, so
// this uses compounding growth (same growth rate as upgrade costs)
// rather than the gentler linear-ish rate curve.
const CAP_GROWTH_RATE = 1.3;

export function capMultiplierForLevel(level) {
  return Math.pow(CAP_GROWTH_RATE, level - 1);
}

export function getCapMultiplier(buildingId, buildingLevels) {
  const level = buildingLevels[buildingId] || 1;
  return capMultiplierForLevel(level);
}

export function getHouseCapacity(buildingId, buildingLevels) {
  const level = Math.min(buildingLevels[buildingId] || 1, MAX_HOUSE_LEVEL);
  return Math.min(MAX_HOUSE_CAPACITY, BASE_HOUSE_CAPACITY + (level - 1) * HOUSE_CAPACITY_PER_LEVEL);
}

export function isHouseMaxed(buildingId, buildingLevels) {
  return (buildingLevels[buildingId] || 1) >= MAX_HOUSE_LEVEL;
}

// Upgrade costs now include EVERY resource type currently unlocked at
// the player's Town Hall level, not just the building's original 1-2
// (previously added one extra resource type every 5 levels — replaced
// because it meant a level-40 building might still ignore resources
// the player has had unlocked for ages). Base-cost resources scale at
// the full growth rate; other TH-unlocked resources scale the same
// way but from a smaller base amount, so the "main" resources still
// dominate the cost.
const EXTRA_RESOURCE_BASE_AMOUNT = 10;

export function getUpgradeCost(buildingId, buildingLevels, townHallLevel) {
  const level = buildingLevels[buildingId] || 1;
  const base = BASE_UPGRADE_COST[buildingId];
  const growth = Math.pow(UPGRADE_COST_GROWTH, level - 1);
  const cost = {};

  for (const [resId, amount] of Object.entries(base)) {
    cost[resId] = Math.ceil(amount * growth);
  }

  for (const resId of RESOURCE_IDS) {
    if (resId in cost) continue; // already covered by base cost
    if (isResourceUnlocked(resId, townHallLevel)) {
      cost[resId] = Math.ceil(EXTRA_RESOURCE_BASE_AMOUNT * growth);
    }
  }

  return cost;
}

export function canUpgradeBuilding(buildingId, buildingLevels, resourceState, townHallLevel) {
  if (isHouse(buildingId) && isHouseMaxed(buildingId, buildingLevels)) return false;
  return canAfford(resourceState, getUpgradeCost(buildingId, buildingLevels, townHallLevel));
}

// Returns true if the upgrade happened.
export function upgradeBuilding(buildingId, buildingLevels, resourceState, townHallLevel) {
  if (!canUpgradeBuilding(buildingId, buildingLevels, resourceState, townHallLevel)) return false;
  spendResources(resourceState, getUpgradeCost(buildingId, buildingLevels, townHallLevel));
  buildingLevels[buildingId] = (buildingLevels[buildingId] || 1) + 1;
  return true;
}
