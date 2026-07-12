// workers.js — worker assignment to resource-producing buildings.
// Population now comes from however many houses are unlocked and
// what level each is at (see buildingLevels.js for capacity/level
// formulas) — this file only tracks assignment of that population to
// resource buildings, not the houses themselves.

import { RESOURCE_IDS, flushAndResetCheckpoint } from './resources.js';
import { HOUSE_IDS, getHouseCapacity } from './buildingLevels.js';

export const WORKER_BONUS_PER_WORKER = 0.05; // +5% production per assigned worker

export function createWorkerState() {
  const assignments = {};
  for (const id of RESOURCE_IDS) assignments[id] = 0;
  return { assignments };
}

export function getTotalPopulation(buildingUnlocks, buildingLevels) {
  return HOUSE_IDS.reduce((sum, houseId) => {
    if (!buildingUnlocks[houseId]) return sum;
    return sum + getHouseCapacity(houseId, buildingLevels);
  }, 0);
}

export function getTotalAssigned(workerState) {
  return Object.values(workerState.assignments).reduce((a, b) => a + b, 0);
}

export function getIdleWorkers(workerState, buildingUnlocks, buildingLevels) {
  return getTotalPopulation(buildingUnlocks, buildingLevels) - getTotalAssigned(workerState);
}

export function assignWorker(workerState, resourceState, resourceId, now, maxWorkers, rateMultiplier, capMultiplier, buildingUnlocks, buildingLevels) {
  if (getIdleWorkers(workerState, buildingUnlocks, buildingLevels) <= 0) return false;
  if (workerState.assignments[resourceId] >= maxWorkers) return false;

  flushAndResetCheckpoint(resourceState, resourceId, now, workerState.assignments[resourceId], rateMultiplier, capMultiplier);
  workerState.assignments[resourceId] += 1;
  return true;
}

export function unassignWorker(workerState, resourceState, resourceId, now, rateMultiplier, capMultiplier) {
  if (workerState.assignments[resourceId] <= 0) return false;

  flushAndResetCheckpoint(resourceState, resourceId, now, workerState.assignments[resourceId], rateMultiplier, capMultiplier);
  workerState.assignments[resourceId] -= 1;
  return true;
}

// Existing saves may have assignments above a building's new
// level-based cap (e.g. old flat cap was 10). Clamps each down rather
// than crashing or silently over-capping.
export function clampAssignmentsToCaps(workerState, getMaxWorkersFn) {
  for (const resourceId of Object.keys(workerState.assignments)) {
    const max = getMaxWorkersFn(resourceId);
    if (workerState.assignments[resourceId] > max) {
      workerState.assignments[resourceId] = max;
    }
  }
}
