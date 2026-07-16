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
  spinWheel
} from '../js/luckyWheel.js';
import { createResourceState } from '../js/resources.js';

describe('luckyWheel.js', () => {
  test('every REWARD_TABLE entry references a known resource', async () => {
    const { RESOURCE_CONFIG } = await import('../js/resources.js');
    for (const entry of REWARD_TABLE) {
      assert.ok(entry.resource in RESOURCE_CONFIG, `reward table references unknown resource "${entry.resource}"`);
    }
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
    const result = spinWheel(state, resources, Date.now(), 2);
    assert.equal(result, null);
    assert.equal(state.totalSpins, 0);
  });

  test('spinWheel consumes one ticket, increments totalSpins, and grants a scaled resource reward', () => {
    const state = createLuckyWheelState();
    state.tickets = 1;
    const resources = createResourceState();
    const before = { ...resources.carried };

    const result = spinWheel(state, resources, Date.now(), 3); // TH3 => 1.75x scale
    assert.ok(result, 'spin should succeed with a ticket available');
    assert.equal(state.tickets, 0);
    assert.equal(state.totalSpins, 1);
    assert.ok(REWARD_TABLE.includes(result.baseEntry));
    assert.equal(result.amount, Math.max(1, Math.round(result.baseEntry.amount * 1.75)));
    assert.equal(resources.carried[result.resource], before[result.resource] + result.amount);
    assert.equal(resources.totalCollected[result.resource], result.amount);
  });

  test('spinWheel never mutates the shared REWARD_TABLE itself', () => {
    const state = createLuckyWheelState();
    state.tickets = 1;
    const resources = createResourceState();
    const snapshot = JSON.parse(JSON.stringify(REWARD_TABLE));

    spinWheel(state, resources, Date.now(), 5);
    assert.deepEqual(REWARD_TABLE, snapshot);
  });

  test('spinWheel amount is always at least 1, sampled across the weighted table at TH2 (1x scale)', () => {
    const state = createLuckyWheelState();
    const resources = createResourceState();

    for (let i = 0; i < 200; i++) {
      state.tickets = 1;
      const result = spinWheel(state, resources, Date.now(), 2);
      assert.ok(result.amount >= 1, `got a spin amount below 1: ${result.amount}`);
    }
  });
});
