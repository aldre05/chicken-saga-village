// dungeons.js — Dungeon Gate: send one idle hero at a time on a timed
// mission. Resolution is deterministic (hero power vs tier difficulty,
// no hidden dice roll) and lazy — checked whenever the player next
// interacts with a hero/the Dungeon Gate, same pattern as Lucky
// Wheel ticket accrual, not a background timer (see design.md).

import { effectivePower, isHeroBusy, isHeroIdle, isDowned, grantXp } from './heroes.js';
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

// The consumable required to send any hero on any tier, per
// openspec/changes/add-dungeon-keys/design.md. Spent at send time
// regardless of mission outcome (deliberate — see Resolution section
// of design.md: the scarcity/risk is in committing the key, same
// spirit as entryCost already being non-refundable on failure).
export const DUNGEON_KEY_ITEM_ID = 'dungeon_key';

// Gem cost to buy a key directly, bypassing crafting/wheel-luck
// entirely — see openspec/changes/add-gems-currency/. Placeholder,
// needs playtesting like every other cost in this project (see
// design.md's own Risks/Open Questions: unvalidated until a real
// $-to-gem conversion rate exists).
export const DUNGEON_KEY_GEM_COST = 25;

// `gemsState` is any object exposing a mutable `.gems` number — in
// practice this is `gameState` itself: design.md's Data Model section
// specifies gems as a flat top-level field on gameState (not its own
// sub-object the way inventory/heroes/etc. are), matching this
// project's existing `popularity` flat-number precedent. NOTE:
// design.md's own two sections actually disagree on this — the Data
// Model section shows a flat `gems: 0` field, but the Spend
// Use-Cases code snippet shows `gemsState.gems -=` as if gems lived
// in its own wrapper object. Resolved in favor of the flat field
// (task 1.1's literal wording), with these functions simply taking
// whatever object gems actually lives on rather than assuming a
// `{gems: N}` wrapper exists.
export function canBuyDungeonKeyWithGems(gemsState) {
  return gemsState.gems >= DUNGEON_KEY_GEM_COST;
}

// Returns true if the purchase happened, false if unaffordable.
export function buyDungeonKeyWithGems(gemsState, inventoryState) {
  if (!canBuyDungeonKeyWithGems(gemsState)) return false;
  gemsState.gems -= DUNGEON_KEY_GEM_COST;
  inventoryState[DUNGEON_KEY_ITEM_ID] = (inventoryState[DUNGEON_KEY_ITEM_ID] || 0) + 1;
  return true;
}

export function getDungeonTier(tierId) {
  return DUNGEON_TIERS[tierId] || null;
}

// Signature change, not additive-only: both this and
// sendHeroToDungeon gain a required inventoryState param (see
// design.md, same precedent as add-hero-classes' getCraftableRecipes
// change) — needed to check/spend the key.
export function canSendHeroToDungeon(hero, tierId, resourceState, inventoryState, now) {
  const tier = getDungeonTier(tierId);
  if (!hero || !tier) return false;
  if (!isHeroIdle(hero, now)) return false;
  if (isDowned(hero)) return false;
  if ((inventoryState[DUNGEON_KEY_ITEM_ID] || 0) < 1) return false;
  return canAfford(resourceState, tier.entryCost);
}

// Deducts entry cost AND one dungeon key, then marks the hero busy
// until the mission resolves. Returns true if the hero was sent,
// false otherwise (busy hero, downed, no key, unaffordable, or
// unknown tier id) — caller should check canSendHeroToDungeon first
// if it needs to distinguish why.
export function sendHeroToDungeon(hero, tierId, resourceState, inventoryState, now) {
  if (!canSendHeroToDungeon(hero, tierId, resourceState, inventoryState, now)) return false;
  const tier = getDungeonTier(tierId);
  spendResources(resourceState, tier.entryCost);
  inventoryState[DUNGEON_KEY_ITEM_ID] -= 1;
  hero.busyUntil = now + tier.durationMs;
  hero.dungeonTier = tierId;
  return true;
}

// Resolves a single hero's mission once busyUntil has passed.
// Deterministic: effectivePower >= tier.difficulty gives full reward
// + full XP. On failure the hero is downed (currentHp set to 0,
// nothing awarded) rather than the old 50%-reward/50%-XP partial
// credit — real risk on failure, without permanent loss, since a
// downed hero can be healed (see heroes.js's healHero) rather than
// lost outright. See openspec/changes/add-dungeon-failure/design.md;
// this replaces this project's original softer failure handling.
// Returns null if there's nothing to resolve (no hero, hero was
// never sent, or still busy). Clears busy state on resolution so the
// hero becomes sendable again (once healed, if it was downed).
export function resolveDungeon(hero, resourceState, now) {
  if (!hero || !hero.dungeonTier) return null;
  if (isHeroBusy(hero, now)) return null;

  const tier = getDungeonTier(hero.dungeonTier);
  hero.busyUntil = null;
  hero.dungeonTier = null;
  if (!tier) return null; // defensive: unknown/removed tier id, nothing to award

  const success = effectivePower(hero) >= tier.difficulty;

  if (!success) {
    hero.currentHp = 0;
    return { success: false, reward: {}, xp: 0 };
  }

  const reward = tier.fullReward;
  const xp = tier.fullXp;

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
