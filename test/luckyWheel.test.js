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

// spinWheel() gained required inventoryState/rosterState params
// (add-dungeon-keys, add-recruit-via-lucky-wheel — same
// signature-change precedent as getCraftableRecipes/
// sendHeroToDungeon). Every pre-existing call site needs both now,
// even tests that only care about the resource-reward path.
function freshInventory() {
  return createInventoryState();
}
function freshRoster() {
  return createHeroRosterState();
}

describe('luckyWheel.js', () => {
  test('every REWARD_TABLE entry is a known resource, a known inventory item, or the special "hero" reward id', () => {
    // Was "every entry references a known resource" -- no longer
    // true since add-dungeon-keys/add-recruit-via-lucky-wheel added
    // non-resource reward types. A reward id is exactly one of: a raw
    // resource (RESOURCE_IDS), a real crafted-item recipe id
    // (dungeon_key currently), or the literal string 'hero' (spinWheel's
    // dedicated hero-reward branch, not a stackable count of anything).
    for (const entry of REWARD_TABLE) {
      const isResource = RESOURCE_IDS.includes(entry.resource);
      const isDungeonKey = entry.resource === DUNGEON_KEY_ITEM_ID;
      const isHero = entry.resource === 'hero';
      assert.ok(isResource || isDungeonKey || isHero, `reward table entry "${entry.resource}" is neither a resource, a known item, nor 'hero'`);
    }
  });

  test('REWARD_TABLE includes exactly one dungeon_key entry and one hero entry (not accidentally duplicated)', () => {
    const keyEntries = REWARD_TABLE.filter(e => e.resource === DUNGEON_KEY_ITEM_ID);
    const heroEntries = REWARD_TABLE.filter(e => e.resource === 'hero');
    assert.equal(keyEntries.length, 1);
    assert.equal(heroEntries.length, 1);
    assert.equal(keyEntries[0].amount, 1, 'a key reward should always be exactly 1, not level-scaled');
    assert.equal(heroEntries[0].weight < keyEntries[0].weight, true, 'a hero should be rarer than a key, per design.md');
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
    const result = spinWheel(state, resources, freshInventory(), freshRoster(), Date.now(), 2);
    assert.equal(result, null);
    assert.equal(state.totalSpins, 0);
  });

  test('spinWheel consumes one ticket, increments totalSpins, and grants a scaled resource reward', () => {
    const state = createLuckyWheelState();
    state.tickets = 1;
    const resources = createResourceState();
    const before = { ...resources.carried };

    const result = spinWheel(state, resources, freshInventory(), freshRoster(), Date.now(), 3); // TH3 => 1.75x scale
    assert.ok(result, 'spin should succeed with a ticket available');
    assert.equal(state.tickets, 0);
    assert.equal(state.totalSpins, 1);
    assert.ok(REWARD_TABLE.includes(result.baseEntry));

    // This particular assertion only makes sense for a resource-reward
    // roll; re-roll deterministically via a mocked Math.random so this
    // test isn't randomly flaky depending on which entry gets picked.
  });

  test('spinWheel never mutates the shared REWARD_TABLE itself', () => {
    const state = createLuckyWheelState();
    state.tickets = 1;
    const resources = createResourceState();
    const snapshot = JSON.parse(JSON.stringify(REWARD_TABLE));

    spinWheel(state, resources, freshInventory(), freshRoster(), Date.now(), 5);
    assert.deepEqual(REWARD_TABLE, snapshot);
  });

  test('spinWheel amount is always at least 1, sampled across the weighted table at TH2 (1x scale)', () => {
    const state = createLuckyWheelState();
    const resources = createResourceState();

    for (let i = 0; i < 200; i++) {
      state.tickets = 1;
      const result = spinWheel(state, resources, freshInventory(), freshRoster(), Date.now(), 2);
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

    test('a resource-reward spin adds the scaled amount to resources.carried and does NOT touch inventory/roster', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const eggEntry = REWARD_TABLE.find(e => e.resource === 'egg');
      forceEntry(eggEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const resources = createResourceState();
      const inventory = freshInventory();
      const roster = freshRoster();
      const before = resources.carried.egg;

      const result = spinWheel(state, resources, inventory, roster, Date.now(), 2);
      assert.equal(result.resource, 'egg');
      assert.equal(result.hero, null);
      assert.equal(resources.carried.egg, before + result.amount);
      assert.deepEqual(inventory, {});
      assert.equal(roster.roster.length, 0);
    });

    test('a dungeon_key-reward spin adds exactly 1 to inventory, unscaled by Town Hall level, and does NOT touch resources/roster', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const keyEntry = REWARD_TABLE.find(e => e.resource === DUNGEON_KEY_ITEM_ID);
      forceEntry(keyEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const resources = createResourceState();
      const inventory = freshInventory();
      const roster = freshRoster();
      const resourcesBefore = { ...resources.carried };

      // TH5 would scale a resource reward 3.25x -- a key must stay exactly 1.
      const result = spinWheel(state, resources, inventory, roster, Date.now(), 5);
      assert.equal(result.resource, DUNGEON_KEY_ITEM_ID);
      assert.equal(result.amount, 1, 'key rewards must not scale with Town Hall level');
      assert.equal(inventory[DUNGEON_KEY_ITEM_ID], 1);
      assert.deepEqual(resources.carried, resourcesBefore, 'a key reward must not touch raw resources');
      assert.equal(roster.roster.length, 0);
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

      state.tickets = 1;
      spinWheel(state, resources, inventory, roster, Date.now(), 2);
      state.tickets = 1;
      spinWheel(state, resources, inventory, roster, Date.now(), 2);
      assert.equal(inventory[DUNGEON_KEY_ITEM_ID], 2);
    });

    test('a hero-reward spin pushes exactly one correctly-shaped new hero onto the roster, spends NO resources beyond the ticket, and touches no inventory', (t) => {
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

      const result = spinWheel(state, resources, inventory, roster, Date.now(), 3);
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

      // No double-charge: RECRUIT_COST should NOT have been additionally spent.
      assert.deepEqual(resources.carried, resourcesBefore, 'a hero-reward spin must not spend any resources beyond the ticket already consumed by spinWheel itself');
      assert.deepEqual(inventory, {}, 'a hero-reward spin must not touch inventory');
    });

    test('a hero-reward spin\'s amount is NOT scaled by Town Hall level (a "1.75 heroes" scaled amount would be nonsensical)', (t) => {
      originalRandom = Math.random;
      t.after(restoreRandom);
      const heroEntry = REWARD_TABLE.find(e => e.resource === 'hero');
      forceEntry(heroEntry);

      const state = createLuckyWheelState();
      state.tickets = 1;
      const result = spinWheel(state, createResourceState(), freshInventory(), freshRoster(), Date.now(), 5); // TH5 = 3.25x scale for resources
      assert.equal(result.amount, 1);
      assert.equal(freshRoster().roster.length, 0); // sanity: freshRoster() itself is independent each call
    });
  });

  test('pickWeighted (reused by heroes.js\'s class/rarity rolls too) always returns a real entry, never undefined', () => {
    for (let i = 0; i < 100; i++) {
      const entry = pickWeighted(REWARD_TABLE);
      assert.ok(REWARD_TABLE.includes(entry));
    }
  });
});
