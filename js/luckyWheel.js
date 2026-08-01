// luckyWheel.js — a free, non-monetary spin mechanic. Auto-unlocks at
// Town Hall level 2 (no separate unlock cost — it just becomes usable).
// Tickets generate over time, capped by Town Hall level. Rewards are
// small in-game resource amounts, plus (per
// openspec/changes/add-dungeon-keys/) an occasional inventory item
// (dungeon_key), plus (per
// openspec/changes/add-recruit-via-lucky-wheel/) an occasional new
// hero — this is now the ONLY way to recruit a hero, see heroes.js's
// recruitHero()/RECRUIT_COST for the legacy paid path this replaced
// as the primary route. Still no real value, no gacha-for-money, no
// PvP "steal" item (that stays deferred along with everything else
// needing multiplayer/legal review).

import { RESOURCE_IDS } from './resources.js';
import { createRolledHero } from './heroes.js';

// TESTING VALUE: 1 minute per ticket, so playtesting doesn't require
// waiting an hour. Change back to 60*60*1000 (1 hour) before this
// goes anywhere near real players.
export const TICKET_INTERVAL_MS = 60 * 1000;
export const BASE_TICKET_CAP = 5;      // at Town Hall 2
export const TICKET_CAP_PER_TH_LEVEL = 5; // +5 per Town Hall level above 2

export const REWARD_TABLE = [
  { resource: 'egg', amount: 5, weight: 30, color: '#e8b84b' },
  { resource: 'egg', amount: 12, weight: 12, color: '#f4ce6e' },
  { resource: 'feathers', amount: 5, weight: 25, color: '#c9a86a' },
  { resource: 'feathers', amount: 12, weight: 10, color: '#d9c07a' },
  { resource: 'wood', amount: 5, weight: 10, color: '#8a6a4a' },
  { resource: 'rice', amount: 5, weight: 8, color: '#a6453a' },
  // Dungeon Key — openspec/changes/add-dungeon-keys/design.md.
  // Weight deliberately low relative to the 8-30 range above so a key
  // spin feels like a notably good outcome, not a common one. `amount`
  // is fixed at 1 regardless of Town Hall level — see the
  // getRewardScale() exemption below, since scaling a discrete item
  // reward the same way a resource *quantity* scales doesn't make
  // sense (you can't spin "1.75 keys").
  { resource: 'dungeon_key', amount: 1, weight: 5, color: '#7a4fc9' },
  // Hero — openspec/changes/add-recruit-via-lucky-wheel/design.md.
  // Weight 4, lower than dungeon_key's 5, since a hero is a bigger
  // prize than a single key. `amount` is nominal (1) — a hero reward
  // doesn't stack like a resource/item count, see spinWheel()'s hero
  // branch below, which creates one new hero and ignores `amount` as
  // a quantity multiplier entirely.
  { resource: 'hero', amount: 1, weight: 4, color: '#c94fae' }
];

export function createLuckyWheelState() {
  return { tickets: 0, lastGeneratedAt: Date.now(), totalSpins: 0 };
}

export function isLuckyWheelUnlocked(townHallLevel) {
  return townHallLevel >= 2;
}

export function getTicketCap(townHallLevel) {
  if (townHallLevel < 2) return 0;
  return BASE_TICKET_CAP + (townHallLevel - 2) * TICKET_CAP_PER_TH_LEVEL;
}

// Syncs accumulated tickets into state.tickets, preserving any leftover
// partial-hour progress (advances the checkpoint by exactly the
// consumed milliseconds, not a full reset) — same spirit as the
// resource-production checkpointing.
export function syncTickets(state, now, townHallLevel) {
  const cap = getTicketCap(townHallLevel);
  if (state.tickets >= cap) {
    state.lastGeneratedAt = now;
    return;
  }
  const elapsedMs = now - state.lastGeneratedAt;
  const ticketsGained = Math.floor(elapsedMs / TICKET_INTERVAL_MS);
  if (ticketsGained > 0) {
    state.tickets = Math.min(cap, state.tickets + ticketsGained);
    state.lastGeneratedAt += ticketsGained * TICKET_INTERVAL_MS;
  }
}

