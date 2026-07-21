# Spec: Dungeon System

## Current State (implemented)
Part of the same feature as hero-system (see
`openspec/changes/add-heroes-dungeons/`). Sends one idle hero at a
time on a timed mission; resolution is a transparent stat check, not
a hidden combat mini-game.

### Dungeon Gate (building)
Unlock-gated: Town Hall 4, cost `{egg: 80, feathers: 50}`
(`buildingUnlocks.js`'s `UNLOCK_CONFIG`). Standing near an unlocked
Dungeon Gate shows a persistent panel with a tier picker, an idle-hero
picker, the selected tier's entry cost (red-highlighted if
unaffordable, via the same `formatCostHTML` used everywhere else),
and a Send button.

### Tiers (`DUNGEON_TIERS` in `dungeons.js`)
| Tier | Difficulty | Duration | Entry Cost | Full Reward | Full XP |
|---|---|---|---|---|---|
| Easy | 10 | 5 min | `{egg: 20}` | `{egg: 40, feathers: 20}` | 10 |
| Medium | 25 | 15 min | `{egg: 40, feathers: 20}` | `{egg: 100, feathers: 50, wood: 30}` | 25 |
| Hard | 45 | 30 min | `{egg: 80, feathers: 40, wood: 20}` | `{egg: 250, feathers: 120, wood: 80, rice: 50}` | 50 |

Durations are real-world minutes via a timestamp checkpoint
(`hero.busyUntil = now + tier.durationMs`), same pattern as every
other timed system in this codebase (resource production, upkeep,
Lucky Wheel tickets) — not a `setInterval` countdown.

### Sending a hero
Only heroes that pass `isHeroIdle()` (see hero-system spec — this is
NOT simply "timer expired") are offered in the picker. Sending
deducts the tier's entry cost immediately and sets
`hero.busyUntil`/`hero.dungeonTier`; a hero already on a mission
cannot be sent again, including in the exact-boundary moment right as
its current timer expires but before resolution has run (regression-
tested in `test/dungeons.test.js`).

### Resolution — deterministic, not a dice roll
`effectivePower(hero) >= tier.difficulty` → **success**: full reward,
full XP. Otherwise → **partial credit**: 50% of the reward (floored
per resource) and 50% of the XP (floored) — never a full loss. This
matches this project's established preference for not punishing
failure states outright (same spirit as the still-open egg-upkeep
discussion). The `>=` is inclusive: a hero whose power exactly equals
the tier's difficulty succeeds, not fails (boundary-tested for both
the Medium and Hard tiers in `test/dungeons.test.js`).

**Resolution is lazy**, checked every frame in `main.js`
(`resolvePendingDungeons()`) rather than via a background timer — same
pattern as Lucky Wheel ticket accrual. It runs regardless of where the
player currently is on the map, not just while standing at the
Dungeon Gate. `resolveReadyDungeons()` batch-resolves every roster
hero whose mission has completed in one pass; each resolution spawns
a floating popup at the Dungeon Gate (✅ full success vs. ⚠️ partial
credit read visually differently) and grants the hero XP via the
normal leveling path (a big enough reward can level a hero up
immediately on resolution).

### No separate "dungeon state" object
Per the design doc's explicit preference, there's no
`gameState.dungeons` — a hero's busy/idle status and active tier live
entirely on the hero object itself (`busyUntil`, `dungeonTier`; see
hero-system spec). `resolveDungeon(hero, resourceState, now)` operates
on a single hero; `resolveReadyDungeons(rosterState, resourceState,
now)` is the batch wrapper `main.js` actually calls each frame.

## Constraints for future changes
- Resolution must stay a lazy, on-demand check (called from the game
  loop / relevant interactions), not a `setInterval`/background timer
  — consistent with every other time-based system in this project.
- Keep the `isHeroBusy` (time) vs. `isHeroIdle` (resolution) split
  intact when gating whether a hero can be sent — see hero-system
  spec for why collapsing them is a real bug, not a simplification.
- Per the original proposal's non-goals (still in force): no
  multi-hero parties per run, no PvP/land battles, no hidden-RNG
  combat resolution (the power-vs-difficulty check must stay
  transparent to the player) — any of these needs its own proposal.
