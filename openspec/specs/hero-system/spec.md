# Spec: Hero System

## Current State (implemented)
The first "second loop" system beyond the village economy — see
`openspec/changes/add-heroes-dungeons/` for the original proposal and
design rationale. Free, non-NFT in-game data only.

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

### Leveling
`effectivePower(hero) = basePower(rarity) * (1 + (level - 1) * 0.1)`
— linear +10%/level above level 1, capped at `MAX_HERO_LEVEL` (20),
same linear-progression style used everywhere else in this project.
XP needed for the next level is `level * 20`. A hero gains XP only
from completing dungeon missions (see dungeon-system spec) — there's
no separate "train a hero" action. A single large XP reward can chain
multiple level-ups in one call; XP gain is a no-op once already at
the level cap.

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
`test/dungeons.test.js` — "sendable-before-resolved boundary").

### Data model
Lives at `gameState.heroes.roster`, an array of hero objects:
```js
{
  id: 'hero_<generated>',
  name: string,               // cosmetic, from NAME_POOL
  rarity: 'common' | 'rare' | 'epic',
  level: 1,                    // 1-20
  xp: 0,
  busyUntil: null,              // timestamp, or null if idle/resolved
  dungeonTier: null             // 'easy' | 'medium' | 'hard' | null
}
```
**One deliberate deviation from the original design doc**: the
proposal's persistence section only listed `{id, name, rarity, level,
xp, busyUntil}`. Resolving a mission needs to know *which tier* it
was sent on, and the design doc explicitly said not to add a separate
"dungeon state" object — so `dungeonTier` was added directly on the
hero object instead, same spirit as keeping busy/idle status on the
hero itself. Flagged inline in `heroes.js` for visibility, not a
silent drift from the doc.

No save migration was needed for this state (new field on new saves;
existing saves simply start with an empty roster).

## Constraints for future changes
- Keep rarity/weighted-roll logic reusing `luckyWheel.js`'s
  `pickWeighted()` — don't fork a second copy of that algorithm.
- `isHeroBusy` and `isHeroIdle` must stay separate checks with the
  semantics above. Do not collapse them into a single time-based
  check — that reintroduces the discardable-reward bug described
  above.
- Per the original proposal's non-goals (still in force): no hero
  NFTs/ownership/trading, no PvP, no merge/fusion system, no refined
  goods (Chicken Feed/Plank/Brick/Ingot) as hero materials — any of
  these needs its own proposal, not a drive-by addition here.
