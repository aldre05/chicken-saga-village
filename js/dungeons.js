// dungeons.js — Dungeon Gate: send one idle hero at a time on a timed
// mission. Resolution is deterministic (hero power vs tier difficulty,
// no hidden dice roll) and lazy — checked whenever the player next
// interacts with a hero/the Dungeon Gate, same pattern as Lucky
// Wheel ticket accrual, not a background timer (see design.md).

import { effectivePower, isHeroBusy, isHeroIdle, grantXp } from './heroes.js';
import { canAfford, spendResources } from './resources.js';

// Tier config per design.md. durationMs uses real-world minutes, same
// timestamp-based approach as everything else in this codebase.
export const DUNGEON_TIERS = {
  easy: {
    id: 'easy', label: 'Easy', difficulty: 10, durationMs: 5 * 60 * 1000,
    entryCost: { egg: 20 },
    fullReward: { egg: 40, feathers: 20 },
    fullXp: 10
  },
  medium: {
    id: 'medium', label: 'Medium', difficulty: 25, durationMs: 15 * 60 * 1000,
    entryCost: { egg: 40, feathers: 20 },
    fullReward: { egg: 100, feathers: 50, wood: 30 },
    fullXp: 25
  },
  hard: {
    id: 'hard', label: 'Hard', difficulty: 45, durationMs: 30 * 60 * 1000,
    entryCost: { egg: 80, feathers: 40, wood: 20 },
    fullReward: { egg: 250, feathers: 120, wood: 80, rice: 50 },
    fullXp: 50
  }
};

export const DUNGEON_TIER_IDS = Object.keys(DUNGEON_TIERS);

export function getDungeonTier(tierId) {
  return DUNGEON_TIERS[tierId] || null;
}

export function canSendHeroToDungeon(hero, tierId, resourceState, now) {
  const tier = getDungeonTier(tierId);
  if (!hero || !tier) return false;
  if (!isHeroIdle(hero, now)) return false;
  return canAfford(resourceState, tier.entryCost);
}

// Deducts entry cost and marks the hero busy until the mission
// resolves. Returns true if the hero was sent, false otherwise (busy
// hero, unaffordable, or unknown tier id) — caller should check
// canSendHeroToDungeon first if it needs to distinguish why.
export function sendHeroToDungeon(hero, tierId, resourceState, now) {
  if (!canSendHeroToDungeon(hero, tierId, resourceState, now)) return false;
  const tier = getDungeonTier(tierId);
  spendResources(resourceState, tier.entryCost);
  hero.busyUntil = now + tier.durationMs;
  hero.dungeonTier = tierId;
  return true;
}

function floorRewardHalf(rewardDict) {
  const halved = {};
  for (const [id, amount] of Object.entries(rewardDict)) {
    halved[id] = Math.floor(amount / 2);
  }
  return halved;
}

// Resolves a single hero's mission once busyUntil has passed.
// Deterministic: effectivePower >= tier.difficulty gives full reward
// + full XP; otherwise 50% reward (floored) + 50% XP — a partial-
// credit outcome rather than a full loss, matching this project's
// established preference for not punishing failure states (see
// design.md). Returns null if there's nothing to resolve (no hero,
// hero was never sent, or still busy). Clears busy state on
// resolution so the hero becomes sendable again.
export function resolveDungeon(hero, resourceState, now) {
  if (!hero || !hero.dungeonTier) return null;
  if (isHeroBusy(hero, now)) return null;

  const tier = getDungeonTier(hero.dungeonTier);
  hero.busyUntil = null;
  hero.dungeonTier = null;
  if (!tier) return null; // defensive: unknown/removed tier id, nothing to award

  const success = effectivePower(hero) >= tier.difficulty;
  const reward = success ? tier.fullReward : floorRewardHalf(tier.fullReward);
  const xp = success ? tier.fullXp : Math.floor(tier.fullXp / 2);

  for (const [id, amount] of Object.entries(reward)) {
    resourceState.carried[id] = (resourceState.carried[id] || 0) + amount;
    resourceState.totalCollected[id] = (resourceState.totalCollected[id] || 0) + amount;
  }
  grantXp(hero, xp);

  return { success, reward, xp };
}

// Resolves every roster hero whose mission has completed. Called
// lazily on interaction with the Dungeon Gate (and could be called
// from the hero panel too) rather than via a background timer.
// Returns an array of { hero, success, reward, xp } for each mission
// that resolved this call (empty array if nothing was ready).
export function resolveReadyDungeons(rosterState, resourceState, now) {
  const results = [];
  for (const hero of rosterState.roster) {
    const result = resolveDungeon(hero, resourceState, now);
    if (result) results.push({ hero, ...result });
  }
  return results;
}
