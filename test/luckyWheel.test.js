import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  TICKET_INTERVAL_MS,
  BASE_TICKET_CAP,
  TICKET_CAP_PER_TH_LEVEL,
  REWARD_TABLE,
  createLuckyWheelState,
  isLuckyWheelUnlocked,
  getTicketCap,
  syncTickets,
  getMsUntilNextTicket,
  getRewardScale,
  pickWeighted,
  spinWheel
} from '../js/luckyWheel.js';
import { createResourceState, RESOURCE_IDS } from '../js/resources.js';
import { createInventoryState } from '../js/crafting.js';
import { createHeroRosterState } from '../js/heroes.js';
import { DUNGEON_KEY_ITEM_ID } from '../js/dungeons.js';

// spinWheel() gained required inventoryState/rosterState/gemsState
// params over 3 separate proposals (add-dungeon-keys,
// add-recruit-via-lucky-wheel, add-gems-currency — same
// signature-change precedent as getCraftableRecipes/
// sendHeroToDungeon each time). Every pre-existing call site needs
// all three now, even tests that only care about the resource-reward
// path.
function freshInventory() {
  return createInventoryState();
}
function freshRoster() {
  return createHeroRosterState();
}
// gemsState is "any object exposing a mutable .gems number" per
// luckyWheel.js's own note — in production this is gameState itself.
// A plain {gems: N} object is a faithful, minimal stand-in for tests.
function freshGems(amount = 0) {
  return { gems: amount };
}

