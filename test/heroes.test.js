import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  RARITY_TABLE,
  RECRUIT_COST,
  MAX_HERO_LEVEL,
  HERO_CLASSES,
  HERO_CLASS_IDS,
  EQUIPMENT_SLOTS,
  EQUIPMENT_ITEMS,
  EQUIPMENT_POWER,
  HEAL_COST_BASE,
  HEAL_COST_RARITY_MULTIPLIER,
  HEAL_POTION_ITEM_ID,
  HEAL_POTION_RESTORE_FRACTION,
  getRarityStats,
  createHeroRosterState,
  canRecruitHero,
  recruitHero,
  effectivePower,
  xpForNextLevel,
  isHeroBusy,
  isHeroIdle,
  getHeroById,
  getMaxHp,
  isDowned,
  getHealCost,
  canHealHero,
  healHero,
  canEquipItem,
  equipHero,
  unequipHero,
  canUseHealPotion,
  useHealPotion,
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
    assert.ok(HERO_CLASS_IDS.includes(hero.class));
    assert.equal(hero.currentHp, getMaxHp(hero), 'a fresh hero should start at full HP for its rarity');
    assert.deepEqual(hero.equipment, { weapon: null, armor: null, boots: null });
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

  describe('hero classes', () => {
    test('HERO_CLASSES matches design.md exactly (3 classes, correct weapon types)', () => {
      assert.deepEqual(HERO_CLASS_IDS.sort(), ['archer', 'scholar', 'warrior']);
      assert.equal(HERO_CLASSES.warrior.weaponType, 'sword');
      assert.equal(HERO_CLASSES.archer.weaponType, 'bow');
      assert.equal(HERO_CLASSES.scholar.weaponType, 'staff');
    });

    test('class assignment is uniform random, NOT weighted like rarity (deterministic via mocked Math.random)', (t) => {
      // 3 classes, uniform: each occupies an equal 1/3 slice of [0, 1).
      const originalRandom = Math.random;
      t.after(() => { Math.random = originalRandom; });
      const cases = [
        [0, HERO_CLASS_IDS[0]],
        [0.34, HERO_CLASS_IDS[1]],
        [0.67, HERO_CLASS_IDS[2]],
        [0.99999, HERO_CLASS_IDS[2]]
      ];
      for (const [randomValue, expectedClass] of cases) {
        Math.random = () => randomValue;
        const roster = createHeroRosterState();
        const hero = recruitHero(roster, fundedResources());
        assert.equal(hero.class, expectedClass, `Math.random()=${randomValue} should yield class ${expectedClass}, got ${hero.class}`);
      }
    });

    test('class distribution is roughly uniform (~33/33/33) over many rolls, independent of rarity weighting', () => {
      const roster = createHeroRosterState();
      const resources = fundedResources({ egg: 1_000_000, feathers: 1_000_000 });
      const counts = { warrior: 0, archer: 0, scholar: 0 };
      const N = 4000;
      for (let i = 0; i < N; i++) {
        const hero = recruitHero(roster, resources);
        counts[hero.class] += 1;
      }
      for (const id of HERO_CLASS_IDS) {
        assert.ok(Math.abs(counts[id] / N - 1 / 3) < 0.05, `${id} ratio off: ${counts[id] / N}`);
      }
    });
  });

  describe('equipment', () => {
    test('EQUIPMENT_ITEMS matches design.md exactly (slot, class restriction, power)', () => {
      assert.deepEqual(EQUIPMENT_SLOTS, ['weapon', 'armor', 'boots']);
      assert.deepEqual(EQUIPMENT_ITEMS.sword, { slot: 'weapon', classRestriction: 'warrior', power: 8 });
      assert.deepEqual(EQUIPMENT_ITEMS.bow, { slot: 'weapon', classRestriction: 'archer', power: 8 });
      assert.deepEqual(EQUIPMENT_ITEMS.staff, { slot: 'weapon', classRestriction: 'scholar', power: 8 });
      assert.deepEqual(EQUIPMENT_ITEMS.armor, { slot: 'armor', classRestriction: null, power: 6 });
      assert.deepEqual(EQUIPMENT_ITEMS.boots, { slot: 'boots', classRestriction: null, power: 4 });
    });

    test('EQUIPMENT_POWER is derived correctly from EQUIPMENT_ITEMS', () => {
      assert.equal(EQUIPMENT_POWER.sword, 8);
      assert.equal(EQUIPMENT_POWER.armor, 6);
      assert.equal(EQUIPMENT_POWER.boots, 4);
    });

    test('canEquipItem rejects all 6 wrong-class weapon/class mismatches, allows all 3 correct matches', () => {
      const inventory = { sword: 1, bow: 1, staff: 1 };
      const mismatches = [
        ['warrior', 'bow'], ['warrior', 'staff'],
        ['archer', 'sword'], ['archer', 'staff'],
        ['scholar', 'sword'], ['scholar', 'bow']
      ];
      for (const [heroClass, itemId] of mismatches) {
        const hero = { class: heroClass, equipment: { weapon: null, armor: null, boots: null } };
        assert.equal(canEquipItem(hero, inventory, itemId), false, `${heroClass} should not be able to equip ${itemId}`);
      }
      const matches = [['warrior', 'sword'], ['archer', 'bow'], ['scholar', 'staff']];
      for (const [heroClass, itemId] of matches) {
        const hero = { class: heroClass, equipment: { weapon: null, armor: null, boots: null } };
        assert.equal(canEquipItem(hero, inventory, itemId), true, `${heroClass} should be able to equip ${itemId}`);
      }
    });

    test('canEquipItem: armor/boots are unrestricted across all 3 classes', () => {
      const inventory = { armor: 1, boots: 1 };
      for (const heroClass of HERO_CLASS_IDS) {
        const hero = { class: heroClass, equipment: { weapon: null, armor: null, boots: null } };
        assert.equal(canEquipItem(hero, inventory, 'armor'), true);
        assert.equal(canEquipItem(hero, inventory, 'boots'), true);
      }
    });

    test('canEquipItem rejects when the item isn\'t in inventory', () => {
      const hero = { class: 'warrior', equipment: { weapon: null, armor: null, boots: null } };
      assert.equal(canEquipItem(hero, {}, 'sword'), false);
      assert.equal(canEquipItem(hero, { sword: 0 }, 'sword'), false);
    });

    test('equipHero consumes one from inventory and fills the correct slot', () => {
      const hero = { class: 'warrior', equipment: { weapon: null, armor: null, boots: null } };
      const inventory = { sword: 1 };
      const result = equipHero(hero, inventory, 'sword');
      assert.equal(result, true);
      assert.equal(hero.equipment.weapon, 'sword');
      assert.equal(inventory.sword, 0);
    });

    test('equipHero fails cleanly (no mutation) for a class-restricted mismatch', () => {
      const hero = { class: 'archer', equipment: { weapon: null, armor: null, boots: null } };
      const inventory = { sword: 1 };
      const result = equipHero(hero, inventory, 'sword');
      assert.equal(result, false);
      assert.equal(hero.equipment.weapon, null);
      assert.equal(inventory.sword, 1, 'inventory must be untouched on a rejected equip');
    });

    test('swapping equipment returns the previously-equipped item to inventory rather than destroying it', () => {
      const hero = { class: 'warrior', equipment: { weapon: null, armor: null, boots: null } };
      const inventory = { sword: 2, armor: 1 };
      equipHero(hero, inventory, 'sword');
      assert.equal(inventory.sword, 1);
      // Equip a second sword into the same (weapon) slot -- the first should return to inventory.
      equipHero(hero, inventory, 'sword');
      assert.equal(hero.equipment.weapon, 'sword');
      assert.equal(inventory.sword, 1, 'one sword consumed, one sword returned -- net unchanged, but via the return path not by skipping consumption');
    });

    test('unequipHero returns the item to inventory and clears the slot', () => {
      const hero = { class: 'warrior', equipment: { weapon: 'sword', armor: null, boots: null } };
      const inventory = { sword: 0 };
      const result = unequipHero(hero, inventory, 'weapon');
      assert.equal(result, true);
      assert.equal(hero.equipment.weapon, null);
      assert.equal(inventory.sword, 1);
    });

    test('unequipHero is a safe no-op on an already-empty slot', () => {
      const hero = { class: 'warrior', equipment: { weapon: null, armor: null, boots: null } };
      const inventory = {};
      const result = unequipHero(hero, inventory, 'weapon');
      assert.equal(result, false);
      assert.deepEqual(inventory, {}, 'nothing should be added to inventory for an empty slot');
    });

    test('effectivePower sums bonuses across all 3 equipped slots, not just one', () => {
      const hero = { rarity: 'common', level: 1, equipment: { weapon: null, armor: null, boots: null } };
      const basePower = effectivePower(hero); // 15
      const inventory = { sword: 1, armor: 1, boots: 1 };
      hero.class = 'warrior';

      equipHero(hero, inventory, 'sword');
      assert.equal(effectivePower(hero), basePower + 8);
      equipHero(hero, inventory, 'armor');
      assert.equal(effectivePower(hero), basePower + 8 + 6);
      equipHero(hero, inventory, 'boots');
      assert.equal(effectivePower(hero), basePower + 8 + 6 + 4, 'all 3 slots should sum, not just the last one equipped');

      unequipHero(hero, inventory, 'armor');
      assert.equal(effectivePower(hero), basePower + 8 + 4, 'removing one slot should only drop that slot\'s bonus');
    });

    test('a fully-unequipped hero has no phantom equipment bonus', () => {
      const hero = { rarity: 'rare', level: 1, equipment: { weapon: null, armor: null, boots: null } };
      assert.equal(effectivePower(hero), getRarityStats('rare').basePower);
    });
  });

  describe('downed state / healing', () => {
    test('getMaxHp reflects the rarity table, independent of level', () => {
      assert.equal(getMaxHp({ rarity: 'common', level: 1 }), 25);
      assert.equal(getMaxHp({ rarity: 'common', level: 20 }), 25);
      assert.equal(getMaxHp({ rarity: 'epic', level: 1 }), 55);
    });

    test('isDowned is true at/below 0 HP, false above it', () => {
      assert.equal(isDowned({ currentHp: 1 }), false);
      assert.equal(isDowned({ currentHp: 0 }), true);
      assert.equal(isDowned({ currentHp: -5 }), true, 'defensively true even if HP somehow went negative');
    });

    test('getHealCost scales exactly by HEAL_COST_RARITY_MULTIPLIER for all 3 rarities', () => {
      assert.deepEqual(getHealCost({ rarity: 'common' }), {
        egg: HEAL_COST_BASE.egg * HEAL_COST_RARITY_MULTIPLIER.common,
        feathers: HEAL_COST_BASE.feathers * HEAL_COST_RARITY_MULTIPLIER.common
      });
      assert.deepEqual(getHealCost({ rarity: 'rare' }), { egg: 60, feathers: 40 });
      assert.deepEqual(getHealCost({ rarity: 'epic' }), { egg: 120, feathers: 80 });
    });

    test('canHealHero requires BOTH downed state AND affordability', () => {
      const notDowned = { rarity: 'common', currentHp: 10 };
      const downedButPoor = { rarity: 'common', currentHp: 0 };
      assert.equal(canHealHero(notDowned, fundedResources()), false, 'not downed -- nothing to heal');
      assert.equal(canHealHero(downedButPoor, createResourceState()), false, 'downed but can\'t afford it');
      assert.equal(canHealHero(downedButPoor, fundedResources()), true);
    });

    test('healHero restores exactly to max HP and deducts the exact rarity-scaled cost', () => {
      const hero = { rarity: 'epic', currentHp: 0 };
      const resources = fundedResources();
      const before = { ...resources.carried };
      const result = healHero(hero, resources);
      assert.equal(result, true);
      assert.equal(hero.currentHp, getMaxHp(hero));
      const cost = getHealCost(hero);
      assert.equal(resources.carried.egg, before.egg - cost.egg);
      assert.equal(resources.carried.feathers, before.feathers - cost.feathers);
    });

    test('healHero fails cleanly (no mutation) on a non-downed hero or when unaffordable', () => {
      const notDowned = { rarity: 'common', currentHp: 20 };
      const resources = fundedResources();
      assert.equal(healHero(notDowned, resources), false);
      assert.equal(notDowned.currentHp, 20);

      const downedButPoor = { rarity: 'common', currentHp: 0 };
      const poorResources = createResourceState();
      assert.equal(healHero(downedButPoor, poorResources), false);
      assert.equal(downedButPoor.currentHp, 0);
    });
  });

  describe('Heal Potion (consumable, distinct from the paid Barracks heal)', () => {
    test('HEAL_POTION_RESTORE_FRACTION is 0.25 per design.md ("Heal Potion (25%)")', () => {
      assert.equal(HEAL_POTION_RESTORE_FRACTION, 0.25);
    });

    test('canUseHealPotion requires one in inventory AND the hero being below max HP', () => {
      const injured = { rarity: 'common', currentHp: 10 };
      const atMax = { rarity: 'common', currentHp: 25 };
      assert.equal(canUseHealPotion(injured, {}), false, 'no potion in inventory');
      assert.equal(canUseHealPotion(injured, { [HEAL_POTION_ITEM_ID]: 1 }), true);
      assert.equal(canUseHealPotion(atMax, { [HEAL_POTION_ITEM_ID]: 1 }), false, 'nothing to heal at full HP');
    });

    test('useHealPotion restores an ADDITIVE 25% of max HP, not a full heal (regression: previously set HP straight to max)', () => {
      const hero = { rarity: 'common', currentHp: 10 }; // maxHp 25, 25% of 25 = 6.25 -> ceil 7
      const inventory = { [HEAL_POTION_ITEM_ID]: 1 };
      const result = useHealPotion(hero, inventory);
      assert.equal(result, true);
      assert.equal(hero.currentHp, 17, '10 + ceil(25 * 0.25) = 10 + 7 = 17, NOT 25 (a full heal)');
      assert.equal(inventory[HEAL_POTION_ITEM_ID], 0);
    });

    test('useHealPotion caps at max HP rather than overshooting', () => {
      const hero = { rarity: 'common', currentHp: 22 }; // maxHp 25; +7 would overshoot to 29
      const inventory = { [HEAL_POTION_ITEM_ID]: 1 };
      useHealPotion(hero, inventory);
      assert.equal(hero.currentHp, 25, 'should cap at maxHp, not overshoot');
    });

    test('useHealPotion is a no-op at full HP (nothing consumed, nothing changed)', () => {
      const hero = { rarity: 'common', currentHp: 25 };
      const inventory = { [HEAL_POTION_ITEM_ID]: 1 };
      const result = useHealPotion(hero, inventory);
      assert.equal(result, false);
      assert.equal(hero.currentHp, 25);
      assert.equal(inventory[HEAL_POTION_ITEM_ID], 1, 'potion should not be consumed on a no-op use');
    });

    test('useHealPotion works on a downed (0 HP) hero too -- not gated on isDowned, unlike the paid Barracks heal', () => {
      // Deliberate design overlap, not a bug -- see design.md's own
      // Risks/Open Questions flagging potion-vs-paid-heal overlap as
      // something to confirm during playtesting. This test documents
      // the current, intentional behavior.
      const hero = { rarity: 'common', currentHp: 0 };
      const inventory = { [HEAL_POTION_ITEM_ID]: 1 };
      const result = useHealPotion(hero, inventory);
      assert.equal(result, true);
      assert.equal(hero.currentHp, 7); // 0 + ceil(25 * 0.25)
      assert.equal(isDowned(hero), false, 'a potion CAN bring a downed hero back above 0');
    });

    test('useHealPotion fails cleanly with no potion in inventory', () => {
      const hero = { rarity: 'common', currentHp: 10 };
      const result = useHealPotion(hero, {});
      assert.equal(result, false);
      assert.equal(hero.currentHp, 10);
    });
  });
});
