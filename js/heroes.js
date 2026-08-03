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

// Weapon-type class gating only — no ability differences between
// classes (see openspec/changes/add-hero-classes/design.md's Goals).
export const HERO_CLASSES = {
  warrior: { name: 'Warrior', weaponType: 'sword' },
  archer: { name: 'Archer', weaponType: 'bow' },
  scholar: { name: 'Scholar', weaponType: 'staff' }
};
export const HERO_CLASS_IDS = Object.keys(HERO_CLASSES);

function pickRandomClass() {
  return HERO_CLASS_IDS[Math.floor(Math.random() * HERO_CLASS_IDS.length)];
}

export const EQUIPMENT_SLOTS = ['weapon', 'armor', 'boots'];

// Equipment items craftable at the Workbench (see crafting.js's
// RECIPES) that can be equipped on a hero. `classRestriction: null`
// means any class can equip it. Power bonuses are a first-guess
// balance value flagged in design.md for playtesting. Heal Potion is
// deliberately NOT here — it's a consumable, not a slot item (see
// design.md's Equipment Items table).
export const EQUIPMENT_ITEMS = {
  sword: { slot: 'weapon', classRestriction: 'warrior', power: 8 },
  bow: { slot: 'weapon', classRestriction: 'archer', power: 8 },
  staff: { slot: 'weapon', classRestriction: 'scholar', power: 8 },
  armor: { slot: 'armor', classRestriction: null, power: 6 },
  boots: { slot: 'boots', classRestriction: null, power: 4 }
};

// Flat itemId -> power map, derived from EQUIPMENT_ITEMS above rather
// than duplicated, matching design.md's effectivePower() snippet
// (`EQUIPMENT_POWER[itemId]`) exactly by name for anyone reading this
// file against the design doc.
export const EQUIPMENT_POWER = Object.fromEntries(
  Object.entries(EQUIPMENT_ITEMS).map(([itemId, cfg]) => [itemId, cfg.power])
);

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

// Pure hero-construction logic, no cost involved — split out per
// openspec/changes/add-recruit-via-lucky-wheel/design.md so the
// Lucky Wheel's hero-reward branch (see luckyWheel.js's spinWheel())
// can create a hero without going through recruitHero()'s resource
// spend (the wheel spin already consumed a ticket to get here;
// charging RECRUIT_COST on top would double-charge). Exported since
// luckyWheel.js needs to call it directly.
export function createRolledHero() {
  const picked = pickWeighted(RARITY_TABLE);
  return {
    id: makeHeroId(),
    name: pickRandomName(picked.rarity),
    rarity: picked.rarity,
    class: pickRandomClass(),
    level: 1,
    xp: 0,
    busyUntil: null,
    dungeonTier: null,
    currentHp: RARITY_BY_ID[picked.rarity].hp,
    equipment: { weapon: null, armor: null, boots: null }
  };
}

// Returns the newly created hero object, or null if unaffordable.
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
//
// STILL HAS REAL CALLERS as of add-recruit-via-lucky-wheel: grepped
// the whole repo (js/ and test/) before touching this per that
// change's task 1.1 — Barracks' recruit button in main.js is being
// removed by that change's Frontend task, but heroes.test.js and
// dungeons.test.js both call recruitHero() directly and rely on its
// exact existing cost-charging behavior. NOT dead code yet; kept as
// a thin wrapper around createRolledHero() (same object shape,
// guaranteed never to drift out of sync with the wheel's hero
// reward) rather than deleted. See that change's task 1.3 note below
// for the dead-code question this raises for RECRUIT_COST/
// canRecruitHero specifically (not this function).
export function recruitHero(rosterState, resourceState) {
  if (!canRecruitHero(resourceState)) return null;
  spendResources(resourceState, RECRUIT_COST);

  const hero = createRolledHero();
  rosterState.roster.push(hero);
  return hero;
}

// Gem cost to buy a hero roll directly, same rarity table as the free
// wheel-based recruit path — see
// openspec/changes/add-gems-currency/. Placeholder, needs
// playtesting like every other cost in this project.
export const HERO_ROLL_GEM_COST = 100;

// `gemsState` is any object exposing a mutable `.gems` number — see
// dungeons.js's canBuyDungeonKeyWithGems for the full note on why
// (design.md's own two sections disagree on whether gems is a flat
// field or wrapped; resolved in favor of flat, matching task 1.1's
// literal wording and this project's `popularity` precedent).
export function canBuyHeroRollWithGems(gemsState) {
  return gemsState.gems >= HERO_ROLL_GEM_COST;
}

// Returns the newly created hero object, or null if unaffordable.
// DELIBERATE DEVIATION from design.md's snippet, which returns a bare
// `true` — returning the actual hero object instead matches every
// sibling "roll a hero" path in this codebase (recruitHero() above,
// spinWheel()'s hero branch in luckyWheel.js), both of which return
// the hero so the caller/UI can show what was actually rolled. A gem
// purchase button needs to display its result same as any other
// recruit path; a bare boolean would throw that information away for
// no reason.
export function buyHeroRollWithGems(gemsState, rosterState) {
  if (!canBuyHeroRollWithGems(gemsState)) return null;
  gemsState.gems -= HERO_ROLL_GEM_COST;
  const hero = createRolledHero();
  rosterState.roster.push(hero);
  return hero;
}