describe('luckyWheel.js', () => {
  test('every REWARD_TABLE entry is a known resource, a known inventory item, or one of the special "hero"/"gems" reward ids', () => {
    // Was "every entry references a known resource" -- no longer
    // true since add-dungeon-keys/add-recruit-via-lucky-wheel/
    // add-gems-currency added non-resource reward types. A reward id
    // is exactly one of: a raw resource (RESOURCE_IDS), a real
    // crafted-item recipe id (dungeon_key currently), or one of the
    // two literal special ids 'hero'/'gems' (spinWheel's dedicated
    // branches, neither a stackable resource/item count).
    for (const entry of REWARD_TABLE) {
      const isResource = RESOURCE_IDS.includes(entry.resource);
      const isDungeonKey = entry.resource === DUNGEON_KEY_ITEM_ID;
      const isHero = entry.resource === 'hero';
      const isGems = entry.resource === 'gems';
      assert.ok(isResource || isDungeonKey || isHero || isGems, `reward table entry "${entry.resource}" is neither a resource, a known item, 'hero', nor 'gems'`);
    }
  });

  test('REWARD_TABLE includes exactly one dungeon_key entry, one hero entry, and one gems entry (not accidentally duplicated)', () => {
    const keyEntries = REWARD_TABLE.filter(e => e.resource === DUNGEON_KEY_ITEM_ID);
    const heroEntries = REWARD_TABLE.filter(e => e.resource === 'hero');
    const gemsEntries = REWARD_TABLE.filter(e => e.resource === 'gems');
    assert.equal(keyEntries.length, 1);
    assert.equal(heroEntries.length, 1);
    assert.equal(gemsEntries.length, 1);
    assert.equal(keyEntries[0].amount, 1, 'a key reward should always be exactly 1, not level-scaled');
    assert.equal(heroEntries[0].weight < keyEntries[0].weight, true, 'a hero should be rarer than a key, per design.md');
    assert.equal(gemsEntries[0].amount, 5, 'gems reward amount should match add-gems-currency/design.md\'s Free-Earn Placeholder exactly');
  });

  test('isLuckyWheelUnlocked gates at Town Hall 2', () => {
    assert.equal(isLuckyWheelUnlocked(1), false);
    assert.equal(isLuckyWheelUnlocked(2), true);
    assert.equal(isLuckyWheelUnlocked(5), true);
  });

  test('getTicketCap is 0 below TH2, BASE_TICKET_CAP at TH2, and grows per level after', () => {
    assert.equal(getTicketCap(1), 0);
    assert.equal(getTicketCap(2), BASE_TICKET_CAP);
    assert.equal(getTicketCap(3), BASE_TICKET_CAP + TICKET_CAP_PER_TH_LEVEL);
    assert.equal(getTicketCap(5), BASE_TICKET_CAP + 3 * TICKET_CAP_PER_TH_LEVEL);
  });

  test('syncTickets grants one ticket per elapsed TICKET_INTERVAL_MS, preserving leftover partial time', () => {
    const state = createLuckyWheelState();
    const start = state.lastGeneratedAt;

    syncTickets(state, start + TICKET_INTERVAL_MS * 2.5, 2);
    assert.equal(state.tickets, 2);
    // 0.5 interval of "leftover" time should be preserved in lastGeneratedAt,
    // not discarded — checkpoint should have advanced by exactly 2 intervals.
    assert.equal(state.lastGeneratedAt, start + TICKET_INTERVAL_MS * 2);
  });

  test('syncTickets clamps at the town-hall-level ticket cap', () => {
    const state = createLuckyWheelState();
    const start = state.lastGeneratedAt;
    syncTickets(state, start + TICKET_INTERVAL_MS * 1000, 2); // way more than cap
    assert.equal(state.tickets, getTicketCap(2));
  });

  test('syncTickets is a no-op once already at cap, and just re-checkpoints "now"', () => {
    const state = createLuckyWheelState();
    state.tickets = getTicketCap(2);
    const now = state.lastGeneratedAt + 999999;
    syncTickets(state, now, 2);
    assert.equal(state.tickets, getTicketCap(2));
    assert.equal(state.lastGeneratedAt, now);
  });

  test('getMsUntilNextTicket reports atCap once tickets are maxed', () => {
    const state = createLuckyWheelState();
    state.tickets = getTicketCap(2);
    const result = getMsUntilNextTicket(state, Date.now(), 2);
    assert.equal(result.atCap, true);
    assert.equal(result.msRemaining, 0);
  });

  test('getMsUntilNextTicket counts down correctly mid-interval', () => {
    const state = createLuckyWheelState();
    const start = state.lastGeneratedAt;
    const now = start + TICKET_INTERVAL_MS * 0.25;
    const result = getMsUntilNextTicket(state, now, 2);
    assert.equal(result.atCap, false);
    assert.ok(Math.abs(result.msRemaining - TICKET_INTERVAL_MS * 0.75) < 5);
  });

  test('getRewardScale: TH2=1x, TH3=1.75x, TH4=2.5x, TH5=3.25x (per luckyWheel.js design comment)', () => {
    assert.equal(getRewardScale(2), 1);
    assert.equal(getRewardScale(3), 1.75);
    assert.equal(getRewardScale(4), 2.5);
    assert.equal(getRewardScale(5), 3.25);
  });

  test('spinWheel returns null and does not mutate state when there are no tickets', () => {
    const state = createLuckyWheelState();
    const resources = createResourceState();
    const result = spinWheel(state, resources, freshInventory(), freshRoster(), freshGems(), Date.now(), 2);
    assert.equal(result, null);
    assert.equal(state.totalSpins, 0);
  });

  test('spinWheel consumes one ticket, increments totalSpins, and grants a scaled resource reward', () => {
    const state = createLuckyWheelState();
    state.tickets = 1;
    const resources = createResourceState();

    const result = spinWheel(state, resources, freshInventory(), freshRoster(), freshGems(), Date.now(), 3); // TH3 => 1.75x scale
    assert.ok(result, 'spin should succeed with a ticket available');
    assert.equal(state.tickets, 0);
    assert.equal(state.totalSpins, 1);
    assert.ok(REWARD_TABLE.includes(result.baseEntry));
  });

  test('spinWheel never mutates the shared REWARD_TABLE itself', () => {
    const state = createLuckyWheelState();
    state.tickets = 1;
    const resources = createResourceState();
    const snapshot = JSON.parse(JSON.stringify(REWARD_TABLE));

    spinWheel(state, resources, freshInventory(), freshRoster(), freshGems(), Date.now(), 5);
    assert.deepEqual(REWARD_TABLE, snapshot);
  });

  test('spinWheel amount is always at least 1, sampled across the weighted table at TH2 (1x scale)', () => {
    const state = createLuckyWheelState();
    const resources = createResourceState();

    for (let i = 0; i < 200; i++) {
      state.tickets = 1;
      const result = spinWheel(state, resources, freshInventory(), freshRoster(), freshGems(), Date.now(), 2);
      assert.ok(result.amount >= 1, `got a spin amount below 1: ${result.amount}`);
    }
  });

  // Deterministic reward-branch tests: pin Math.random so the spin
  // lands on a specific REWARD_TABLE entry, rather than relying on
  // enough random samples to probabilistically hit each branch.
  describe('reward branches (deterministic via mocked Math.random)', () => {
    function forceEntry(entry) {
      // pickWeighted walks REWARD_TABLE accumulating weight and picks
      // the first entry where `roll < cumulativeWeight`. Rolling to
      // just before the target entry's own slice starts lands on it.
      const idx = REWARD_TABLE.indexOf(entry);
      const totalWeight = REWARD_TABLE.reduce((sum, e) => sum + e.weight, 0);
      const weightBefore = REWARD_TABLE.slice(0, idx).reduce((sum, e) => sum + e.weight, 0);
      // Land just inside the target entry's slice (a hair past its start).
      const targetRoll = weightBefore + 0.0001;
      Math.random = () => targetRoll / totalWeight;
    }

    let originalRandom;
    const restoreRandom = () => { Math.random = originalRandom; };

    test('a resource-reward spin adds the scaled amount to resources.carried and does NOT touch inventory/roster/gems', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const eggEntry = REWARD_TABLE.find(e => e.resource === 'egg');
      forceEntry(eggEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const resources = createResourceState();
      const inventory = freshInventory();
      const roster = freshRoster();
      const gems = freshGems(50);
      const before = resources.carried.egg;

      const result = spinWheel(state, resources, inventory, roster, gems, Date.now(), 2);
      assert.equal(result.resource, 'egg');
      assert.equal(result.hero, null);
      assert.equal(resources.carried.egg, before + result.amount);
      assert.deepEqual(inventory, {});
      assert.equal(roster.roster.length, 0);
      assert.equal(gems.gems, 50, 'a resource-reward spin must not touch gems');
    });

    test('a dungeon_key-reward spin adds exactly 1 to inventory, unscaled by Town Hall level, and does NOT touch resources/roster/gems', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const keyEntry = REWARD_TABLE.find(e => e.resource === DUNGEON_KEY_ITEM_ID);
      forceEntry(keyEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const resources = createResourceState();
      const inventory = freshInventory();
      const roster = freshRoster();
      const gems = freshGems(50);
      const resourcesBefore = { ...resources.carried };

      // TH5 would scale a resource reward 3.25x -- a key must stay exactly 1.
      const result = spinWheel(state, resources, inventory, roster, gems, Date.now(), 5);
      assert.equal(result.resource, DUNGEON_KEY_ITEM_ID);
      assert.equal(result.amount, 1, 'key rewards must not scale with Town Hall level');
      assert.equal(inventory[DUNGEON_KEY_ITEM_ID], 1);
      assert.deepEqual(resources.carried, resourcesBefore, 'a key reward must not touch raw resources');
      assert.equal(roster.roster.length, 0);
      assert.equal(gems.gems, 50, 'a key-reward spin must not touch gems');
    });

    test('two dungeon_key-reward spins stack the inventory count rather than overwriting it', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const keyEntry = REWARD_TABLE.find(e => e.resource === DUNGEON_KEY_ITEM_ID);
      forceEntry(keyEntry);

      const state = createLuckyWheelState();
      const resources = createResourceState();
      const inventory = freshInventory();
      const roster = freshRoster();
      const gems = freshGems();

      state.tickets = 1;
      spinWheel(state, resources, inventory, roster, gems, Date.now(), 2);
      state.tickets = 1;
      spinWheel(state, resources, inventory, roster, gems, Date.now(), 2);
      assert.equal(inventory[DUNGEON_KEY_ITEM_ID], 2);
    });

    test('a hero-reward spin pushes exactly one correctly-shaped new hero onto the roster, spends NO resources/gems beyond the ticket, and touches no inventory', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const heroEntry = REWARD_TABLE.find(e => e.resource === 'hero');
      forceEntry(heroEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const resources = createResourceState();
      Object.assign(resources.carried, { egg: 1000, feathers: 1000 }); // enough to afford the old paid recruit cost, to prove it's NOT being charged
      const resourcesBefore = { ...resources.carried };
      const inventory = freshInventory();
      const roster = freshRoster();
      const gems = freshGems(1000); // enough to afford buyHeroRollWithGems too, to prove THAT'S not being charged either

      const result = spinWheel(state, resources, inventory, roster, gems, Date.now(), 3);
      assert.equal(result.resource, 'hero');
      assert.ok(result.hero, 'result.hero should be the newly created hero object');
      assert.equal(roster.roster.length, 1);
      assert.equal(roster.roster[0], result.hero, 'the exact same object should be both returned and pushed onto the roster');

      // Full shape check, not just object-shape equality.
      const hero = result.hero;
      assert.ok(hero.id);
      assert.ok(typeof hero.name === 'string');
      assert.ok(['common', 'rare', 'epic'].includes(hero.rarity));
      assert.ok(['warrior', 'archer', 'scholar'].includes(hero.class));
      assert.equal(hero.level, 1);
      assert.equal(hero.xp, 0);
      assert.equal(hero.busyUntil, null);
      assert.equal(hero.dungeonTier, null);
      assert.ok(hero.currentHp > 0);
      assert.deepEqual(hero.equipment, { weapon: null, armor: null, boots: null });

      // No double-charge: neither RECRUIT_COST nor HERO_ROLL_GEM_COST
      // should have been additionally spent.
      assert.deepEqual(resources.carried, resourcesBefore, 'a hero-reward spin must not spend any resources beyond the ticket already consumed by spinWheel itself');
      assert.deepEqual(inventory, {}, 'a hero-reward spin must not touch inventory');
      assert.equal(gems.gems, 1000, 'a hero-reward spin must not touch gems');
    });

    test('a hero-reward spin\'s amount is NOT scaled by Town Hall level (a "1.75 heroes" scaled amount would be nonsensical)', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const heroEntry = REWARD_TABLE.find(e => e.resource === 'hero');
      forceEntry(heroEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const result = spinWheel(state, createResourceState(), freshInventory(), freshRoster(), freshGems(), Date.now(), 5); // TH5 = 3.25x scale for resources
      assert.equal(result.amount, 1);
    });

    test('a gems-reward spin adds exactly the unscaled base amount to gems.gems, and does NOT touch resources/inventory/roster', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const gemsEntry = REWARD_TABLE.find(e => e.resource === 'gems');
      forceEntry(gemsEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const resources = createResourceState();
      const resourcesBefore = { ...resources.carried };
      const inventory = freshInventory();
      const roster = freshRoster();
      const gems = freshGems(10);

      // TH5 would scale a resource reward 3.25x -- gems must stay exactly baseEntry.amount (5).
      const result = spinWheel(state, resources, inventory, roster, gems, Date.now(), 5);
      assert.equal(result.resource, 'gems');
      assert.equal(result.amount, gemsEntry.amount, 'gems reward must not scale with Town Hall level');
      assert.equal(gems.gems, 10 + gemsEntry.amount);
      assert.deepEqual(resources.carried, resourcesBefore, 'a gems-reward spin must not touch raw resources');
      assert.deepEqual(inventory, {}, 'a gems-reward spin must NOT fall into the generic inventory-item catch-all -- this is the exact bug the dedicated gems branch exists to prevent');
      assert.equal(roster.roster.length, 0);
    });
  });

  test('pickWeighted (reused by heroes.js\'s class/rarity rolls too) always returns a real entry, never undefined', () => {
    for (let i = 0; i < 100; i++) {
      const entry = pickWeighted(REWARD_TABLE);
      assert.ok(REWARD_TABLE.includes(entry));
    }
  });
});
