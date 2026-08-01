import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  DUNGEON_TIERS,
  DUNGEON_TIER_IDS,
  getDungeonTier,
  canSendHeroToDungeon,
  sendHeroToDungeon,
  resolveDungeon,
  resolveReadyDungeons
} from '../js/dungeons.js';
import { createHeroRosterState, recruitHero, isHeroIdle } from '../js/heroes.js';
import { createResourceState } from '../js/resources.js';

function fundedResources(overrides = {}) {
  const resources = createResourceState();
  Object.assign(resources.carried, {
    egg: 100000, feathers: 100000, wood: 100000, rice: 100000, stone: 100000, ore: 100000
  }, overrides);
  return resources;
}

// Rarity base powers/hp from heroes.js's RARITY_TABLE (see
// heroes.test.js for the derivation): common 15/25hp, rare 25/38hp,
// epic 41/55hp.
const RARITY_HP = { common: 25, rare: 38, epic: 55 };
function heroOf(rarity, level = 1, currentHp = RARITY_HP[rarity]) {
  return { id: `h_${rarity}_${level}`, rarity, level, xp: 0, busyUntil: null, dungeonTier: null, currentHp };
}

describe('dungeons.js', () => {
  test('DUNGEON_TIERS matches design.md exactly (difficulty/duration/cost/reward/xp)', () => {
    assert.deepEqual(DUNGEON_TIER_IDS, ['easy', 'medium', 'hard']);
    assert.equal(DUNGEON_TIERS.easy.difficulty, 10);
    assert.equal(DUNGEON_TIERS.easy.durationMs, 5 * 60 * 1000);
    assert.deepEqual(DUNGEON_TIERS.easy.entryCost, { egg: 20 });
    assert.deepEqual(DUNGEON_TIERS.easy.fullReward, { egg: 40, feathers: 20 });
    assert.equal(DUNGEON_TIERS.easy.fullXp, 10);

    assert.equal(DUNGEON_TIERS.medium.difficulty, 25);
    assert.equal(DUNGEON_TIERS.medium.durationMs, 15 * 60 * 1000);
    assert.deepEqual(DUNGEON_TIERS.medium.entryCost, { egg: 40, feathers: 20 });
    assert.deepEqual(DUNGEON_TIERS.medium.fullReward, { egg: 100, feathers: 50, wood: 30 });
    assert.equal(DUNGEON_TIERS.medium.fullXp, 25);

    assert.equal(DUNGEON_TIERS.hard.difficulty, 45);
    assert.equal(DUNGEON_TIERS.hard.durationMs, 30 * 60 * 1000);
    assert.deepEqual(DUNGEON_TIERS.hard.entryCost, { egg: 80, feathers: 40, wood: 20 });
    assert.deepEqual(DUNGEON_TIERS.hard.fullReward, { egg: 250, feathers: 120, wood: 80, rice: 50 });
    assert.equal(DUNGEON_TIERS.hard.fullXp, 50);
  });

  test('getDungeonTier returns null for an unknown tier id', () => {
    assert.equal(getDungeonTier('nightmare'), null);
  });

  describe('canSendHeroToDungeon / sendHeroToDungeon', () => {
    test('rejects an unaffordable send without mutating anything', () => {
      const hero = heroOf('common', 1);
      const resources = createResourceState(); // 0 of everything
      assert.equal(canSendHeroToDungeon(hero, 'easy', resources, Date.now()), false);
      assert.equal(sendHeroToDungeon(hero, 'easy', resources, Date.now()), false);
      assert.equal(hero.busyUntil, null);
      assert.equal(hero.dungeonTier, null);
    });

    test('rejects an unknown tier id', () => {
      const hero = heroOf('common', 1);
      assert.equal(canSendHeroToDungeon(hero, 'nightmare', fundedResources(), Date.now()), false);
    });

    test('successful send deducts entryCost exactly and sets busyUntil/dungeonTier', () => {
      const hero = heroOf('common', 1);
      const resources = fundedResources();
      const before = { ...resources.carried };
      const now = 1_700_000_000_000;
      const ok = sendHeroToDungeon(hero, 'medium', resources, now);
      assert.equal(ok, true);
      assert.equal(hero.dungeonTier, 'medium');
      assert.equal(hero.busyUntil, now + DUNGEON_TIERS.medium.durationMs);
      assert.equal(resources.carried.egg, before.egg - DUNGEON_TIERS.medium.entryCost.egg);
      assert.equal(resources.carried.feathers, before.feathers - DUNGEON_TIERS.medium.entryCost.feathers);
    });

    test('a hero already on a mission cannot be sent on a second one while genuinely still busy', () => {
      const hero = heroOf('common', 1);
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'easy', resources, now);
      const midMission = now + DUNGEON_TIERS.easy.durationMs / 2;
      assert.equal(canSendHeroToDungeon(hero, 'hard', resources, midMission), false);
      assert.equal(sendHeroToDungeon(hero, 'hard', resources, midMission), false);
      assert.equal(hero.dungeonTier, 'easy', 'original mission must be untouched');
    });

    test('REGRESSION: a hero cannot be re-sent exactly when busyUntil passes, before resolution runs (the original mission reward must not be discardable)', () => {
      const hero = heroOf('common', 1);
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'easy', resources, now);
      const exactExpiry = hero.busyUntil;

      // isHeroBusy (time-based) would already say "not busy" here --
      // that's fine for resolveDungeon's own timing check, but
      // isHeroIdle (the sendability gate) must NOT agree, or the
      // still-unresolved "easy" mission gets silently overwritten.
      assert.equal(isHeroIdle(hero, exactExpiry), false);
      assert.equal(canSendHeroToDungeon(hero, 'hard', resources, exactExpiry), false);
      assert.equal(sendHeroToDungeon(hero, 'hard', resources, exactExpiry), false);
      assert.equal(hero.dungeonTier, 'easy', 'original mission must survive the exact-boundary moment');

      // Also check a bit after the boundary, still pre-resolution.
      const wellAfterExpiry = exactExpiry + 999;
      assert.equal(canSendHeroToDungeon(hero, 'hard', resources, wellAfterExpiry), false);
      assert.equal(hero.dungeonTier, 'easy');

      // Once actually resolved, the hero becomes legitimately sendable again.
      const resolved = resolveDungeon(hero, resources, wellAfterExpiry);
      assert.ok(resolved);
      assert.equal(hero.busyUntil, null);
      assert.equal(hero.dungeonTier, null);
      assert.equal(canSendHeroToDungeon(hero, 'hard', resources, wellAfterExpiry), true);
    });
  });

  describe('resolveDungeon math', () => {
    test('returns null for a hero with no active mission', () => {
      const hero = heroOf('common', 1);
      assert.equal(resolveDungeon(hero, fundedResources(), Date.now()), null);
    });

    test('returns null (nothing to resolve) while genuinely still mid-mission', () => {
      const hero = heroOf('common', 1);
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'easy', resources, now);
      assert.equal(resolveDungeon(hero, resources, now + 1000), null); // durationMs is 5 minutes
      assert.equal(hero.dungeonTier, 'easy', 'unresolved mission must be untouched');
    });

    test('exact power == difficulty boundary counts as SUCCESS (>=, not >): rare Lv.1 (power 25) vs Medium (difficulty 25)', () => {
      const hero = heroOf('rare', 1); // effectivePower = 25 exactly
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'medium', resources, now);
      const result = resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(result.success, true);
      assert.deepEqual(result.reward, DUNGEON_TIERS.medium.fullReward);
      assert.equal(result.xp, DUNGEON_TIERS.medium.fullXp);
    });

    test('exact power == difficulty boundary counts as SUCCESS: rare Lv.9 (power 45) vs Hard (difficulty 45)', () => {
      const hero = heroOf('rare', 9); // 25 * (1 + 8*0.1) = 25 * 1.8 = 45 exactly
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'hard', resources, now);
      const result = resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(result.success, true);
      assert.deepEqual(result.reward, DUNGEON_TIERS.hard.fullReward);
      assert.equal(result.xp, DUNGEON_TIERS.hard.fullXp);
    });

    test('one point below the difficulty boundary counts as FAILURE, not success', () => {
      const hero = heroOf('rare', 9); // power 45, one level down should drop below 45
      hero.level = 8; // 25 * (1 + 7*0.1) = 25 * 1.7 = 42.5, below Hard's difficulty 45
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'hard', resources, now);
      const result = resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(result.success, false);
    });

    // REGRESSION (add-dungeon-failure): this project's original design
    // gave a failed mission 50% reward + 50% XP ("partial credit").
    // That was a deliberate, explicit reversal — see
    // openspec/specs/dungeon-system/spec.md and memory.md's Decisions
    // for why (real risk on failure was worth more than a soft-fail
    // safety net, once healing existed as the actual safety net
    // instead). These tests replace the old
    // "partial credit is exactly 50%..." tests, which asserted the
    // now-removed behavior and would fail against current code.
    test('failure grants NOTHING (empty reward, 0 xp) — no partial credit', () => {
      const hero = heroOf('common', 1); // power 15, well below Hard's difficulty 45
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'hard', resources, now);
      const before = { ...resources.carried };
      const result = resolveDungeon(hero, resources, hero.busyUntil);

      assert.equal(result.success, false);
      assert.deepEqual(result.reward, {});
      assert.equal(result.xp, 0);
      assert.deepEqual(resources.carried, before, 'no resources should be granted on failure');
    });

    test('failure sets currentHp to 0 (hero becomes downed), regardless of prior HP', () => {
      const hero = heroOf('common', 1); // power 15, below Medium's difficulty 25
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'medium', resources, now);
      const result = resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(result.success, false);
      assert.equal(hero.currentHp, 0);
    });

    test('success does NOT modify currentHp (only failure does)', () => {
      const hero = heroOf('rare', 1, 10); // power 25 >= Medium's 25 -> success; HP deliberately not at max
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'medium', resources, now);
      const result = resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(result.success, true);
      assert.equal(hero.currentHp, 10, 'a successful mission should not heal or further damage the hero');
    });

    test('a downed hero cannot be sent on a mission even if otherwise idle and fully funded', () => {
      const hero = heroOf('epic', 5, 0); // idle (never sent), but downed
      const resources = fundedResources();
      const now = Date.now();
      assert.equal(canSendHeroToDungeon(hero, 'easy', resources, now), false);
      assert.equal(sendHeroToDungeon(hero, 'easy', resources, now), false);
      assert.equal(hero.busyUntil, null, 'a rejected send must not mutate the hero');
    });

    test('resolution clears busyUntil and dungeonTier so the hero becomes sendable again', () => {
      const hero = heroOf('common', 1);
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'easy', resources, now);
      resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(hero.busyUntil, null);
      assert.equal(hero.dungeonTier, null);
    });

    test('after a failed mission, the hero is idle (resolution cleared) but still not sendable until healed', () => {
      const hero = heroOf('common', 1); // power 15, below Hard's difficulty 45 -> will fail
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'hard', resources, now);
      const result = resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(result.success, false);
      assert.equal(hero.busyUntil, null, 'resolution should still clear busy state even on failure');
      assert.equal(hero.dungeonTier, null);
      assert.equal(hero.currentHp, 0);
      assert.equal(canSendHeroToDungeon(hero, 'easy', resources, now), false, 'downed heroes cannot be sent even though idle');
    });
    test('grants XP to the hero via the normal leveling path (a big enough reward can level the hero up)', () => {
      const hero = heroOf('rare', 1); // power 25 >= Medium's 25 -> success -> full XP 25 -> xpForNextLevel(1) is 20
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      sendHeroToDungeon(hero, 'medium', resources, now);
      resolveDungeon(hero, resources, hero.busyUntil);
      assert.equal(hero.level, 2);
      assert.equal(hero.xp, 5); // 25 xp - 20 needed for level 1->2
    });
  });

  describe('resolveReadyDungeons (batch/lazy resolution)', () => {
    test('resolves only heroes whose missions are actually due, leaves others alone', () => {
      const roster = createHeroRosterState();
      const resources = fundedResources();
      const now = 1_700_000_000_000;

      const heroA = recruitHero(roster, resources);
      const heroB = recruitHero(roster, resources);
      const heroC = recruitHero(roster, resources); // stays idle, never sent

      sendHeroToDungeon(heroA, 'easy', resources, now); // due in 5 min
      sendHeroToDungeon(heroB, 'hard', resources, now); // due in 30 min

      // Only heroA's mission has elapsed.
      const results = resolveReadyDungeons(roster, resources, now + DUNGEON_TIERS.easy.durationMs + 1);
      assert.equal(results.length, 1);
      assert.equal(results[0].hero, heroA);
      assert.equal(heroA.dungeonTier, null);
      assert.equal(heroB.dungeonTier, 'hard', 'still mid-mission, must be untouched');
      assert.equal(heroC.dungeonTier, null);
    });

    test('returns an empty array when nothing is ready', () => {
      const roster = createHeroRosterState();
      const resources = fundedResources();
      recruitHero(roster, resources); // idle hero, never sent
      assert.deepEqual(resolveReadyDungeons(roster, resources, Date.now()), []);
    });

    test('batch-resolves multiple simultaneously-due heroes in one call', () => {
      const roster = createHeroRosterState();
      const resources = fundedResources();
      const now = 1_700_000_000_000;
      const heroA = recruitHero(roster, resources);
      const heroB = recruitHero(roster, resources);
      sendHeroToDungeon(heroA, 'easy', resources, now);
      sendHeroToDungeon(heroB, 'easy', resources, now);

      const results = resolveReadyDungeons(roster, resources, now + DUNGEON_TIERS.easy.durationMs + 1);
      assert.equal(results.length, 2);
      assert.equal(heroA.dungeonTier, null);
      assert.equal(heroB.dungeonTier, null);
    });
  });
});
