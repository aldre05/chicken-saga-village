# Spec: Dungeon System

## Current State (implemented)
Part of the same feature as hero-system, originally shipped via
`add-heroes-dungeons` and later revised by `add-dungeon-failure`
(resolution/failure behavior below reflects that revision — both
proposals' `openspec/changes/` folders have been archived per this
project's standard process). Sends one idle hero at a time on a timed
mission; resolution is a transparent stat check, not a hidden combat
mini-game.

### Dungeon Gate (building)
Unlock-gated: Town Hall 4, cost `{egg: 80, feathers: 50}`
(`buildingUnlocks.js`'s `UNLOCK_CONFIG`). Standing near an unlocked
Dungeon Gate shows a persistent panel with a tier picker, an idle-and-
not-downed-hero picker, the selected tier's entry cost (red-
highlighted if unaffordable, via the same `formatCostHTML` used
everywhere else), the tier's potential full reward + XP shown
alongside that cost so the player can weigh risk vs. reward before
committing (added by `add-dungeon-failure`), and a Send button.

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
Only heroes that pass BOTH `isHeroIdle()` (see hero-system spec — this
is NOT simply "timer expired") AND are not downed (`!isDowned(hero)`,
see hero-system spec's Downed state section) are offered in the
picker (`canSendHeroToDungeon` checks both independently). If every
idle hero happens to be downed, the picker shows an explicit empty-
state message ("Every idle hero is downed — heal at the Barracks
first.") rather than silently showing nothing. Sending deducts the
tier's entry cost immediately and sets `hero.busyUntil`/
`hero.dungeonTier`; a hero already on a mission cannot be sent again,
including in the exact-boundary moment right as its current timer
expires but before resolution has run (regression-tested in
`test/dungeons.test.js`).

### Resolution — deterministic, not a dice roll
`effectivePower(hero) >= tier.difficulty` → **success**: full reward,
full XP, hero's `currentHp` untouched. Otherwise → **failure**:
`hero.currentHp` is set to 0 (downed) and **nothing is awarded** —
empty reward, 0 XP. The `>=` is inclusive: a hero whose power exactly
equals the tier's difficulty succeeds, not fails (boundary-tested for
both the Medium and Hard tiers in `test/dungeons.test.js`).

**This is a reversal of the original design.** The project originally
gave a failed mission 50% of the full reward and 50% of the XP
("partial credit," floored per resource) specifically to avoid
punishing failure outright. `add-dungeon-failure` deliberately removed
that softer handling in favor of real risk (a downed hero, no reward)
— made survivable not by softening the loss but by adding an explicit
recovery mechanic (healing; see hero-system spec) as the actual safety
net, rather than a reward discount. See memory.md's Decisions for the
full reasoning behind the reversal.

**Resolution is lazy**, checked every frame in `main.js`
(`resolvePendingDungeons()`) rather than via a background timer — same
pattern as Lucky Wheel ticket accrual. It runs regardless of where the
player currently is on the map, not just while standing at the
Dungeon Gate. `resolveReadyDungeons()` batch-resolves every roster
hero whose mission has completed in one pass; each resolution spawns a
floating popup at the Dungeon Gate/Barracks (✅ green success text with
reward+XP vs. 💀 distinctly-styled failure text reading "Downed! No
reward." — visually and textually distinct outcomes, not just
different wording) and grants the hero XP via the normal leveling path
on success (a big enough reward can level a hero up immediately on
resolution). Resolution always clears `busyUntil`/`dungeonTier`
regardless of outcome, so a downed hero becomes idle immediately —
just not sendable again until healed (see hero-system spec).

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
  `isDowned` must stay a third, independent condition alongside
  `isHeroIdle` — don't fold it into idle-checking.
- Failure grants nothing (no partial credit) — this was a deliberate,
  discussed reversal of the original softer design (see Resolution
  above and memory.md's Decisions). Don't reintroduce partial-credit
  rewards without an equally deliberate discussion; the recovery path
  for a failed mission is healing, not a reward discount.
- Per the original proposal's non-goals (still in force): no
  multi-hero parties per run, no PvP/land battles, no hidden-RNG
  combat resolution (the power-vs-difficulty check must stay
  transparent to the player) — any of these needs its own proposal.
