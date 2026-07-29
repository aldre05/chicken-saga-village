// heroes.js — hero roster: recruitment (weighted rarity gacha, reusing
// luckyWheel.js's pickWeighted so both systems share one weighted-
// random algorithm), leveling/XP, and the power number dungeons.js
// checks missions against. Free, non-NFT in-game data only — see
// openspec/changes/add-heroes-dungeons/ for the full non-goals list
// (no ownership, no trading, no PvP, no merge system in this change).

import { canAfford, spendResources } from './resources.js';
import { pickWeighted } from './luckyWheel.js';

export const RECRUIT_COST = { egg: 15, feathers: 20 };
export const MAX_HERO_LEVEL = 20;

// Healing cost scales with rarity investment — a downed epic hero
// costs proportionally more to bring back than a downed common one.
// See openspec/changes/add-dungeon-failure/design.md; multipliers are
// a first guess flagged there for playtesting.
export const HEAL_COST_BASE = { egg: 30, feathers: 20 };
export const HEAL_COST_RARITY_MULTIPLIER = { common: 1, rare: 2, epic: 4 };

// Fixed (non-randomized) base stats per rarity — keeps balance simple
// and predictable for v1 (see design.md). power = attack + defense +
// floor(hp / 5), one transparent number used for dungeon resolution.
export const RARITY_TABLE = [
  { rarity: 'common', weight: 60, attack: 6, defense: 4, hp: 25 },
  { rarity: 'rare', weight: 30, attack: 11, defense: 7, hp: 38 },
  { rarity: 'epic', weight: 10, attack: 18, defense: 12, hp: 55 }
];

const RARITY_BY_ID = Object.fromEntries(RARITY_TABLE.map(r => [r.rarity, r]));

// Placeholder flavor-name pool per rarity — cosmetic only, never
// affects stats. Not final (see design.md Risks/Open Questions);
// fine to expand or replace later without touching any logic here.
const NAME_POOL = {
  common: ['Rooster Ronin', 'Hen Wrangler', 'Yardbird', 'Cluck Squire', 'Barnyard Scout'],
  rare: ['Talon Sergeant', 'Crest Duelist', 'Featherblade', 'Coop Marshal', 'Wing Captain'],
  epic: ['Sunfeather Champion', 'Dawnclaw Sovereign', 'Ironcomb Warlord']
};

function basePower(rarity) {
  const cfg = RARITY_BY_ID[rarity];
  return cfg.attack + cfg.defense + Math.floor(cfg.hp / 5);
}

// Returns { attack, defense, hp, basePower } for a rarity — used by
// display code (roster panel) as well as effectivePower() below.
export function getRarityStats(rarity) {
  const cfg = RARITY_BY_ID[rarity];
  return { attack: cfg.attack, defense: cfg.defense, hp: cfg.hp, basePower: basePower(rarity) };
}

let heroIdCounter = 0;
function makeHeroId() {
  heroIdCounter += 1;
  return `hero_${Date.now().toString(36)}_${heroIdCounter}_${Math.floor(Math.random() * 1e6).toString(36)}`;
}

function pickRandomName(rarity) {
  const pool = NAME_POOL[rarity];
  return pool[Math.floor(Math.random() * pool.length)];
}

export function createHeroRosterState() {
  return { roster: [] };
}

export function canRecruitHero(resourceState) {
  return canAfford(resourceState, RECRUIT_COST);
}

// Returns the newly created hero object, or null if unaffordable.
// Rarity is rolled with the same weighted-pick algorithm the Lucky
// Wheel uses (imported from luckyWheel.js, not reimplemented here).
//
// NOTE ON DATA MODEL: design.md's persistence section lists a hero as
// { id, name, rarity, level, xp, busyUntil }. That's enough to know
// *whether* a hero is busy, but resolving a mission (dungeons.js)
// also needs to know *which tier* it was sent on. Rather than add a
// separate "dungeon state" (design.md explicitly says not to), this
// adds one extra nullable field, `dungeonTier`, alongside `busyUntil`
// on the hero object itself — same spirit as keeping busy/idle status
// on the hero, just enough to make resolution possible. Flagging this
// as a deliberate, minimal deviation from the doc's exact field list
// for the next session/reviewer.
export function recruitHero(rosterState, resourceState) {
  if (!canRecruitHero(resourceState)) return null;
  spendResources(resourceState, RECRUIT_COST);

  const picked = pickWeighted(RARITY_TABLE);
  const hero = {
    id: makeHeroId(),
    name: pickRandomName(picked.rarity),
    rarity: picked.rarity,
    level: 1,
    xp: 0,
    busyUntil: null,
    dungeonTier: null,
    currentHp: RARITY_BY_ID[picked.rarity].hp
  };
  rosterState.roster.push(hero);
  return hero;
}

