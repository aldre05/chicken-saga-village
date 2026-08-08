# Spec: Dungeon System

## Current State (implemented)
Part of the same feature as hero-system, originally shipped via
`add-heroes-dungeons`, revised by `add-dungeon-failure` (resolution/
failure behavior below reflects that revision), and extended by
`add-dungeon-keys` (the consumable run-gate below) — all three
proposals' `openspec/changes/` folders have been archived per this
project's standard process. Sends one idle hero at a time on a timed
mission; resolution is a transparent stat check, not a hidden combat
mini-game.

### Dungeon Gate (building)
Unlock-gated: Town Hall 4, cost `{egg: 80, feathers: 50}`
(`buildingUnlocks.js`'s `UNLOCK_CONFIG`). Standing near an unlocked
Dungeon Gate shows a persistent panel with a tier picker, an idle-and-
not-downed-hero picker, the current `dungeon_key` count (see below),
the selected tier's entry cost (red-highlighted if unaffordable, via
the same `formatCostHTML` used everywhere else), the tier's potential
full reward + XP shown alongside that cost so the player can weigh
risk vs. reward before committing (added by `add-dungeon-failure`),
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

### Dungeon Key — consumable run gate (`add-dungeon-keys`)
Every send, on any tier, additionally requires and consumes exactly
one `dungeon_key` inventory item (`DUNGEON_KEY_ITEM_ID` in
`dungeons.js`) — a second, independent gate alongside the tier's
`entryCost`. Neither gate substitutes for the other: having a key
doesn't waive an unaffordable `entryCost`, and having enough resources
doesn't waive a missing key (`canSendHeroToDungeon`/
`sendHeroToDungeon` both gained a required `inventoryState` param to
check/spend it — a real signature change, not additive-only, same
precedent as `add-hero-classes`' `getCraftableRecipes` change; every
call site across `main.js` and the test suite needed updating). A key
is obtained two ways:
- **Crafted at the Workbench** — `dungeon_key` recipe in
  `crafting.js`, cost `{egg: 40, feathers: 40, wood: 30, rice: 30,
  stone: 30, ore: 20}`. This is a **deliberate developer-requested
  deviation** from `add-dungeon-keys/design.md`'s original suggestion
  (`{wood: 20, stone: 20, ore: 10}`, an industrial-lane-only cost) —
  the developer explicitly wanted a cost spanning all 6 resources so
  every resource has crafting utility. Documented inline in
  `crafting.js` and pinned in `test/crafting.test.js` against the
  actual shipped value, not the superseded suggestion. **Known side
  effect, not a bug**: since rice/ore don't unlock until Town Hall 5
  but the Dungeon Gate itself unlocks at TH4, a player literally
  cannot craft (or therefore send any hero on) any tier until TH5 —
  a direct, flagged consequence of the requested all-6-resources cost,
  not something to silently "fix" by changing the recipe without
  another explicit developer decision.
- **Won on the Lucky Wheel** — see lucky-wheel spec's reward table;
  always exactly 1 key per win, never scaled by Town Hall level (a
  discrete item count, not a resource quantity — see lucky-wheel
  spec's `getRewardScale` exemption).
- **Bought with gems** (`add-gems-currency`) — `buyDungeonKeyWithGems`
  in `dungeons.js`, cost `DUNGEON_KEY_GEM_COST`, an alternative gems
  sink to crafting/winning one rather than a third genuinely different
  source. See gems-currency spec for the full gems model.

The key is spent once, at send time, regardless of eventual mission
outcome — **not refunded on failure**, same non-refundable spirit as
`entryCost` already being non-refundable on failure. New saves start
with 0 keys (confirmed with the developer rather than assumed); the
first key must be crafted or won.

### Sending a hero
Only heroes that pass BOTH `isHeroIdle()` (see hero-system spec — this
is NOT simply "timer expired") AND are not downed (`!isDowned(hero)`,
see hero-system spec's Downed state section) are offered in the
picker (`canSendHeroToDungeon` checks both independently, plus the key
check above as a third independent condition). If every idle hero
happens to be downed, the picker shows an explicit empty-state message
("Every idle hero is downed — heal at the Barracks first.") rather
than silently showing nothing; similarly, a 0-key state shows "No
Dungeon Key — craft one at the Workbench or win one on the Lucky
Wheel." rather than a mysteriously disabled Send button. Sending
deducts the tier's entry cost and one key immediately and sets
`hero.busyUntil`/`hero.dungeonTier`; a hero already on a mission
cannot be sent again, including in the exact-boundary moment right as
its current timer expires but before resolution has run (regression-
tested in `test/dungeons.test.js`).

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
- Keep the dungeon-key check independent from `entryCost` affordability
  and from `isHeroIdle`/`isDowned` — three separate, independently-
  testable gates, not one collapsed into another. If a send is
  rejected, the reason (missing key vs. unaffordable vs. no eligible
  hero) should stay distinguishable, not just "disabled."
- Per the original proposal's non-goals (still in force): no
  multi-hero parties per run, no PvP/land battles, no hidden-RNG
  combat resolution (the power-vs-difficulty check must stay
  transparent to the player) — any of these needs its own proposal.
