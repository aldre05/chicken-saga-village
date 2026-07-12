// upkeep.js — assigned workers consume a small amount of egg over
// time, village-wide (not tied to any specific building). Timestamp-
// based accrual, same offline-safe pattern as resource production.
// No consequence for hitting 0 egg yet — that's explicitly deferred
// (see openspec/changes/add-industrial-resources/design.md).

import { getTotalAssigned } from './workers.js';

export const EGG_UPKEEP_PER_WORKER_PER_MINUTE = 0.5;

export function createUpkeepState() {
  return { lastCheckedAt: Date.now() };
}

// Deducts accrued upkeep from carried egg, clamped at 0. Advances the
// checkpoint only by the amount of time actually "spent" on whole-egg
// consumption, preserving any sub-egg remainder (same technique used
// for resource production and Lucky Wheel ticket accrual).
export function applyUpkeep(upkeepState, resourceState, workerState, now) {
  const totalAssigned = getTotalAssigned(workerState);
  if (totalAssigned <= 0) {
    upkeepState.lastCheckedAt = now;
    return 0;
  }

  const elapsedMinutes = (now - upkeepState.lastCheckedAt) / 60000;
  const consumed = Math.floor(elapsedMinutes * totalAssigned * EGG_UPKEEP_PER_WORKER_PER_MINUTE);
  if (consumed <= 0) return 0;

  const before = resourceState.carried.egg;
  resourceState.carried.egg = Math.max(0, resourceState.carried.egg - consumed);
  const actuallyConsumed = before - resourceState.carried.egg;

  // Advance checkpoint by exactly the time that produced this many
  // whole eggs of consumption, so leftover fractional time isn't lost.
  const minutesConsumed = consumed / (totalAssigned * EGG_UPKEEP_PER_WORKER_PER_MINUTE);
  upkeepState.lastCheckedAt += minutesConsumed * 60000;

  return actuallyConsumed;
}