// power at the hero's current level: basePower scaled +10%/level
// above level 1 (linear, matches every other progression curve in
// this project), capped at MAX_HERO_LEVEL, plus the flat sum of all
// equipped items' power bonuses (equipment doesn't scale with level,
// per design.md's formula — it's added after the level scaling, not
// multiplied into it).
export function effectivePower(hero) {
  const level = Math.min(MAX_HERO_LEVEL, hero.level);
  const base = basePower(hero.rarity) * (1 + (level - 1) * 0.1);
  const equipmentBonus = Object.values(hero.equipment || {})
    .filter(Boolean)
    .reduce((sum, itemId) => sum + (EQUIPMENT_POWER[itemId] || 0), 0);
  return base + equipmentBonus;
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

// Can `itemId` currently be equipped onto `hero`? Checks the item
// exists, the hero has at least one in inventory, and (per design.md)
// the class restriction — weapon items are class-locked, armor/boots
// are open to any class.
export function canEquipItem(hero, inventoryState, itemId) {
  const itemCfg = EQUIPMENT_ITEMS[itemId];
  if (!itemCfg) return false;
  if ((inventoryState[itemId] || 0) < 1) return false;
  if (itemCfg.classRestriction && itemCfg.classRestriction !== hero.class) return false;
  return true;
}

// Equips `itemId` into its slot (derived from EQUIPMENT_ITEMS, not
// passed separately — an item only ever belongs to one slot).
// Swapping returns whatever was previously equipped in that slot back
// to inventory rather than destroying it (per design.md's Equipping
// Flow). Returns true if the equip happened.
export function equipHero(hero, inventoryState, itemId) {
  if (!canEquipItem(hero, inventoryState, itemId)) return false;

  const itemCfg = EQUIPMENT_ITEMS[itemId];
  const previousItemId = hero.equipment[itemCfg.slot];

  inventoryState[itemId] -= 1;
  if (previousItemId) {
    inventoryState[previousItemId] = (inventoryState[previousItemId] || 0) + 1;
  }
  hero.equipment[itemCfg.slot] = itemId;
  return true;
}

// Unequips whatever's in `slot`, returning it to inventory. Returns
// true if there was something to unequip, false if the slot was
// already empty (no-op, nothing to return).
export function unequipHero(hero, inventoryState, slot) {
  const itemId = hero.equipment[slot];
  if (!itemId) return false;

  inventoryState[itemId] = (inventoryState[itemId] || 0) + 1;
  hero.equipment[slot] = null;
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

// Heal Potion is a consumable inventory item (crafted at the
// Workbench, see crafting.js's RECIPES), not an equipment slot item —
// design.md's Equipment Items table deliberately excludes it. There
// was no function to actually consume one and apply its effect; the
// Frontend's task 2.4 (consumable-use UI) needs exactly this, so
// adding it here rather than duplicating heal-application logic in
// main.js. Restores 25% of max HP (additive, capped at max) — per
// design.md's table entry "Heal Potion (25%)" and its own Risk note
// distinguishing it from the paid Barracks heal: "potion = quick
// partial heal, Barracks paid heal = full restore". Works on ANY
// hero below max HP, not just downed ones -- healHero()/canHealHero()
// are specifically gated on isDowned, which would incorrectly block
// using a potion on a hero that's merely injured but not yet at 0 HP.
//
// CODE REVIEW NOTE (2026-07-30): this previously set currentHp
// straight to max (a full heal), contradicting design.md's explicit
// "25%" spec and its own stated rationale for why the potion and the
// Barracks heal should feel different (a cheap 10-rice item fully
// outclassing the rarity-scaled paid heal). Fixed to the additive
// 25%-of-max formula. Note this does mean a downed hero (currentHp 0)
// can be brought back above 0 via a potion for far less than the
// Barracks heal cost -- design.md's own Risks/Open Questions section
// already flags potion-vs-paid-heal overlap as something to confirm
// during playtesting, so this is left as-is rather than additionally
// gating potion use against isDowned (that would be inventing a rule
// design.md doesn't state, not fixing a clear deviation from one).
export const HEAL_POTION_ITEM_ID = 'heal_potion';
export const HEAL_POTION_RESTORE_FRACTION = 0.25;

export function canUseHealPotion(hero, inventoryState) {
  return (inventoryState[HEAL_POTION_ITEM_ID] || 0) >= 1 && hero.currentHp < getMaxHp(hero);
}

// Returns true if the potion was used, false if there wasn't one in
// inventory or the hero was already at max HP (nothing to heal).
export function useHealPotion(hero, inventoryState) {
  if (!canUseHealPotion(hero, inventoryState)) return false;
  inventoryState[HEAL_POTION_ITEM_ID] -= 1;
  const maxHp = getMaxHp(hero);
  hero.currentHp = Math.min(maxHp, hero.currentHp + Math.ceil(maxHp * HEAL_POTION_RESTORE_FRACTION));
  return true;
}
