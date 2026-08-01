# Spec: Hero System

## Current State (implemented)
The first "second loop" system beyond the village economy — originally
shipped via `add-heroes-dungeons`, then extended by `add-hero-classes`
(class/equipment) and `add-dungeon-failure` (downed state/healing).
All three proposals are fully merged into this spec; their
`openspec/changes/` folders have been archived (deleted) per this
project's standard process. Free, non-NFT in-game data only.

### Barracks (recruitment)
A building, unlock-gated like any other: Town Hall 3, cost
`{egg: 50, feathers: 30}` (`buildingUnlocks.js`'s `UNLOCK_CONFIG`).
Not a leveled/upgradable building — recruiting is a repeatable action
paced by resource cost, not a building level, same spirit as Lucky
Wheel spins being paced by ticket regen rather than a cooldown.

Standing near an unlocked Barracks shows a persistent panel: a
Recruit button (cost `{egg: 15, feathers: 20}`, `RECRUIT_COST` in
`heroes.js`, disabled if unaffordable) and a live roster list showing
every recruited hero's rarity icon, name, level, power, and
idle/busy status (with a live countdown while busy).

### Rarity & stats
Weighted roll (`RARITY_TABLE` in `heroes.js`) using the same
`pickWeighted()` helper the Lucky Wheel uses — reused, not
reimplemented, so both systems' weighted-random logic can't drift
apart:

| Rarity | Weight | Attack | Defense | HP | Base Power |
|---|---|---|---|---|---|
| Common | 60% | 6 | 4 | 25 | 15 |
| Rare | 30% | 11 | 7 | 38 | 25 |
| Epic | 10% | 18 | 12 | 55 | 41 |

`basePower = attack + defense + floor(hp / 5)` — fixed per rarity
(not randomized within a rarity), one transparent number the dungeon
system checks against. Hero name is cosmetic, randomly picked from a
small placeholder flavor-name pool per rarity (`NAME_POOL`) — not
final, safe to expand/replace without touching any logic.

### Class (added by `add-hero-classes`)
Assigned once at recruitment, uniform random across 3 classes (`HERO_CLASSES`
in `heroes.js`) — **unlike rarity, class is NOT weighted**, each is an
equal 1-in-3 roll:

| Class | Weapon type |
|---|---|
| Warrior | Sword |
| Archer | Bow |
| Scholar | Staff |

Class is weapon-type gating only — no ability or stat differences
between classes, per design.md's explicit Goal ("simple class gating,
no ability differences"). Class never changes after recruitment;
there's no re-class or respec mechanic.

### Equipment (added by `add-hero-classes`)
Three slots per hero — `weapon`, `armor`, `boots` (`EQUIPMENT_SLOTS`)
— each holding an itemId or `null`. Equipment items are crafted at the
Workbench (see crafting-system spec) and equipped from the hero
roster panel:

| Item | Slot | Class restriction | Power bonus |
|---|---|---|---|
| Sword | weapon | Warrior only | +8 |
| Bow | weapon | Archer only | +8 |
| Staff | weapon | Scholar only | +8 |
| Armor | armor | any | +6 |
| Boots | boots | any | +4 |

Only weapons are class-restricted (matching the "weapon type only"
class design above) — armor and boots fit any class. Equipping
consumes one from inventory; **swapping to a different item in an
already-filled slot returns the previously-equipped item to
inventory rather than destroying it** (`equipHero`/`unequipHero` in
`heroes.js`). `effectivePower()` sums the power bonus of every
currently-equipped item (not just one slot) and adds it on top of the
level-scaled base power — equipment bonuses are flat and don't scale
with hero level.

### Downed state & healing (added by `add-dungeon-failure`)
Every hero has `currentHp`, starting at (and capped at) the rarity's
max HP. A hero is **downed** (`isDowned(hero) = currentHp <= 0`) when
a dungeon mission fails (see dungeon-system spec) — see that spec for
why this replaced the project's original softer "partial credit on
failure" design. A downed hero can't be sent on a new mission
(`canSendHeroToDungeon` checks `isDowned` as a separate condition from
`isHeroIdle` — a hero can be simultaneously idle and downed, and
those are different reasons a Send action is disabled) until healed
by one of two independent means:

- **Paid Barracks heal** (`healHero`) — restores straight to max HP,
  costs `HEAL_COST_BASE` (`{egg: 30, feathers: 20}`) scaled by a
  rarity multiplier (`HEAL_COST_RARITY_MULTIPLIER`: common ×1, rare
  ×2, epic ×4) — a downed epic hero costs proportionally more to
  recover than a downed common one. Only usable on a downed hero
  (`canHealHero` requires `isDowned`).
- **Heal Potion** (consumable, crafted at the Workbench —
  `HEAL_POTION_ITEM_ID`) — restores an **additive** 25% of max HP
  (`HEAL_POTION_RESTORE_FRACTION`), capped at max, instant use.
  Usable on *any* hero below max HP, not just downed ones — unlike
  `healHero`, `useHealPotion`/`canUseHealPotion` are NOT gated on
  `isDowned`. This means a potion **can** bring a downed hero back
  above 0 HP for far less than the paid heal cost. This is a
  deliberate, acknowledged design tension, not an oversight — see
  design.md's own Risks/Open Questions section, which explicitly
  flags potion-vs-paid-heal overlap as something to confirm during
  playtesting rather than a rule to invent preemptively.

  **Code-review note (2026-07-30):** `useHealPotion` originally set
  `currentHp` straight to max (a full heal), contradicting design.md's
  explicit "25%" table entry and undermining its own stated rationale
  for why the potion and the paid heal should feel meaningfully
  different. Fixed to the additive `min(max, current + ceil(max *
  0.25))` formula. See `test/heroes.test.js`'s regression test.

### Leveling
`effectivePower(hero) = basePower(rarity) * (1 + (level - 1) * 0.1) + equipmentBonus`
— linear +10%/level above level 1 (capped at `MAX_HERO_LEVEL`, 20)
plus the flat sum of equipped items' power bonuses, added after level
scaling rather than multiplied into it. XP needed for the next level
is `level * 20`. A hero gains XP only from completing dungeon missions
(see dungeon-system spec) — there's no separate "train a hero" action.
A single large XP reward can chain multiple level-ups in one call; XP
gain is a no-op once already at the level cap.

### Busy vs. idle — two different checks, on purpose
`heroes.js` exposes two distinct functions, and they intentionally
disagree during a specific window:
- **`isHeroBusy(hero, now)`** — time-based: is the mission's timer
  still counting down (`busyUntil > now`)? Used for countdown display
  and by the dungeon system's resolution check.
- **`isHeroIdle(hero, now)`** — resolution-based: can this hero be
  sent on a *new* mission? True only once `busyUntil` has actually
  been cleared back to `null` by resolution — **not** merely once the
  timer's nominal duration has elapsed. A hero whose timer just
  expired but hasn't been resolved yet is `isHeroBusy() === false`
  (nothing left to count down) but `isHeroIdle() === false` too (the
  mission is still pending, unresolved).

This gap is deliberate, not an oversight: dungeon sends
(`sendHeroToDungeon`) overwrite a hero's `dungeonTier` unconditionally
once permitted, so gating "sendable" on the time-based check alone
would let a hero be re-sent in the window between its timer expiring
and lazy resolution running — silently discarding the first mission's
still-pending reward. Regression-tested explicitly (`test/heroes.test.js`,
`test/dungeons.test.js` — "sendable-before-resolved boundary"). Note
that `isHeroIdle` alone isn't sufficient to gate a send anymore either
— a hero can be idle AND downed at the same time, so
`canSendHeroToDungeon` checks both independently (see Downed state
above).

### Data model
Lives at `gameState.heroes.roster`, an array of hero objects:
```js
{
  id: 'hero_<generated>',
  name: string,               // cosmetic, from NAME_POOL
  rarity: 'common' | 'rare' | 'epic',
  class: 'warrior' | 'archer' | 'scholar',   // added by add-hero-classes
  level: 1,                    // 1-20
  xp: 0,
  busyUntil: null,              // timestamp, or null if idle/resolved
  dungeonTier: null,            // 'easy' | 'medium' | 'hard' | null
  currentHp: 25,                 // added by add-dungeon-failure; starts/caps at rarity's max HP
  equipment: { weapon: null, armor: null, boots: null }  // added by add-hero-classes
}
```
**One deliberate deviation from the original design doc**: the
original `add-heroes-dungeons` proposal's persistence section only
listed `{id, name, rarity, level, xp, busyUntil}`. Resolving a mission
needs to know *which tier* it was sent on, and that design doc
explicitly said not to add a separate "dungeon state" object — so
`dungeonTier` was added directly on the hero object instead, same
spirit as keeping busy/idle status on the hero itself. Flagged inline
in `heroes.js` for visibility, not a silent drift from the doc.
`currentHp` and `equipment` were added by later changes
(`add-dungeon-failure`, `add-hero-classes` respectively) directly to
this same object, following that established precedent rather than
introducing a new state shape.

No save migration was needed for any of this state (all new fields on
new saves; existing saves' heroes simply won't have `class`/
`equipment`/`currentHp` populated until re-recruited — a known,
accepted gap since the roster was new enough at the time these changes
shipped that no real save data existed yet to migrate).

## Constraints for future changes
- Keep rarity/weighted-roll logic reusing `luckyWheel.js`'s
  `pickWeighted()` — don't fork a second copy of that algorithm. Class
  assignment deliberately does NOT use this — it's uniform random, not
  weighted; don't "fix" it to use `pickWeighted()` with equal weights,
  that's a needless indirection for a genuinely uniform roll.
- `isHeroBusy` and `isHeroIdle` must stay separate checks with the
  semantics above. Do not collapse them into a single time-based
  check — that reintroduces the discardable-reward bug described
  above. `isDowned` must also stay a separate, independent check from
  both — collapsing it into `isHeroIdle` would incorrectly allow
  sending a downed-but-not-busy hero.
- Keep `healHero` (paid, gated on `isDowned`) and `useHealPotion`
  (ungated, partial) as two genuinely different mechanics rather than
  merging them — the Risks section in `add-hero-classes/design.md`
  treats their overlap as an open balance question, not something to
  resolve by deleting one.
- **Refined goods (Plank/Ingot/Brick/etc.) as hero materials is now
  IN SCOPE and shipped** (Boots costs `plank`) — this reverses the
  earlier constraint here that called it out-of-scope. See
  crafting-system spec and memory.md's Decisions for the full history
  of that reversal.
- Per the original `add-heroes-dungeons` proposal's non-goals (still
  in force, unaffected by later changes): no hero NFTs/ownership/
  trading, no PvP, no merge/fusion system, no multi-hero parties per
  dungeon run — any of these needs its own proposal, not a drive-by
  addition here.
