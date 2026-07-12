// resources.js — config-driven, multi-resource production. Each
// resource accumulates on its own timestamp, same offline-safe pattern
// as the original single-coop version (not tied to frame ticks).

// Icon note: 🪶 (feather) and 🪵 (wood log) are Unicode 13.0 (2020)
// glyphs that render as tofu/question-mark boxes on older Windows
// emoji fonts. Swapped for Unicode 6.0-era glyphs with universal support.
export const RESOURCE_CONFIG = {
  egg:      { name: 'Egg',      icon: '🥚', rate: 0.5,  cap: 500, unlockedAtTownHall: 1 },
  feathers: { name: 'Feathers', icon: '🐓', rate: 0.3,  cap: 300, unlockedAtTownHall: 1 },
  wood:     { name: 'Wood',     icon: '🌲', rate: 0.2,  cap: 300, unlockedAtTownHall: 4 },
  rice:     { name: 'Rice',     icon: '🌾', rate: 0.2,  cap: 300, unlockedAtTownHall: 5 },
  stone:    { name: 'Stone',    icon: '🗿', rate: 0.2,  cap: 300, unlockedAtTownHall: 3 },
  ore:      { name: 'Ore',      icon: '⛏️', rate: 0.15, cap: 300, unlockedAtTownHall: 5 }
};

export const RESOURCE_IDS = Object.keys(RESOURCE_CONFIG);

export function createResourceState() {
  const now = Date.now();
  const carried = {};
  const totalCollected = {};
  const buildingLastCollectedAt = {};
  for (const id of RESOURCE_IDS) {
    carried[id] = 0;
    totalCollected[id] = 0;
    buildingLastCollectedAt[id] = now;
  }
  return { carried, totalCollected, buildingLastCollectedAt };
}

export function isResourceUnlocked(resourceId, townHallLevel) {
  return townHallLevel >= RESOURCE_CONFIG[resourceId].unlockedAtTownHall;
}

// rateMultiplier and capMultiplier are now separate — cap grows on a
// much steeper curve than rate (see buildingLevels.js), so they can no
// longer share one "levelMultiplier" parameter.
export function getBuildingStored(resourceState, resourceId, now, assignedWorkers = 0, rateMultiplier = 1, capMultiplier = 1) {
  const cfg = RESOURCE_CONFIG[resourceId];
  const lastAt = resourceState.buildingLastCollectedAt[resourceId] || now;
  const elapsedSeconds = Math.max(0, (now - lastAt) / 1000);
  if (assignedWorkers <= 0) return 0; // no workers = no production, full stop
  const effectiveRate = cfg.rate * rateMultiplier * (1 + assignedWorkers * 0.05);
  const effectiveCap = cfg.cap * capMultiplier;
  return Math.min(effectiveCap, effectiveRate * elapsedSeconds);
}

export function getEffectiveRatePerSecond(resourceId, assignedWorkers, rateMultiplier) {
  if (assignedWorkers <= 0) return 0;
  return RESOURCE_CONFIG[resourceId].rate * rateMultiplier * (1 + assignedWorkers * 0.05);
}

// Called whenever a building's worker count is about to change (assign/
// unassign). Collects whatever was legitimately accumulated under the
// OLD worker count, then resets the timestamp — otherwise the elapsed
// window would span both old and new worker counts but get calculated
// entirely at the new rate (e.g. a building sitting idle with 0 workers
// for an hour, then getting a worker, would wrongly "backfill" an hour
// of production the moment it was assigned).
export function flushAndResetCheckpoint(resourceState, resourceId, now, assignedWorkersBeforeChange, rateMultiplier, capMultiplier) {
  const stored = getBuildingStored(resourceState, resourceId, now, assignedWorkersBeforeChange, rateMultiplier, capMultiplier);
  const collected = Math.floor(stored);
  if (collected > 0) {
    resourceState.carried[resourceId] += collected;
    resourceState.totalCollected[resourceId] += collected;
  }
  resourceState.buildingLastCollectedAt[resourceId] = now;
}

// Returns the amount actually collected (0 if nothing was ready, or if
// the resource isn't unlocked yet at the current Town Hall level).
export function collectFromBuilding(resourceState, resourceId, now, townHallLevel, assignedWorkers = 0, rateMultiplier = 1, capMultiplier = 1) {
  if (!isResourceUnlocked(resourceId, townHallLevel)) return 0;

  const stored = getBuildingStored(resourceState, resourceId, now, assignedWorkers, rateMultiplier, capMultiplier);
  if (stored <= 0) return 0;

  const collected = Math.floor(stored);
  if (collected <= 0) return 0;

  resourceState.carried[resourceId] += collected;
  resourceState.totalCollected[resourceId] += collected;
  resourceState.buildingLastCollectedAt[resourceId] = now;
  return collected;
}

// Checks whether a resource cost dict (e.g. { egg: 20, feathers: 10 })
// can currently be afforded.
export function canAfford(resourceState, costDict) {
  return Object.entries(costDict).every(([id, amount]) => resourceState.carried[id] >= amount);
}

// Subtracts a cost dict from carried resources. Caller must check
// canAfford() first — this doesn't re-check.
export function spendResources(resourceState, costDict) {
  for (const [id, amount] of Object.entries(costDict)) {
    resourceState.carried[id] -= amount;
  }
}
