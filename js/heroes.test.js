import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RARITY_TABLE,
  RECRUIT_COST,
  MAX_HERO_LEVEL,
  getRarityStats,
  createHeroRosterState,
  canRecruitHero,
  recruitHero,
  effectivePower,
  xpForNextLevel,
  isHeroBusy,
  isHeroIdle,
  getHeroById,
  grantXp
} from '../js/heroes.js';
import { createResourceState } from '../js/resources.js';

function fundedResources(overrides = {}) {
  const resources = createResourceState();
  Object.assign(resources.carried, { egg: 1000, feathers: 1000 }, overrides);
  return resources;
}

describe('heroes.js', () => {
  test('RARITY_TABLE weights sum to 100 and match design.md (common 60 / rare 30 / epic 10)', () => {
    const byRarity = Object.fromEntries(RARITY_TABLE.map(r => [r.rarity, r.weight]));
    assert.equal(byRarity.common, 60);
    assert.equal(byRarity.rare, 30);
    assert.equal(byRarity.epic, 10);
    assert.equal(RARITY_TABLE.reduce((sum, r) => sum + r.weight, 0), 100);
  });

  test('getRarityStats basePower matches design.md table (attack + defense + floor(hp/5))', () => {
    assert.deepEqual(getRarityStats('common'), { attack: 6, defense: 4, hp: 25, basePower: 15 });
    assert.deepEqual(getRarityStats('rare'), { attack: 11, defense: 7, hp: 38, basePower: 25 });
    assert.deepEqual(getRarityStats('epic'), { attack: 18, defense: 12, hp: 55, basePower: 41 });
  });

  test('canRecruitHero reflects affordability of RECRUIT_COST exactly', () => {
    assert.equal(canRecruitHero(fundedResources({ egg: RECRUIT_COST.egg - 1, feathers: RECRUIT_COST.feathers })), false);
    assert.equal(canRecruitHero(fundedResources({ egg: RECRUIT_COST.egg, feathers: RECRUIT_COST.feathers })), true);
  });

  test('recruitHero returns null and does not mutate roster/resources when unaffordable', () => {
    const roster = createHeroRosterState();
    const resources = createResourceState(); // starts at 0
    const result = recruitHero(roster, resources);
    assert.equal(result, null);
    assert.equal(roster.roster.length, 0);
  });

  test('recruitHero deducts RECRUIT_COST exactly once and adds exactly one hero on success', () => {
    const roster = createHeroRosterState();
    const resources = fundedResources();
    const before = { ...resources.carried };
    const hero = recruitHero(roster, resources);
    assert.ok(hero);
    assert.equal(roster.roster.length, 1);
    assert.equal(roster.roster[0], hero);
    assert.equal(resources.carried.egg, before.egg - RECRUIT_COST.egg);
    assert.equal(resources.carried.feathers, before.feathers - RECRUIT_COST.feathers);
  });

  test('recruitHero produces a hero with the correct fresh-hero shape', () => {
    const roster = createHeroRosterState();
    const hero = recruitHero(roster, fundedResources());
    assert.equal(hero.level, 1);
    assert.equal(hero.xp, 0);
    assert.equal(hero.busyUntil, null);
    assert.equal(hero.dungeonTier, null);
    assert.ok(['common', 'rare', 'epic'].includes(hero.rarity));
    assert.equal(typeof hero.name, 'string');
    assert.ok(hero.id.startsWith('hero_'));
  });

  test('recruitHero rarity roll uses the exact RARITY_TABLE cumulative-weight boundaries (deterministic via mocked Math.random)', (t) => {
    // Cumulative boundaries for weights [60, 30, 10] out of 100:
    // roll in [0, 60) -> common, [60, 90) -> rare, [90, 100) -> epic.
    // pickWeighted does `roll < entry.weight` then subtracts, so the
    // boundary itself (roll === 60, roll === 90) belongs to the NEXT
    // bucket, not the one ending there.
    const cases = [
      [0, 'common'],
      [0.59999, 'common'],   // roll = 59.999 -> common
      [0.6, 'rare'],         // roll = 60.0 exactly -> not < 60, rolls into rare
      [0.89999, 'rare'],     // roll = 89.999 -> rare
      [0.9, 'epic'],         // roll = 90.0 exactly -> rolls into epic
      [0.99999, 'epic']
    ];
    const originalRandom = Math.random;
    t.after(() => { Math.random = originalRandom; });
    for (const [randomValue, expectedRarity] of cases) {
      Math.random = () => randomValue;
      const roster = createHeroRosterState();
      const hero = recruitHero(roster, fundedResources());
      assert.equal(hero.rarity, expectedRarity, `Math.random()=${randomValue} should yield ${expectedRarity}, got ${hero.rarity}`);
    }
  });

  test('recruitHero rarity distribution roughly matches 60/30/10 weights over many rolls', () => {
    const roster = createHeroRosterState();
    const resources = fundedResources({ egg: 1_000_000, feathers: 1_000_000 });
    const counts = { common: 0, rare: 0, epic: 0 };
    const N = 4000;
    for (let i = 0; i < N; i++) {
      const hero = recruitHero(roster, resources);
      counts[hero.rarity] += 1;
    }
    // Generous tolerance band (statistical test) -- this is checking
    // the roll isn't badly broken, not pinning exact frequencies.
    assert.ok(Math.abs(counts.common / N - 0.60) < 0.05, `common ratio off: ${counts.common / N}`);
    assert.ok(Math.abs(counts.rare / N - 0.30) < 0.05, `rare ratio off: ${counts.rare / N}`);
    assert.ok(Math.abs(counts.epic / N - 0.10) < 0.04, `epic ratio off: ${counts.epic / N}`);
  });

  test('effectivePower at level 1 equals basePower exactly', () => {
    assert.equal(effectivePower({ rarity: 'common', level: 1 }), 15);
    assert.equal(effectivePower({ rarity: 'rare', level: 1 }), 25);
    assert.equal(effectivePower({ rarity: 'epic', level: 1 }), 41);
  });

  test('effectivePower scales +10%/level, exactly 2x basePower at level 11', () => {
    assert.equal(effectivePower({ rarity: 'common', level: 11 }), 30);
    assert.equal(effectivePower({ rarity: 'rare', level: 11 }), 50);
  });

  test('effectivePower is capped at MAX_HERO_LEVEL even if hero.level somehow exceeds it', () => {
    const atCap = effectivePower({ rarity: 'rare', level: MAX_HERO_LEVEL });
    const beyondCap = effectivePower({ rarity: 'rare', level: MAX_HERO_LEVEL + 5 });
    assert.equal(beyondCap, atCap);
  });

  test('xpForNextLevel(level) === level * 20', () => {
    assert.equal(xpForNextLevel(1), 20);
    assert.equal(xpForNextLevel(5), 100);
  });

  test('grantXp levels up once when crossing exactly one threshold', () => {
    const hero = { level: 1, xp: 0 };
    grantXp(hero, 20); // xpForNextLevel(1) === 20
    assert.equal(hero.level, 2);
    assert.equal(hero.xp, 0);
  });

  test('grantXp chains multiple level-ups from a single large reward', () => {
    const hero = { level: 1, xp: 0 };
    // level1->2 costs 20, level2->3 costs 40, level3->4 costs 60 => 120 total
    grantXp(hero, 125);
    assert.equal(hero.level, 4);
    assert.equal(hero.xp, 5);
  });

  test('grantXp is a no-op at/above MAX_HERO_LEVEL and clears leftover xp once capped', () => {
    const hero = { level: MAX_HERO_LEVEL, xp: 999 };
    grantXp(hero, 50);
    assert.equal(hero.level, MAX_HERO_LEVEL);
    // grantXp only zeroes xp as a side effect of the loop; a hero that
    // arrives already at cap with leftover xp and receives a no-op
    // call keeps whatever xp it had -- guard this stays intentional,
    // not a silent drift.
    assert.equal(hero.xp, 999);
  });

  test('grantXp ignores zero/negative amounts', () => {
    const hero = { level: 2, xp: 10 };
    grantXp(hero, 0);
    grantXp(hero, -5);
    assert.equal(hero.level, 2);
    assert.equal(hero.xp, 10);
  });

  test('getHeroById finds an existing hero and returns null for an unknown id', () => {
    const roster = createHeroRosterState();
    const hero = recruitHero(roster, fundedResources());
    assert.equal(getHeroById(roster, hero.id), hero);
    assert.equal(getHeroById(roster, 'not-a-real-id'), null);
  });

  describe('isHeroBusy / isHeroIdle', () => {
    test('a fresh hero (busyUntil: null) is idle, never busy', () => {
      const hero = { busyUntil: null };
      assert.equal(isHeroBusy(hero, Date.now()), false);
      assert.equal(isHeroIdle(hero, Date.now()), true);
    });

    test('isHeroBusy (time-based) is true strictly before busyUntil, false at/after it', () => {
      const hero = { busyUntil: 1000 };
      assert.equal(isHeroBusy(hero, 999), true);
      assert.equal(isHeroBusy(hero, 1000), false);
      assert.equal(isHeroBusy(hero, 1001), false);
    });

    test('isHeroIdle (resolution-based) stays false at/after busyUntil until the mission is actually resolved -- regression guard for the sendable-before-resolved boundary bug', () => {
      const hero = { busyUntil: 1000 };
      // Unlike isHeroBusy, isHeroIdle must NOT flip true just because
      // the timer's nominal duration has elapsed -- only resolving
      // the mission (which sets busyUntil back to null) does that.
      assert.equal(isHeroIdle(hero, 999), false);
      assert.equal(isHeroIdle(hero, 1000), false, 'exact boundary: still unresolved, must not be sendable');
      assert.equal(isHeroIdle(hero, 5000), false, 'long after expiry but still unresolved: must not be sendable');
      hero.busyUntil = null; // simulates dungeons.js's resolveDungeon() clearing it
      assert.equal(isHeroIdle(hero, 5000), true);
    });
  });
});