// power at the hero's current level: basePower scaled +10%/level
// above level 1 (linear, matches every other progression curve in
// this project), capped at MAX_HERO_LEVEL.
export function effectivePower(hero) {
  const level = Math.min(MAX_HERO_LEVEL, hero.level);
  return basePower(hero.rarity) * (1 + (level - 1) * 0.1);
}

export function xpForNextLevel(level) {
  return level * 20;
}

// Time-based: is the mission's timer still actively counting down?
// Used by dungeons.js's resolveDungeon() to know when a mission is
// actually due, and for countdown display. NOT the right check for
// "can this hero be sent on a new mission" -- see isHeroIdle below.
export function isHeroBusy(hero, now) {
  return !!hero.busyUntil && hero.busyUntil > now;
}

// Resolution-based: can this hero be sent on a NEW mission? A hero
// stays unavailable until its current mission is actually resolved
// (busyUntil cleared to null by dungeons.js's resolveDungeon), not
// merely once the timer's nominal duration has elapsed -- see
// design.md: "can't be sent on a second mission until the first
// resolves" (not "until the timer runs out"). Deliberately does NOT
// take `now`/compare against a timestamp: using isHeroBusy's time
// comparison here would let a hero be re-sent in the window between
// its timer expiring and lazy resolution running, silently
// discarding the pending mission's reward, since sendHeroToDungeon
// overwrites dungeonTier unconditionally. (The `now` param is kept,
// unused, so existing `isHeroIdle(hero, now)` call sites don't need
// to change.)
export function isHeroIdle(hero, _now) {
  return hero.busyUntil === null || hero.busyUntil === undefined;
}

export function getHeroById(rosterState, heroId) {
  return rosterState.roster.find(h => h.id === heroId) || null;
}

// Max HP for a hero is fixed by rarity (not level — leveling scales
// power via effectivePower, not HP; see design.md, which only lists
// currentHp as varying). Used both to initialize a new hero and to
// know what heal restores to.
export function getMaxHp(hero) {
  return RARITY_BY_ID[hero.rarity].hp;
}

// A downed hero (currentHp <= 0, set by dungeons.js's resolveDungeon
// on failure) can't be sent on a new mission until healed — see
// dungeons.js's canSendHeroToDungeon, which checks this alongside
// isHeroIdle. Deliberately a separate check from isHeroIdle: a hero
// can be idle (not currently on a mission) AND downed at the same
// time, and those are different reasons a Send action is disabled.
export function isDowned(hero) {
  return hero.currentHp <= 0;
}

// Heal cost scales with rarity investment (see HEAL_COST_RARITY_MULTIPLIER
// above) so a downed epic hero costs proportionally more to recover
// than a downed common one.
export function getHealCost(hero) {
  const mult = HEAL_COST_RARITY_MULTIPLIER[hero.rarity];
  return {
    egg: HEAL_COST_BASE.egg * mult,
    feathers: HEAL_COST_BASE.feathers * mult
  };
}

export function canHealHero(hero, resourceState) {
  return isDowned(hero) && canAfford(resourceState, getHealCost(hero));
}

// Restores currentHp to max. Returns true if the heal happened, false
// if the hero wasn't actually downed or the cost was unaffordable.
export function healHero(hero, resourceState) {
  if (!canHealHero(hero, resourceState)) return false;
  spendResources(resourceState, getHealCost(hero));
  hero.currentHp = getMaxHp(hero);
  return true;
}

// Adds XP and applies any level-ups that cross a threshold. Uncapped
// gain per call means one large reward can chain multiple level-ups
// in a single call (see design.md). No-op once at MAX_HERO_LEVEL.
export function grantXp(hero, amount) {
  if (hero.level >= MAX_HERO_LEVEL || amount <= 0) return;
  hero.xp += amount;
  while (hero.level < MAX_HERO_LEVEL && hero.xp >= xpForNextLevel(hero.level)) {
    hero.xp -= xpForNextLevel(hero.level);
    hero.level += 1;
  }
  if (hero.level >= MAX_HERO_LEVEL) {
    hero.xp = 0; // nothing left to progress toward once capped
  }
}
