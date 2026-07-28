# Design: Hero Classes + Equipment

## Context
Extends hero-system and crafting-system. This is what turns
Plank/Ingot/Brick from "sits in inventory, no purpose" (an open
question since the industrial-resources change) into something with
a real use.

## Goals
- Simple class gating (weapon type only, no ability differences)
- Equipment that meaningfully affects `effectivePower`, reusing the
  existing power-based dungeon resolution rather than adding a new
  combat mechanic
- Give refined goods their purpose

## Non-Goals
See proposal.md.

## Classes
```js
export const HERO_CLASSES = {
  warrior: { name: 'Warrior', weaponType: 'sword' },
  archer:  { name: 'Archer',  weaponType: 'bow' },
  scholar: { name: 'Scholar', weaponType: 'staff' }
};
export const HERO_CLASS_IDS = Object.keys(HERO_CLASSES);
```
Assigned at recruitment:
```js
hero.class = HERO_CLASS_IDS[Math.floor(Math.random() * HERO_CLASS_IDS.length)];
```
Uniform random — unlike rarity, class has no weighting.

## Equipment Data Model
```js
{
  // ...existing hero fields (id, name, rarity, class, level, xp, currentHp)...
  equipment: { weapon: null, armor: null, boots: null } // itemId string or null
}
```

## Equipment Items (new Workbench recipes, crafting.js's RECIPES)
| Item | id | Slot | Class restriction | Cost | Power bonus |
|---|---|---|---|---|---|
| Sword | `sword` | weapon | warrior only | `{ore: 15, wood: 5}` | +8 |
| Bow | `bow` | weapon | archer only | `{wood: 15, feathers: 10}` | +8 |
| Staff | `staff` | weapon | scholar only | `{wood: 10, stone: 10}` | +8 |
| Armor | `armor` | armor | any | `{ore: 10, stone: 10}` | +6 |
| Boots | `boots` | boots | any | `{plank: 3, feathers: 5}` | +4 |
| Heal Potion (25%) | `heal_potion` | consumable (not a slot item) | any | `{rice: 10}` | restores 25% max HP, instant use |

## Power Calculation Update
```js
export function effectivePower(hero) {
  const base = basePowerForLevel(hero); // existing rarity+level formula
  const equipmentBonus = Object.values(hero.equipment)
    .filter(Boolean)
    .reduce((sum, itemId) => sum + EQUIPMENT_POWER[itemId], 0);
  return base + equipmentBonus;
}
```

## Equipping Flow
From the hero-roster panel (Barracks): pick a hero → pick a slot →
pick from inventory items matching that slot + class restriction.
Swapping returns the previously-equipped item to inventory (not
destroyed/consumed).

## Risks / Open Questions
- Power bonus values (+8/+6/+4) are a first guess relative to the
  existing rarity power range (15-41 base) — flag for playtesting,
  should feel meaningful without trivializing dungeon difficulty.
- Heal Potion overlaps conceptually with the paid-healing mechanic
  from the dungeon-failure change — confirm both can coexist (potion
  = quick partial heal, Barracks paid heal = full restore) without
  feeling redundant.
