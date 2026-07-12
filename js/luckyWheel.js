// luckyWheel.js — a free, non-monetary spin mechanic. Auto-unlocks at
// Town Hall level 2 (no separate unlock cost — it just becomes usable).
// Tickets generate over time, capped by Town Hall level. Rewards are
// small in-game resource amounts only — no real value, no gacha-for-
// money, no PvP "steal" item (that stays deferred along with
// everything else needing multiplayer/legal review).

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
  { resource: 'rice', amount: 5, weight: 8, color: '#a6453a' }
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

function pickWeightedReward() {
  const totalWeight = REWARD_TABLE.reduce((sum, r) => sum + r.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const entry of REWARD_TABLE) {
    if (roll < entry.weight) return entry;
    roll -= entry.weight;
  }
  return REWARD_TABLE[REWARD_TABLE.length - 1];
}

// Rewards scale with Town Hall level so spins stay meaningful late-game
// instead of always handing out the same tiny base amounts.
// TH2=1x, TH3=1.75x, TH4=2.5x, TH5=3.25x
export function getRewardScale(townHallLevel) {
  return 1 + Math.max(0, townHallLevel - 2) * 0.75;
}

// Returns { resource, amount, baseEntry } — baseEntry is the original
// REWARD_TABLE reference (used to find which wheel segment to land the
// spin animation on); amount is the level-scaled actual payout. Never
// mutates REWARD_TABLE itself. Returns null if there were no tickets.
export function spinWheel(state, resourceState, now, townHallLevel) {
  syncTickets(state, now, townHallLevel);
  if (state.tickets <= 0) return null;

  state.tickets -= 1;
  state.totalSpins += 1;

  const baseEntry = pickWeightedReward();
  const scale = getRewardScale(townHallLevel);
  const amount = Math.max(1, Math.round(baseEntry.amount * scale));

  resourceState.carried[baseEntry.resource] += amount;
  resourceState.totalCollected[baseEntry.resource] += amount;

  return { resource: baseEntry.resource, amount, baseEntry };
}
