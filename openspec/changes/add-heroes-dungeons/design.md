# Design: Heroes + Dungeons

## Context
First "second loop" system in the game — everything so far has been
the village economy. Reuses established patterns wherever possible
(timestamp-based timers, weighted gacha tables, unlock-gated
buildings, panel-driven UI) rather than inventing new mechanics.

## Goals
- A simple, transparent hero system (no hidden RNG combat) that gives
  Feathers its promised role
- Dungeons that use the same "walk up, panel, deliberate action"
  pattern as every other building
- Fully free/non-NFT, structured so a future ownership layer could
  wrap around it without a rebuild (each hero is already a discrete
  object with an id)

## Non-Goals
See proposal.md — no NFTs, no marketplace, no PvP/land battles, no
merge system, no refined-goods integration yet.

## Hero Data Model

```js
{
  id: 'hero_<uuid-ish>',
  name: 'Rooster Ronin',       // from a small flavor-name pool per rarity
  rarity: 'common' | 'rare' | 'epic',
  level: 1,                     // 1-20 cap for v1
  xp: 0,
  busyUntil: null                // timestamp, or null if idle
}
```

### Rarity base stats (fixed, not randomized within rarity — keeps
balance simple and predictable for v1)

| Rarity | Weight | Attack | Defense | HP | Base Power |
|---|---|---|---|---|---|
| Common | 60 | 6 | 4 | 25 | 15 |
| Rare | 30 | 11 | 7 | 38 | 25 |
| Epic | 10 | 18 | 12 | 55 | 41 |

`power = attack + defense + floor(hp / 5)` — one number used for the
dungeon success check, so the mechanic stays transparent to the
player (no hidden combat resolution).

### Leveling
`effectivePower(hero) = basePower(hero.rarity) * (1 + (hero.level - 1) * 0.1)`
— linear +10%/level, same "linear progression" preference used
everywhere else in this project. Capped at level 20.

XP needed for next level: `level * 20`. XP awarded per dungeon
completion scales with tier (see below). Uncapped XP gain per
completion — level-ups can chain if a big XP reward crosses multiple
thresholds at once.

## Barracks (recruitment building)

- Unlock: Town Hall 3, cost `{egg: 50, feathers: 30}`
- Recruit action: flat cost `{egg: 15, feathers: 20}` per recruit,
  repeatable (deliberately not a leveled/upgradable building — it's a
  repeatable gacha action, paced naturally by resource cost, same
  spirit as Lucky Wheel spins being paced by ticket regen)
- Weighted rarity roll using the table above (same `pickWeighted`
  pattern as `luckyWheel.js` — reuse that logic, don't reimplement it)

## Dungeon Gate (new building)

- Unlock: Town Hall 4, cost `{egg: 80, feathers: 50}`
- 3 fixed tiers:

| Tier | Difficulty (power needed) | Duration | Entry Cost | Full Reward | XP |
|---|---|---|---|---|---|
| Easy | 10 | 5 min | `{egg: 20}` | `{egg: 40, feathers: 20}` | 10 |
| Medium | 25 | 15 min | `{egg: 40, feathers: 20}` | `{egg: 100, feathers: 50, wood: 30}` | 25 |
| Hard | 45 | 30 min | `{egg: 80, feathers: 40, wood: 20}` | `{egg: 250, feathers: 120, wood: 80, rice: 50}` | 50 |

### Sending a hero
- Player picks an idle hero + a dungeon tier from a panel (reuse the
  crafting-panel's "list + pick one" pattern)
- Entry cost deducted immediately, hero's `busyUntil` set to
  `now + duration`
- A busy hero can't be sent again until `busyUntil` passes — no
  hero-management complexity beyond this for v1

### Resolution
- **Not** a hidden dice roll — deterministic given the hero's power:
  - `hero.effectivePower >= dungeon.difficulty` → full reward + full XP
  - Otherwise → 50% reward (floored) + 50% XP — a "you tried, partial
    credit" outcome rather than a full loss, matching this project's
    established preference for not-punishing failure states (same
    spirit as the egg-upkeep discussion)
- Resolution is checked lazily (same pattern as Lucky Wheel ticket
  accrual) — when the player next interacts with a hero/the Dungeon
  Gate after `busyUntil` has passed, not via a background timer

## Persistence
```js
gameState.heroes = {
  roster: [ /* hero objects, see above */ ]
}
```
No separate "dungeon state" needed — busy/idle status lives on the
hero object itself.

## Map Placement
2 new buildings (Barracks, Dungeon Gate) need placement in the
existing map, collision-verified the same way every prior building
has been (see world-map spec's standing process note). Suggested:
near the existing Town Hall/house cluster, since both are
"management" buildings the player will visit often, similar to
Workbench.

## Risks / Open Questions
- Hero names: needs a small flavor-name pool per rarity (not yet
  written) — placeholder generic names acceptable for a first pass,
  don't block implementation on getting names perfect.
- Power/difficulty numbers are first-guess balance, same as every
  other numeric system in this project — flagged for playtesting,
  not paper-perfected.
- Single-hero-per-dungeon (not a party system) is a deliberate v1
  simplification — revisit only if playtesting shows it's needed.
