// gameState.js — combines resource, quest board, Town Hall, inventory,
// worker, building-unlock/level, and Lucky Wheel state. Handles
// localStorage persistence, including migration from prior save formats.

import { createResourceState, RESOURCE_IDS } from './resources.js';
import { createTownHallState } from './townHall.js';
import { createInventoryState } from './crafting.js';
import { createWorkerState, clampAssignmentsToCaps } from './workers.js';
import { createBuildingUnlockState } from './buildingUnlocks.js';
import { createBuildingLevelState, getMaxWorkers, HOUSE_IDS } from './buildingLevels.js';
import { createQuestBoardState } from './questBoard.js';
import { createLuckyWheelState } from './luckyWheel.js';
import { createUpkeepState } from './upkeep.js';

const SAVE_KEY = 'chickenVillageSave';

export function createGameState() {
  return {
    resources: createResourceState(),
    townHall: createTownHallState(),
    inventory: createInventoryState(),
    workers: createWorkerState(),
    buildingUnlocks: createBuildingUnlockState(),
    buildingLevels: createBuildingLevelState(),
    questBoard: createQuestBoardState(),
    luckyWheel: createLuckyWheelState(),
    upkeep: createUpkeepState(),
    popularity: 0
  };
}

// Old saves (pre-resource-economy) had resources.carriedEggs /
// resources.totalEggsCollected as flat numbers instead of the new
// carried.egg / totalCollected.egg dict shape. Detect and convert so
// existing players don't lose their egg progress.
function migrateOldResourceShape(rawResources) {
  const fresh = createResourceState();
  if (!rawResources) return fresh;

  const looksOld = typeof rawResources.carriedEggs === 'number';
  if (!looksOld) {
    const merged = {
      carried: { ...fresh.carried, ...(rawResources.carried || {}) },
      totalCollected: { ...fresh.totalCollected, ...(rawResources.totalCollected || {}) },
      buildingLastCollectedAt: { ...fresh.buildingLastCollectedAt, ...(rawResources.buildingLastCollectedAt || {}) }
    };
    // grain → rice rename: old saves have carried.grain, new shape
    // has no "grain" key at all (renamed to "rice"). Carry the value
    // over explicitly so renamed-resource progress isn't lost, then
    // delete the old key — the earlier spread above copies it in
    // verbatim, so without this it lingers in the save forever as
    // dead data alongside the new "rice" key.
    if (rawResources.carried && typeof rawResources.carried.grain === 'number') {
      merged.carried.rice = rawResources.carried.grain;
      delete merged.carried.grain;
    }
    if (rawResources.totalCollected && typeof rawResources.totalCollected.grain === 'number') {
      merged.totalCollected.rice = rawResources.totalCollected.grain;
      delete merged.totalCollected.grain;
    }
    if (rawResources.buildingLastCollectedAt && rawResources.buildingLastCollectedAt.grain) {
      merged.buildingLastCollectedAt.rice = rawResources.buildingLastCollectedAt.grain;
      delete merged.buildingLastCollectedAt.grain;
    }
    return merged;
  }

  fresh.carried.egg = rawResources.carriedEggs;
  fresh.totalCollected.egg = rawResources.totalEggsCollected || 0;
  if (rawResources.coopLastCollectedAt) {
    fresh.buildingLastCollectedAt.egg = rawResources.coopLastCollectedAt;
  }
  return fresh;
}

export function loadGameState() {
  const raw = localStorage.getItem(SAVE_KEY);
  if (!raw) return createGameState();

  try {
    const parsed = JSON.parse(raw);
    const fresh = createGameState();

    const loaded = {
      resources: migrateOldResourceShape(parsed.resources),
      townHall: { ...fresh.townHall, ...parsed.townHall },
      inventory: { ...fresh.inventory, ...parsed.inventory },
      workers: {
        ...fresh.workers,
        assignments: { ...fresh.workers.assignments, ...(parsed.workers && parsed.workers.assignments) }
      },
      buildingUnlocks: { ...fresh.buildingUnlocks, ...parsed.buildingUnlocks },
      buildingLevels: { ...fresh.buildingLevels, ...parsed.buildingLevels },
      questBoard: { ...fresh.questBoard, ...parsed.questBoard },
      luckyWheel: { ...fresh.luckyWheel, ...parsed.luckyWheel },
      upkeep: { ...fresh.upkeep, ...parsed.upkeep },
      popularity: typeof parsed.popularity === 'number' ? parsed.popularity : 0
    };

    // grain_store → rice_paddy rename: carry over unlock/level state
    // under the old key if present, so a returning player doesn't
    // lose an already-unlocked/leveled building.
    if (parsed.buildingUnlocks && parsed.buildingUnlocks.grain_store && !parsed.buildingUnlocks.rice_paddy) {
      loaded.buildingUnlocks.rice_paddy = true;
    }
    if (parsed.buildingLevels && typeof parsed.buildingLevels.grain_store === 'number' && !(parsed.buildingLevels.rice_paddy)) {
      loaded.buildingLevels.rice_paddy = parsed.buildingLevels.grain_store;
    }

    // Existing saves predate buildingUnlocks entirely. Rather than
    // re-locking buildings a returning player was already using
    // (losing felt progress), infer "already unlocked" from evidence
    // they were already producing from it.
    if (!parsed.buildingUnlocks) {
      if (loaded.resources.totalCollected.feathers > 0) loaded.buildingUnlocks.nest_bundle = true;
      if (loaded.resources.totalCollected.wood > 0) loaded.buildingUnlocks.woodshed = true;
      if (loaded.resources.totalCollected.rice > 0) loaded.buildingUnlocks.rice_paddy = true;
      if (Object.keys(loaded.inventory).length > 0) loaded.buildingUnlocks.workbench = true;
    }

    // Even older saves had a single "houses" count instead of 5
    // separate house_1..house_5 buildings. Best-effort migration:
    // unlock that many house slots at level 1 each, so returning
    // players don't lose their worker population outright.
    if (parsed.workers && typeof parsed.workers.houses === 'number') {
      const priorHouseCount = Math.min(HOUSE_IDS.length, parsed.workers.houses);
      for (let i = 0; i < priorHouseCount; i++) {
        loaded.buildingUnlocks[HOUSE_IDS[i]] = true;
      }
    }

    // Existing saves may have worker assignments above the new
    // level-based per-building caps (old flat cap was 10). Clamp down
    // rather than letting a building silently exceed its real cap.
    // (assignments are keyed by resource id, so map back to the
    // building id that produces each one.)
    const resourceToBuildingId = {
      egg: 'old_coop', feathers: 'nest_bundle', wood: 'woodshed',
      rice: 'rice_paddy', stone: 'quarry', ore: 'mine'
    };
    clampAssignmentsToCaps(loaded.workers, (resourceId) => getMaxWorkers(resourceToBuildingId[resourceId], loaded.buildingLevels));

    return loaded;
  } catch (e) {
    console.error('Save corrupted, starting fresh.', e);
    return createGameState();
  }
}

export function saveGameState(gameState) {
  localStorage.setItem(SAVE_KEY, JSON.stringify(gameState));
}

export { RESOURCE_IDS };