// Returns { ready: boolean, msRemaining: number } for the "next ticket
// in Xm Ys" display. msRemaining is 0 once tickets are at cap (nothing
// left to count down to).
export function getMsUntilNextTicket(state, now, townHallLevel) {
  const cap = getTicketCap(townHallLevel);
  if (state.tickets >= cap) return { atCap: true, msRemaining: 0 };
  const elapsedMs = (now - state.lastGeneratedAt) % TICKET_INTERVAL_MS;
  return { atCap: false, msRemaining: TICKET_INTERVAL_MS - elapsedMs };
}

// Generic weighted-random pick, exported so other systems (e.g. the
// hero recruitment gacha in heroes.js) can reuse this exact algorithm
// instead of reimplementing it. Entries need a numeric `weight`
// property (or pass a different key name).
export function pickWeighted(entries, weightKey = 'weight') {
  const totalWeight = entries.reduce((sum, e) => sum + e[weightKey], 0);
  let roll = Math.random() * totalWeight;
  for (const entry of entries) {
    if (roll < entry[weightKey]) return entry;
    roll -= entry[weightKey];
  }
  return entries[entries.length - 1];
}

function pickWeightedReward() {
  return pickWeighted(REWARD_TABLE);
}

// Rewards scale with Town Hall level so spins stay meaningful late-game
// instead of always handing out the same tiny base amounts.
// TH2=1x, TH3=1.75x, TH4=2.5x, TH5=3.25x
export function getRewardScale(townHallLevel) {
  return 1 + Math.max(0, townHallLevel - 2) * 0.75;
}

// Returns { resource, amount, baseEntry, hero } — baseEntry is the
// original REWARD_TABLE reference (used to find which wheel segment
// to land the spin animation on); amount is the level-scaled actual
// payout (for resource rewards only — see below); hero is the newly
// created hero object on a hero-reward spin, otherwise null. Never
// mutates REWARD_TABLE itself. Returns null if there were no tickets.
//
// `inventoryState`/`rosterState` are required params (signature
// change, not additive-only — see
// openspec/changes/add-dungeon-keys/design.md and
// add-recruit-via-lucky-wheel/design.md, same precedent as
// add-hero-classes' getCraftableRecipes change): needed because a
// reward can now be an inventory item (dungeon_key) or a hero, not
// always a raw resource. Which of the three a reward is uses the same
// resource-vs-item distinction crafting.js's splitCost() draws (a
// reward id is a raw resource iff it's in RESOURCE_IDS), plus a
// dedicated check for the 'hero' id specifically, since a hero isn't
// a stackable count the way dungeon_key is — it creates one new
// roster entry via heroes.js's createRolledHero() instead of
// incrementing anything. Both non-resource branches share this one
// function/conditional chain rather than being built as two separate
// parallel implementations, per add-recruit-via-lucky-wheel's task
// 1.2 (coordinate, don't duplicate the branching logic).
export function spinWheel(state, resourceState, inventoryState, rosterState, now, townHallLevel) {
  syncTickets(state, now, townHallLevel);
  if (state.tickets <= 0) return null;

  state.tickets -= 1;
  state.totalSpins += 1;

  const baseEntry = pickWeightedReward();
  const isRawResource = RESOURCE_IDS.includes(baseEntry.resource);
  const isHeroReward = baseEntry.resource === 'hero';

  // Level scaling only makes sense for a resource *quantity* (5 eggs
  // -> 12 eggs -> ...). A discrete reward's (item or hero) amount is
  // a count that scaling would turn into a fractional-then-rounded
  // value with no game-design intent behind it ("1.75 keys", "2
  // heroes from one spin") — so non-resource rewards always pay out
  // exactly baseEntry.amount, unscaled.
  const scale = isRawResource ? getRewardScale(townHallLevel) : 1;
  const amount = Math.max(1, Math.round(baseEntry.amount * scale));

  let rolledHero = null;

  if (isRawResource) {
    resourceState.carried[baseEntry.resource] += amount;
    resourceState.totalCollected[baseEntry.resource] += amount;
  } else if (isHeroReward) {
    rolledHero = createRolledHero();
    rosterState.roster.push(rolledHero);
  } else {
    inventoryState[baseEntry.resource] = (inventoryState[baseEntry.resource] || 0) + amount;
  }

  return { resource: baseEntry.resource, amount, baseEntry, hero: rolledHero };
}
