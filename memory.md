# Chicken Saga Village — Project Memory

_Last updated: 2026-07-21_

## Current Objective
Build "Chicken Village" — a free, Pixiland-genre-inspired (not
IP-copied) village builder web game for the Chicken Saga brand.
Explicitly a fan/passion project: no real monetization, no NFTs, no
tokens, pending legal review. Vanilla JS + HTML5 Canvas, no framework,
localStorage only (no backend/accounts yet).

## Current Status
Heroes + Dungeons (`openspec/changes/add-heroes-dungeons/`) is fully
implemented and code-reviewed as of this session: Backend (1.1–1.5),
Frontend (2.1–2.5), and Code Reviewer (3.1–3.5) tasks are all done.
**Found and fixed a real bug during review** (see session log below):
a hero could be re-sent on a new mission in the window right as its
old mission's timer expired but before lazy resolution ran, silently
discarding the original mission's reward — contradicted design.md's
own stated intent. Fixed in `heroes.js`/`dungeons.js`, with a
regression test that fails against the old code and passes against
the fix (verified both directions). Only Documentation & Testing
(4.1–4.5) remains: `test/heroes.test.js`/`test/dungeons.test.js` are
now written as part of the Code Reviewer pass (task 3.x explicitly
calls for persistent tests, so 4.1 is effectively also done — next
session should confirm and check the box rather than write duplicate
tests), but new specs, the `world-map` spec update, and archiving
`openspec/changes/` are still open.

## Active Tasks
1. **Docs/Testing for Heroes + Dungeons** (tasks.md 4.1–4.5):
   `test/heroes.test.js` + `test/dungeons.test.js` now exist (written
   this session as part of Code Reviewer sign-off — confirm/check off
   4.1 rather than rewriting), new specs
   (`openspec/specs/hero-system/spec.md`,
   `openspec/specs/dungeon-system/spec.md`), `world-map` spec update
   for the 2 new buildings, archive `openspec/changes/` once specs
   are written, memory.md wrap-up.
2. **NEW — found this session, not fixed (out of scope, flagging for
   triage):** `applyUpkeep()` is called from `main.js`'s `loop(now)`
   using the `requestAnimationFrame` timestamp (time since page load)
   as its `now` argument, but `upkeepState.lastCheckedAt` is
   initialized with `Date.now()` (epoch ms) in `createUpkeepState()`.
   Those are different clocks — `now - lastCheckedAt` is a huge
   negative number on every call, so `applyUpkeep`'s early-return path
   (`if (consumed <= 0) return 0;`) fires every time *without*
   advancing `lastCheckedAt`, meaning egg upkeep likely never actually
   consumes anything in practice. This is separate from the
   already-tracked "no consequence at 0 egg" design gap (item 4 below)
   — this is upkeep not firing *at all*, a functional bug not a
   deferred design decision. Didn't fix it here: it's unrelated to the
   Heroes/Dungeons ticket, and silently starting to consume egg
   mid-unrelated-PR is a balance change that deserves its own
   dedicated pass, not a drive-by fix. Whoever picks this up should
   double check by adding a quick `test/upkeep.test.js` case that
   drives `loop()`'s actual call pattern (or just fix the call site to
   pass `Date.now()` instead of the rAF timestamp — likely the
   simplest correct fix, but flagging rather than assuming).
3. **Playtest Heroes + Dungeons in an actual browser** — this and the
   prior session's verification was thorough (persistent tests +
   jsdom smoke test) but is still not a human looking at it. In
   particular: confirm the roster row's countdown display looks right
   in the sub-frame window between a mission's timer expiring and
   `resolvePendingDungeons()` clearing it (should be invisible at 60fps
   given call ordering in `loop()`, per this session's trace, but
   worth eyeballing once).
4. Decide egg-upkeep *consequences* at 0 egg (still a no-op even once
   upkeep is actually firing — see item 2 above, these are two
   separate gaps) — unchanged.
5. Real art integration (still 100% placeholder) — unchanged.
6. Give refined goods a purpose (Chicken Feed/Plank/Brick/Ingot still
   just sit in inventory) — unchanged.
7. Remove the stray `chicken-saga-village-doctest-session.patch`
   file — flagged multiple sessions running now (2026-07-18, then
   again 2026-07-21 backend session), still on `origin/main` as of
   this session. Nobody has actually removed it yet; someone should
   just do it next time rather than re-flagging again.

## Frontend Session: Heroes + Dungeons UI (2026-07-21)
**Scope:** `openspec/changes/add-heroes-dungeons/tasks.md` 2.1–2.5.

**2.1 Map placement:** Barracks (2×2, col17/row15) + Dungeon Gate
(2×2, col20/row15) — open ground just below the Town Hall/Workbench
footprint, clear of the vertical path (col15) and the house cluster.
Ran the project's existing automated collision/bounds test
(`test/map.test.js`, already covers "no two footprints overlap" +
"stays within map bounds" generically over the whole `interactables`
array) — all 123 tests pass, no manual eyeballing required.

**2.2/2.3 Panels:** New `heroPanel` (Barracks) and `dungeonPanel`
(Dungeon Gate) in `index.html`/`styles.css`/`main.js`, following the
exact pattern Workbench/crafting-panel already established: locked
state reuses the *generic* building-panel Unlock button (just added
`isBarracks`/`isDungeonGate` to `updateBuildingPanel`'s type
recognition — the locked branch itself needed zero changes since it's
already keyed off `UNLOCK_CONFIG[buildingId]` generically); once
unlocked, the standard panel hides and the dedicated panel takes over
entirely. Dungeon panel is a tier-picker + idle-hero-picker (click to
select, `.selected` class), auto-picks the first idle hero, entry cost
reuses `formatCostHTML` (so red-insufficient-highlighting comes free).

**2.4 Countdown:** Refactored `formatCountdown` into `formatDuration`
(raw "Xm YYs") + `formatCountdown` (adds "Next: " prefix, used by
Lucky Wheel, unchanged) so the hero roster row's busy-status countdown
reuses the same formatter without duplicating logic.

**2.5 Resolution popups:** `resolvePendingDungeons()` runs every frame
in `loop()` (same lazy-resolution timing as Lucky Wheel ticket
accrual — independent of player position), spawns a floating popup at
the Dungeon Gate per resolved mission: `✅ ... success text` vs
`⚠️ ... partial credit text`, visually distinguished.

**Verification performed (all before committing):**
- `node --check` on `main.js`/`map.js` — clean.
- Full `npm test` equivalent (`node --test test/*.test.js` — note:
  `npm test`'s literal script, `node --test test/`, currently fails
  with `MODULE_NOT_FOUND` on this Node version/environment; pre-existing
  environment quirk unrelated to this change, worth a quick look by
  whoever owns CI) — 123/123 passing both before and after.
- Static import-graph check: every symbol `main.js` imports from
  `heroes.js`/`dungeons.js` confirmed to actually exist as an export.
- **Headless jsdom smoke test** (temporary script, not committed —
  see below): booted `main.js` for real in a jsdom DOM against a
  seeded `localStorage` save (using the actual `gameState.js` save
  format, not internal hooks), with a stubbed no-op canvas 2D context.
  Confirmed: (a) no runtime errors loading/running the game loop, (b)
  an already-expired dungeon mission resolves automatically within a
  couple of frames *regardless of player position*, producing a real
  floating-popup DOM element, (c) an overpowered hero (Epic Lv.5 vs.
  Easy) produces a `✅` full-success popup with the exact expected
  reward text, (d) an underpowered hero (Common Lv.1 vs. Hard)
  produces a `⚠️` partial-credit popup with correctly floored 50%
  rewards (`125🥚 60🐓 40🌲 25🌾` from a `250/120/80/50` full reward).
  This is real coverage of the riskiest new logic (timing-dependent
  lazy resolution + success/partial branching), not just static
  reasoning. **Not committed**: this project's standing convention is
  persistent tests in `test/`, not throwaway scripts, and adding
  `jsdom` as a permanent devDependency + DOM-level test harness is a
  bigger infra decision than this ticket covers — flagging as a
  possible future addition to the testing setup (could live alongside
  `test/` as a `test/dom/` smoke-test tier) rather than deciding
  unilaterally. The script itself (and the `jsdom` npm install used to
  run it) were deleted after use; nothing extra was left in the repo.

**Files touched:** `js/map.js`, `js/main.js`, `index.html`,
`styles.css`, `openspec/changes/add-heroes-dungeons/tasks.md` (checked
off 2.1–2.5), `memory.md`.

**Opportunistic fix (not scope creep — same files, one line each):**
`:root` in `styles.css` was missing `--rust-red-bright` and
`--panel-wood-light`, both referenced elsewhere in the file (upgrade
button hover, zero-rate text, crafting-recipe-row background) but
never defined, silently degrading. Defined both with theme-consistent
values since the new hero/dungeon panels reuse those same classes.

**Known UI issues (new):** None found in the new panels themselves
after verification. Pre-existing gap noted above (upkeep clock
mismatch) is not a UI issue, it's a `main.js` game-loop wiring bug.

## Testing Infrastructure (New, 2026-07-17)
**Added a real, persistent automated test suite** — `test/`, using
Node's built-in `node:test` runner (Node 20+, zero npm dependencies).
124 tests across 14 suites, one file per pure-logic module:
`resources`, `buildingLevels`, `buildingUnlocks`, `townHall`,
`workers`, `upkeep`, `crafting`, `questBoard`, `camera`,
`interactions`, `interactionHandlers`, `luckyWheel`, `gameState`,
`map`. Run via `npm test` or `node --test`.

- `test/helpers/localStorage-mock.js`: minimal in-memory
  `localStorage` polyfill installed on `globalThis`, imported before
  `gameState.js` in `gameState.test.js` — lets save/load/migration
  logic run under plain Node with no browser/jsdom.
- Several tests are explicit regression guards for bugs previously
  found and fixed in past sessions (documented inline): the
  flush-before-assign "no backfill production" rule in
  resources.js/workers.js, upgrade-cost purity (unaffected by
  unrelated buildings/Town Hall state) in buildingLevels.js, the
  camera viewport-resize clamp bug, and the edge-distance-not-center
  interaction-range calculation in interactions.js.
- `test/map.test.js` replaces the "manually re-derive every
  interactable's rectangle and confirm no overlaps" pattern several
  past sessions did by hand each time with a real automated check
  that runs on every `npm test`.
- **Explicitly NOT covered**: `main.js`, `render.js`, `sprites.js`,
  `spriteRenderer.js` — DOM/Canvas glue and visual output. These need
  browser playtesting, not unit tests; noted in README.md and
  docs/ARCHITECTURE.md so this isn't mistaken for an oversight later.
- **Not yet done, worth a future session**: no CI workflow file
  (e.g. GitHub Actions) exists to run `npm test` automatically on
  push/PR — currently the suite only runs when someone remembers to
  invoke it locally. Would meaningfully improve release readiness.

## Bug Found & Fixed via Testing: Stray `grain` Key Never Deleted After Rename Migration (2026-07-17)
**Found by:** writing `test/gameState.test.js`'s grain→rice migration
test and checking the *shape* of the migrated result, not just the
renamed value.

**Root cause:** `migrateOldResourceShape()` in `gameState.js` builds
the new `carried`/`totalCollected`/`buildingLastCollectedAt` objects
via `{ ...fresh, ...(rawResources.X || {}) }` — an object spread that
copies every key from the old save verbatim, including the legacy
`grain` key. The code below that correctly copies `grain`'s value
into the new `rice` key, but never removed the original `grain` key
from the spread result, so every migrated save carried a dead `grain`
entry forward alongside the new `rice` entry, forever (each subsequent
autosave just re-persists it).

**Impact:** Low severity in practice — confirmed via grep that
`main.js` always iterates resources via `RESOURCE_IDS`/explicit ids,
never `Object.keys(resources.carried)`, so the stray key was never
displayed or otherwise acted on. It was pure save-data bloat, but
real: a "new shape" that was supposed to have no `grain` key at all
(per the code's own comment) actually did.

**Fix:** Added `delete merged.carried.grain` (and the same for
`totalCollected`/`buildingLastCollectedAt`) immediately after copying
each value over to `rice`. Three-line change in `js/gameState.js`.

**Verification:** `node --check js/gameState.js` (syntax OK). Full
test suite: 124/124 passing after the fix (was 123/124 before, with
the one failure being this exact bug). Also reran `node --check` on
all 17 `js/*.js` files — all pass.

## Documentation Added (2026-07-17)
- **`README.md`**: was a single line (`# chicken-saga-village`) before
  this session. Now covers: fan-project disclaimer, controls, how to
  run locally (static file server required — ES module imports don't
  work from `file://`), full project structure with a one-line
  description of every `js/` file, save-data/migration overview,
  testing instructions, and contribution/workflow notes (openspec
  conventions, memory.md as the handoff log).
- **`docs/ARCHITECTURE.md`** (new): deeper developer-facing doc —
  pure-logic-vs-presentation-glue module split (and why that split
  matters for testability), full game state shape reference, the
  game loop's per-frame order of operations in `main.js`, a
  named-and-explained write-up of the "offline-safe timestamp
  checkpoint" pattern used by resource production/upkeep/Lucky Wheel
  tickets (previously only explained piecemeal in scattered code
  comments), the full save-migration chain in one place, and a
  "where to look for what" task→file lookup table.

## Next Recommended Task
1. Real in-browser playtest of: Lucky Wheel visuals, camera resize
   behavior, upgrade panel red-highlighting/layout — all previously
   verified only via code reasoning/simulation, never an actual
   browser (per Active Task #1, carried over from prior sessions).
2. Add a CI workflow (e.g. `.github/workflows/test.yml`) to run
   `npm test` automatically on push/PR — the test suite exists now
   but nothing enforces it gets run.
3. Archive the Lucky Wheel/crafting/layout bug-fix batch into
   `openspec/` (carried over, still not done).
4. Decide egg-upkeep consequences (still a no-op at 0 egg)
5. Real art integration (still 100% placeholder)
6. Give refined goods a purpose (Chicken Feed/Plank/Brick/Ingot still
   just sit in inventory)
7. Hero/dungeon system (non-NFT version) — still just discussed, not
   proposed

## Decisions
(Carried over from prior sessions, still all in force.)
- NFT/land ownership/revenue-share/monetization stays deferred
  pending legal review, full stop.
- Kenney.nl (CC0) is the recommended path for real art, not yet
  integrated.
- Resource role split: Egg = worker upkeep. Feathers = reserved for
  future hero system. Rice/Wood/Stone/Ore = industrial raw→refined
  lane.
- Workflow: developer uploads via GitHub web UI, not git CLI (per
  prior sessions' notes — this session committed directly via git CLI
  since it was working from a fresh clone, not a delivered zip; worth
  confirming with the developer which workflow is actually in use
  going forward).
- **Team members must pull the current live repo before starting
  work, not reuse an older local copy.** Found and fixed a real
  instance of this: 4 already-archived `openspec/changes/` folders
  (deleted in an earlier session) reappeared in a later upload,
  because GitHub's drag-and-drop upload only adds/overwrites files —
  it never deletes anything. Whoever generated that batch was working
  from a stale pre-archive copy of the repo; their actual new work
  was correct, the old folders just came along for the ride. Since
  there's no git merge to catch this automatically with a manual-
  upload workflow, this has to be a discipline each agent/session
  applies deliberately: check the live repo state first.
- Verification standard: every change gets a per-file syntax check,
  a full import-graph trace, and functional simulation tests before
  being called done — this session upgrades that standard further:
  those "functional simulation" checks should now be written as
  persistent tests in `test/` rather than temp scripts deleted after
  use, so the verification isn't lost/re-derived from scratch next
  session.

## New Decision This Session
- **Persistent automated tests, not throwaway verification
  scripts.** Multiple past sessions' "Verification performed" notes
  describe writing a temp Node script, running it, then deleting it.
  That worked for one-time confidence but meant the same
  verification had to be re-derived by hand in later sessions (e.g.
  "map layout has zero overlaps" was manually re-checked at least
  twice). Going forward: functional/behavioral verification for
  `js/*.js` logic changes should become a real `test/*.test.js` file
  using the existing `node --test` suite, not a deleted script.

## Backend Engineer Check-In (2026-07-16)
Reviewed repo/memory to look for backend work. Confirmed: project is
still 100% client-side (vanilla JS + Canvas, localStorage only) — no
server, API, database, or auth exists or is in scope right now. No
code changes made this check-in. Asked the developer whether to start
cloud save/sync, accounts/auth, or a Hero/Dungeon backend; developer
said none of these yet.

## Bug Fix: Upgrade Cost Was Reactive to Live TH Unlock State (2026-07-16)
**Root cause (given, not re-diagnosed):** `getUpgradeCost()` in
`buildingLevels.js` called `isResourceUnlocked(resId, townHallLevel)`
against *live* game state on every call, so a building already at a
fixed level could suddenly demand a brand-new resource type the
instant something unrelated elsewhere in the village crossed that
resource's Town Hall threshold — with zero further leveling on that
building itself. Upgrade cost must be a pure function of the
building's own level only.

**Fix implemented (files modified: `js/buildingLevels.js`,
`js/main.js`):**
- Replaced the TH-reactive resource-unlock scan in `getUpgradeCost()`
  with a fixed, deterministic rotation keyed only to the building's
  own level: every `EXTRA_RESOURCE_LEVEL_INTERVAL` (5) levels, one
  more resource type is added, picked in order from
  `RESOURCE_IDS.filter(id => !(id in base))` (deterministic per
  building since `RESOURCE_IDS` order is fixed).
- Dropped the now-unused `townHallLevel` parameter from
  `getUpgradeCost`, `canUpgradeBuilding`, `upgradeBuilding`.
- Removed the unused `isResourceUnlocked` import from
  `buildingLevels.js` (still used/exported fine from `resources.js`
  itself, so no orphaned export).
- Updated all 5 call sites in `main.js` (upgrade action handler +
  4 in the upgrade-panel refresh logic, both house and resource-
  building branches) to drop the trailing `gameState.townHall.level`
  argument.

**Verification:** `node --check` on both modified files (syntax OK).
Full grep of `js/*.js` for all three function names confirmed no
remaining call site still passes a 4th/3rd `townHallLevel` arg, and
no other file imports `isResourceUnlocked` from `buildingLevels.js`.
Functional simulation (temp Node script, deleted after use) walked
Old Coop level 1→11 and confirmed cost is 100% deterministic by level
alone (same output called twice at the same level) and resource-type
count only grows at the fixed 5-level cadence, never from unrelated
state.

**Flagged discrepancy (not fixed, needs product decision):** The
task's acceptance criteria said "Old Coop to level 6 should require a
3rd resource type." With the exact formula specified, Old Coop's
own base cost already has 1 resource (`egg`), so level 6 adds a
*2nd* type (`feathers`); a 3rd type doesn't land until level 11.
`nest_bundle` (2 base resources) would hit a 3rd type at level 6
instead. Implemented the code exactly as specified rather than
silently changing the interval/base to force "3rd type at level 6"
for Old Coop specifically — needs a developer call on whether the
interval, the affected building, or the acceptance wording should
change.

**Next backend task:** None queued. Recommend developer playtest
that no building's upgrade panel changes cost when leveling an
unrelated building/unlocking a new resource elsewhere, and decide on
the flagged level-6-vs-level-11 discrepancy above.

## Frontend Verification: Upgrade-Cost Panel vs. New Deterministic Cost Shape (2026-07-16)
**Scope (given, not a code-change ticket):** confirm the building
panel's cost-preview display (`formatCostHTML`, upgrade preview text
in `main.js`) still works correctly now that Backend's Ticket 1 fix
landed (`getUpgradeCost()` no longer takes/needs `townHallLevel`).

**Findings — no code changes required:**
- All 5 call sites in `main.js` (upgrade action handler at line 182,
  plus 4 in the panel-refresh logic — house branch lines 608/610,
  resource-building branch lines 635/637) already had the
  `townHallLevel` argument removed. This was done in the same commit
  batch as Backend's fix (`5441c99`/`1556f2c`), not left dangling —
  nothing to clean up.
- `formatCostHTML` is shape-agnostic by design: it only needs
  `getUpgradeCost()` to return a plain `{resourceId: amount}` object,
  which it still does. No dependency on *how* that object was
  computed (old TH-reactive scan vs. new deterministic rotation).
- Confirmed every resource id `getUpgradeCost()` can ever emit (base
  costs + rotation-tier extras) exists in `RESOURCE_CONFIG`, since
  `RESOURCE_IDS` is derived directly from that same config object —
  so the icon lookup in `formatCostHTML` can never hit `undefined`.

**Verification performed:** `node --check` on `main.js` and
`buildingLevels.js` (syntax OK). Functional simulation (temp Node
script, deleted after use) walked every real building id
(`old_coop`, `nest_bundle`, `woodshed`, `rice_paddy`, `quarry`,
`mine`, `house_1`–`5`) across levels 1–12, checking the red
`cost-insufficient` highlighting logic against both a zero-resources
case (everything should flag insufficient) and an abundant-resources
case (nothing should) — including levels that cross the 5-level
rotation-tier boundary where a cost dict gains an extra resource
type. All passed. Also re-verified `canUpgradeBuilding()` agrees with
the same afford/can't-afford outcomes at both extremes.

**Also corrected:** the "Active Tasks" #1 item above, which claimed
last session's fixes were still un-uploaded — that was stale; direct
repo inspection this session confirmed they're all present.

**Next frontend task:** None queued from this ticket. Real in-browser
playtest of the upgrade panel (visual confirmation of red highlighting
and layout, not just logic) is still open per Active Task #2 above.

## Code Review: Full Pass (2026-07-16)
**Scope:** First dedicated code-review pass over the whole repo (all
`js/*.js`), not tied to a specific feature ticket. Read every file,
cross-checked the map layout/collision claims already in this file by
simulation rather than trusting the prior note, and looked for bugs,
security, performance, readability, duplication, and architecture
issues.

**Bug found and fixed — stale camera viewport on window resize
(`js/main.js`):** `camera` was created once via `createCamera(...,
canvas.width, canvas.height)` at load time. The `window.resize`
listener called `resizeCanvas()`, which updated the `<canvas>`
element's own `width`/`height`, but never touched
`camera.viewportWidth`/`viewportHeight` — those are the values
`camera.follow()` actually clamps panning against. Net effect: after
a player resized their browser window, the camera kept clamping to
the *original* viewport size, which could let the view pan past the
map edge (into undrawn space) or stop correctly hugging the player
near boundaries, depending on which direction the window resized.
Fixed by moving camera creation before the resize listener and having
the listener update `camera.viewportWidth`/`viewportHeight` after
every resize. (First attempt referenced `camera` from inside
`resizeCanvas()` itself before its `const` declaration — caught before
committing, since that throws a temporal-dead-zone `ReferenceError`
on the very first call. Restructured so `resizeCanvas()` stays
canvas-only and a separate resize listener updates both canvas and
camera, in the correct declaration order.) Verified: `node --check`
on `js/main.js`, plus a standalone simulation of `camera.follow()`
against a shrunk viewport confirming it now clamps to the new
(smaller) bounds instead of the stale original ones.

**Verified, not changed — map layout has zero overlaps:** re-derived
every interactable's pixel rectangle from `map.js` independently
(not trusting the existing memory.md claim) and confirmed
programmatically: no building-vs-building overlaps, no building
sits on the pond, no building sits on the border tree ring. The
"tightened, zero overlaps" claim in the Completed section above
holds up under direct recomputation.

**Reviewed with no issues found:** `resources.js`, `buildingLevels.js`,
`buildingUnlocks.js`, `workers.js`, `upkeep.js`, `crafting.js`,
`questBoard.js`, `townHall.js`, `gameState.js` (including its
multi-generation save-migration logic), `interactionHandlers.js`,
`interactions.js`, `player.js`, `render.js`. Upkeep's fractional-time
checkpointing, the resource production offline-safe timestamp
pattern, and the save-migration chain (old flat egg fields → dict
shape → grain/rice rename → per-building houses → assignment-cap
clamping) are all internally consistent and correctly ordered.

**Flagged, not changed — needs a product/deploy decision:**
`js/luckyWheel.js` still has `TICKET_INTERVAL_MS` set to 1 minute
with an explicit comment marking it as a testing value that should
become 1 hour (`60*60*1000`) "before this goes anywhere near real
players." This is a deliberate, self-documented placeholder rather
than a bug, so left as-is rather than silently changing game balance
— but it's a real pre-launch blocker worth a checklist item so it
doesn't get shipped by accident.

**All 17 `js/*.js` files pass `node --check` (fresh full-repo sweep,
not just the files touched this session).**

**Next recommended task:** No other code changes queued from this
pass. Recommend the developer playtest the resize fix specifically
(resize the browser window mid-session, then walk toward each map
edge) since it's a real behavioral change, if a small one. The
`TICKET_INTERVAL_MS` testing value above should go on whatever
pre-launch checklist exists.

## OpenSpec Archival: Lucky Wheel/Crafting/Layout Bug-Fix Batch (2026-07-18)
The 2026-07-16 bug-fix batch (2 real Lucky Wheel bugs, 1 layout
overlap bug, upgrade-cost redesign, house capacity increase, map
reorg, unlock-button pattern) shipped reactively — in response to
direct playtesting feedback — and never got an OpenSpec proposal.
Per project convention, specs are the source of truth for current
behavior, so an undocumented spec drift risked future sessions
reasoning from stale/incorrect written descriptions instead of the
actual code. Cross-checked every affected spec against the real,
current `js/` source (not against memory.md's own prior claims) before
writing anything, per this project's established "verify, don't
trust the notes" habit.

**`openspec/specs/building-progression/spec.md`:**
- Unlocking section rewritten: was still describing the old "walk up,
  press E, pay cost" auto-unlock flow; now describes the actual
  current deliberate-button + persistent-requirements-panel pattern
  (confirmed against `main.js`'s `updateBuildingPanel()` locked-state
  branch and `interactionHandlers.js`'s locked-building dialogue).
- House capacity numbers corrected: spec still said the old +2/level,
  base 2, cap 10, 50-population-total figures; actual code
  (`buildingLevels.js`) is +3/level, base 3, cap 15, 75-population-
  total (the increase from the 2026-07-16 session).
- Upgrade-cost section: the deterministic-rotation formula description
  was *already accurate* (this project's habit of writing the "why,"
  not just the "what," meant no misleading text needed correcting
  here) — added an explicit root-cause writeup of the TH-reactive bug
  it replaced (per Ticket 1, `getUpgradeCost()` no longer takes a
  `townHallLevel` argument), since the spec previously documented the
  fixed formula without ever recording *why* it needed to be pure —
  a gap that risked a future change accidentally reintroducing a
  live-state dependency.
- Added a "Constraints for future changes" bullet making the
  purity requirement explicit and forward-looking, not just
  historical.

**`openspec/specs/lucky-wheel/spec.md`:**
- Divider description was describing the *broken* version ("thin
  divider lines... including the wrap-around seam — a bug caught and
  fixed" implied gradient-band dividers were the fix; they were
  actually the bug). Rewritten to describe the real fix (DOM line
  elements) and why gradient bands failed (anti-aliasing).
- Added the label-positioning bug (reward mismatch — labels landing
  ~90° from their actual segment) with the geometric root cause
  (`translate` Y-vs-X axis confusion relative to `rotate(0deg)`'s
  reference direction), which the spec previously didn't mention at
  all.
- Added a forward-looking constraint against reintroducing either bug.

**`openspec/specs/world-map/spec.md`:**
- "Clustered by type" layout description (houses in one area,
  resource buildings in another) was the *pre-reorg* layout. Rewritten
  to describe the actual current v2 layout (resource cluster
  top-right, Town Hall/Workbench/Farmer Joe/houses all clustered
  centrally) with the why (gameplay revolves around Town Hall and
  houses, so cluster near where the player spends time). Cross-checked
  every coordinate directly against `map.js`'s `interactables` array,
  not assumed from the prior session's prose description.
- Noted that the zero-overlap layout check is now enforced
  automatically by `test/map.test.js` on every test run, not just a
  one-time manual verification.

**Not done, deliberately out of scope for this task:** did not create
a retroactive `openspec/changes/<name>/` proposal folder for this
batch — the task only asked for `specs/` updates, and adding a
changes/ folder wasn't requested. Worth a future call: this project's
existing `changes/` folders (`add-village-mvp`, `add-resource-economy`,
`add-industrial-resources`, `rework-building-progression`) are all
planned-ahead-of-time proposals; a reactive bug-fix batch may not fit
that template well, or may need a lighter-weight variant.

**Verification:** No code changed this session — docs-only. Reran the
full test suite (124/124 passing, unchanged) to confirm nothing was
inadvertently touched. Cleaned up a stray
`chicken-saga-village-doctest-session.patch` file that had been
uploaded into the repo root alongside the 2026-07-17 session's actual
deliverables — it was a delivery artifact (a git patch for manual
application), not meant to live in the repo.

## Session Log
- **2026-07-21 (Code Reviewer — Heroes/Dungeons sign-off, tasks
  3.1-3.5):** Explicit instruction this session: fresh clone, don't
  reuse any local copy — done (`git clone` from scratch, confirmed
  HEAD before touching anything). Read
  `openspec/changes/add-heroes-dungeons/{proposal,design,tasks}.md`
  and `memory.md` before reviewing, per standing process; Backend
  (1.1-1.5) and Frontend (2.1-2.5) tasks were already checked off and
  verified against the actual code, not just trusted.

  **Found and fixed a real bug (task 3.3's edge case), not just
  verified it:** the busy-check `sendHeroToDungeon` used to gate
  re-sends was time-based (`hero.busyUntil > now`), so the instant a
  mission's nominal duration elapsed — even before
  `resolveReadyDungeons()` ever ran — a hero looked "idle" and could
  be sent on a brand-new mission. `sendHeroToDungeon` overwrites
  `hero.dungeonTier` unconditionally, so the *original* still-
  unresolved mission's reward became permanently unreachable: silent
  data loss, not a crash. This directly contradicts design.md's own
  wording — "can't be sent on a second mission until the first
  **resolves**" (not "until the timer runs out"). Reproduced it first
  with a throwaway script (funded resources, sent a hero, jumped `now`
  to exactly `hero.busyUntil`, confirmed a second send succeeded and
  silently clobbered `dungeonTier`) before touching any code, to make
  sure it was real and not a misreading.

  In practice this is masked in the shipped game: `main.js`'s `loop()`
  calls `resolvePendingDungeons()` every single animation frame,
  before any panel/button code runs, so `busyUntil` is nulled out
  before a player could ever click "Send" in that exact window.
  Fixed anyway rather than just documenting it: it's a small, well-
  contained change, it's the literal regression tasks.md 3.3 asked to
  be verified against, and relying on "the call order happens to save
  us" as the only thing preventing silent reward loss is fragile
  (breaks the moment any other caller — a test, a debug tool, a future
  batch-processing path — sends without resolving first).

  **The fix** separates two previously-conflated questions that had
  been implemented with one function:
  - "Is the mission timer still actively counting down?" (time-based,
    `hero.busyUntil > now`) — kept as `isHeroBusy`, still used by
    `resolveDungeon()`'s own "nothing to resolve yet" guard and by the
    roster row's countdown display. Unchanged.
  - "Can this hero be sent on a NEW mission?" (resolution-based,
    `hero.busyUntil === null`) — `isHeroIdle` redefined around this;
    no longer just `!isHeroBusy(hero, now)`. Kept the `(hero, now)`
    signature (ignoring `now`) so existing call sites didn't need
    touching. `dungeons.js`'s `canSendHeroToDungeon` switched from
    checking `isHeroBusy` to checking `isHeroIdle`.
  Verified the fix both ways: reran the original repro against the
  fixed code (second send now correctly rejected, original mission's
  `dungeonTier` survives, and resolving-then-resending still works
  normally afterward); also temporarily reverted just the fix (not the
  new tests) and confirmed the new regression tests fail against the
  old code, then restored the fix and confirmed they pass — so the
  tests are proven to actually catch this, not just exercise the
  passing path.

  **3.1 (recruit weighted-roll):** New `test/heroes.test.js`. Two
  angles, not just one: (a) a *deterministic* test that mocks
  `Math.random` to the exact cumulative-weight boundaries (0, 0.6-ε,
  0.6, 0.9-ε, 0.9, 0.9999) and asserts the exact rarity `pickWeighted`
  should land on at each — this pins down the boundary semantics
  precisely (roll===60 belongs to the *next* bucket, not the one
  ending there) rather than trusting a probabilistic test alone; (b) a
  4000-sample statistical test with a generous tolerance band
  confirming the roll isn't badly broken end-to-end through
  `recruitHero`. Also covers: `RARITY_TABLE` weights/stats match
  design.md exactly, `recruitHero` affordability gating, exact
  `RECRUIT_COST` deduction, fresh-hero field shape, `effectivePower`
  scaling (exact 2x at level 11, capped at `MAX_HERO_LEVEL` even if
  `hero.level` somehow exceeds it), `grantXp` chaining/capping.

  **3.2 (dungeon resolution math):** New `test/dungeons.test.js`.
  Found real exact-equality boundary cases in the *existing* rarity/
  tier numbers rather than needing synthetic mocks: rare Lv.1 has
  `effectivePower` exactly 25, matching Medium's difficulty exactly;
  rare Lv.9 is exactly 45, matching Hard's difficulty exactly. Both
  confirmed as SUCCESS (the `>=` in `resolveDungeon` is correct, not
  `>`), plus a one-level-down case confirmed as partial credit.
  Verified partial-credit reward flooring per-resource (Hard tier: all
  four reward values happen to be even, so also specifically checked
  XP flooring using Medium's odd `fullXp: 25` → `floor(25/2) = 12`,
  not 12 vs 13 ambiguity). Also covers: `DUNGEON_TIERS` matches
  design.md exactly (all three tiers, every field), resolution clears
  `busyUntil`/`dungeonTier`, XP grant actually feeds the leveling
  path, `resolveReadyDungeons` batch/lazy behavior (resolves only
  what's due, leaves mid-mission heroes untouched, handles
  simultaneous resolutions).

  **3.3 (busy-hero double-send):** See bug writeup above — the
  regression test (`REGRESSION:` prefix in `dungeons.test.js`) is the
  primary deliverable here, proven to fail-then-pass across the fix.

  **3.4 (full verification standard):** `node --check` on all 22
  `js/*.js` + both new `test/*.test.js` files — clean. Full import-
  graph trace: ran `await import(...)` on every one of the 22
  `js/*.js` files individually (not just ones reachable from
  `main.js`), confirming every file's own imports link against real
  exports across the whole graph; only expected failure was `main.js`
  hitting `document is not defined` at its first DOM call, *after*
  full graph linking succeeded — no stale-import regressions anywhere,
  including in the new `heroes.js`/`dungeons.js` wiring. Full suite:
  162/162 passing (123 pre-existing + 39 new from this session's two
  test files), via `node --test test/*.test.js` directly (the literal
  `npm test` script's `node --test test/` form is still the pre-
  existing sandbox-only Node-version quirk noted in the 2026-07-21
  Backend session — confirmed CI's real Actions runner is unaffected,
  not re-verified again this session since it was already checked).

  **3.5 (non-goals check):** Grepped every touched/new file for NFT/
  wallet/mint/marketplace/blockchain/crypto/PvP/land-battle/sell-hero/
  trade-hero/fusion language. Zero hits beyond `heroes.js`'s own
  header comment explicitly *disclaiming* those things (documentation
  reaffirming the boundary, not a violation) and unrelated `merge`/
  `merged` hits in `gameState.js` that are save-migration object-
  merging, nothing to do with hero fusion. Hero data model itself
  (`id, name, rarity, level, xp, busyUntil, dungeonTier`) has no
  ownership/price/wallet-address concept. Clean — nothing in this
  change touches the non-goals list.

  **Also wrote `test/heroes.test.js` and `test/dungeons.test.js`**
  (tasks.md 4.1) as part of 3.1-3.3's "write/extend tests" instruction
  — flagged in Active Tasks above so next session checks 4.1 off
  rather than duplicating this work.

  Files modified: `js/heroes.js`, `js/dungeons.js`,
  `openspec/changes/add-heroes-dungeons/tasks.md`, `memory.md`. Files
  added: `test/heroes.test.js`, `test/dungeons.test.js`.

  **Not done (Documentation & Testing's remaining scope, 4.2-4.5):**
  new specs (`hero-system`, `dungeon-system`), `world-map` spec
  update, archiving `openspec/changes/add-heroes-dungeons/`. Also
  still open: the `applyUpkeep`/rAF-timestamp bug flagged above (out
  of scope for this ticket) and the still-not-actually-removed
  `chicken-saga-village-doctest-session.patch` file.
- **2026-07-21 (Frontend)**: Cloned fresh per explicit instruction
  (not reused local copy — confirmed HEAD was ahead of my last
  session's clone, so this mattered). Implemented Heroes + Dungeons
  frontend tasks 2.1–2.5 (map placement, hero-roster panel, dungeon
  tier/hero-picker panel, busy countdown, resolution popups) after
  reading `openspec/changes/add-heroes-dungeons/` and verifying
  Backend's prerequisites were actually in the code (not just checked
  off in tasks.md — they were still unchecked, code was done anyway).
  Verified via `node --check`, full `npm test`-equivalent (123/123
  pass), a static import-graph check, and a temporary headless-jsdom
  smoke test (deleted after use) that booted the real game loop from
  a seeded save and confirmed both the success and partial-credit
  dungeon-resolution paths produce correct output end-to-end — not
  just code-reasoned. Also fixed a small pre-existing CSS gap
  (`--rust-red-bright`/`--panel-wood-light` referenced but never
  defined in `:root`). Found but explicitly did NOT fix (flagged in
  Active Tasks instead, out of this ticket's scope): `applyUpkeep()`
  in the main loop is fed a `requestAnimationFrame` timestamp instead
  of `Date.now()`, so egg upkeep likely never actually fires. Checked
  off tasks.md 2.1–2.5. Files touched: `js/map.js`, `js/main.js`,
  `index.html`, `styles.css`,
  `openspec/changes/add-heroes-dungeons/tasks.md`, `memory.md`. Not
  pushed to GitHub — no git credentials in this execution environment
  (confirmed by attempting `git push`); delivering via committed local
  history for the user to upload, per established workflow.
- **This session (Code Reviewer)**: Full-repo review pass, not scoped
  to one feature. Found and fixed one real bug: the camera's
  viewport dimensions went stale on browser window resize because
  the resize handler only resized the `<canvas>` element, never
  `camera.viewportWidth`/`viewportHeight` (which `camera.follow()`
  clamps against) — could let the view pan past the map edge after a
  resize. Fixed in `js/main.js` (also caught and corrected a
  temporal-dead-zone bug in my own first attempt before committing
  it). Independently re-verified the "map layout has zero overlaps"
  claim from a prior session by recomputing all interactable
  rectangles from scratch rather than trusting the existing note —
  confirmed true. Reviewed all other `js/*.js` files with no further
  issues found. Flagged (not changed, needs a product call) that
  `luckyWheel.js`'s `TICKET_INTERVAL_MS` is still an explicit
  1-minute testing value that needs to become 1 hour before launch.
  Verification: `node --check` on all 17 `js/*.js` files, plus a
  standalone functional simulation of the camera fix. Files modified:
  `js/main.js`, `memory.md`.
- **This session**: Fixed 9 items from direct playtesting feedback:
  2 real Lucky Wheel bugs (dividers, reward-label mismatch — both
  root-caused via careful geometry/CSS reasoning, not guessed at),
  1 real layout bug (crafting panel overlapping the interact prompt),
  redesigned upgrade costs to include all TH-unlocked resources,
  increased house capacity 50%, reorganized the map layout (tighter
  resource cluster, Workbench + houses moved next to Town Hall), and
  made unlocking a deliberate button-click matching the upgrade
  pattern (with a new persistent requirements panel). All changes
  verified via syntax check + full import-graph trace + functional
  simulation. Not yet uploaded to the repo — delivered as a zip only.
- **2026-07-16 (Frontend)**: Cloned repo fresh and verified directly
  (rather than trusting memory.md's own claims) that last session's
  fixes are actually live in the repo — corrected the stale "not
  uploaded" note above. Verified the upgrade-cost preview UI
  (`formatCostHTML` + red insufficient-resource highlighting) needs
  no changes after Backend's Ticket 1 fix (`getUpgradeCost()` dropping
  `townHallLevel`) — all 5 call sites in `main.js` were already
  updated, and functional simulation across every building/level
  confirmed the highlighting logic still works against the new cost
  shape. No code changes made. Files touched: `memory.md` only.
- **2026-07-17 (Documentation & Testing)**: First dedicated docs/test
  session. Built a real, persistent test suite (`test/`, Node's
  built-in `node:test`, zero dependencies) covering all 14 pure-logic
  modules — 124 tests, several written as explicit regression guards
  for bugs documented earlier in this file (backfill-on-assign,
  upgrade-cost purity, camera resize clamp, edge-vs-center interaction
  distance). Added `test/helpers/localStorage-mock.js` so
  `gameState.js` save/load/migration logic is testable under plain
  Node. Running the new suite caught one real (low-severity) bug:
  `migrateOldResourceShape()` in `gameState.js` never deleted the old
  `grain` key after copying its value to `rice`, so every migrated
  save carried a dead `grain` entry forward indefinitely — fixed with
  a 3-line change (`delete` after each copy), verified via
  `node --check` + full suite (124/124 passing, was 123/124).
  Rewrote `README.md` from a one-line placeholder into a full project
  overview (controls, local-serving instructions, project structure,
  save/migration notes, testing instructions, contribution notes).
  Added `docs/ARCHITECTURE.md`: pure-logic-vs-glue module split, full
  game state shape reference, per-frame game loop order, a named
  write-up of the "offline-safe timestamp checkpoint" pattern used
  across resources/upkeep/Lucky Wheel, the complete save-migration
  chain, and a task→file lookup table. Explicitly documented that
  `main.js`/`render.js`/`sprites.js`/`spriteRenderer.js` are NOT
  covered by automated tests (DOM/Canvas glue, needs browser
  playtesting) so this isn't mistaken for a gap later. Files
  modified/added: `js/gameState.js` (bug fix), `README.md` (rewrite),
  `docs/ARCHITECTURE.md` (new), `package.json` (new), `test/*` (new,
  15 files), `memory.md`.
- **2026-07-18 (CI)**: Added `.github/workflows/test.yml` — runs
  `npm test` on every push/PR via `actions/checkout@v4` +
  `actions/setup-node@v4` (Node 20), no install step (zero deps).
  File matches spec exactly. **Flagged risk, not fixed (out of
  scope for this task):** in this sandbox, `npm test` (which runs
  `node --test test/`) fails with `Cannot find module '.../test'` —
  Node 22.22.2 here appears to mis-handle an explicit directory
  argument to `--test`, treating it as the entry script instead of a
  discovery path. Reproduced in a throwaway unrelated directory too,
  so it's a Node-build quirk, not project-specific. Bare
  `node --test` (no arg) correctly auto-discovers and passes
  124/124. Could not verify whether Node 20 (what the new CI workflow
  pins via setup-node) has the same issue — no way to install Node 20
  locally in this sandbox to test. **If the first Actions run fails
  with a similar error, the fix is a 1-line `package.json` change:**
  `"test": "node --test"` (drop the trailing `test/`, since the test
  runner already auto-discovers `test/**/*.test.js` by default).
  Deliberately did not make that change pre-emptively since it could
  not be confirmed as necessary. Files modified:
  `.github/workflows/test.yml` (new), `memory.md`.
  **Next backend task:** none queued — recommend developer watch the
  first Actions run after pushing and apply the `package.json` fix
  above only if it fails with the `Cannot find module` error.
- **2026-07-18 (Documentation & Testing — OpenSpec archival)**: Fresh
  clone confirmed the 2026-07-17 test suite + docs and the CI workflow
  are both live on `origin/main` (developer uploaded them, per the
  prior session's zip). Archived the previously-undocumented
  2026-07-16 Lucky Wheel/crafting/layout/unlock-button bug-fix batch
  into `openspec/specs/` as requested — updated
  `building-progression/spec.md` (unlock pattern rewritten to the
  actual deliberate-button/requirements-panel flow, house capacity
  numbers corrected from stale +2/base2/cap10 to actual +3/base3/
  cap15, added root-cause writeup of the Town-Hall-reactive
  upgrade-cost bug and a forward-looking purity constraint),
  `lucky-wheel/spec.md` (divider/label sections were describing the
  *broken* pre-fix versions — rewritten to the real DOM-line-divider
  and Y-axis-translate-label fixes with root causes), and
  `world-map/spec.md` (layout description updated from the old
  "clustered by type" to the actual current "resource cluster +
  central Town Hall/house cluster" v2 layout, cross-checked directly
  against `map.js` coordinates). Every change was verified against
  live source code (`js/buildingLevels.js`, `js/main.js`,
  `js/luckyWheel.js`, `js/map.js`), not against prior sessions' prose
  claims. Also removed a stray delivery artifact
  (`chicken-saga-village-doctest-session.patch`) that had been
  uploaded into the repo root by mistake — it wasn't meant to live
  there. Docs-only session, no `js/` changes; reran the full suite to
  confirm (124/124 passing, unchanged). Deliberately did not create a
  retroactive `openspec/changes/` proposal folder — out of the
  requested scope, flagged as a question for a future session. Files
  modified: `openspec/specs/building-progression/spec.md`,
  `openspec/specs/lucky-wheel/spec.md`,
  `openspec/specs/world-map/spec.md`, `memory.md`. Files removed:
  `chicken-saga-village-doctest-session.patch`.
- **2026-07-21 (Backend Engineer — Heroes/Dungeons, tasks 1.1-1.5)**:
  Fresh clone confirmed live state (CI green on all 9 runs; the
  npm-test risk flagged 2026-07-18 never materialized — Node 20 on
  the real Actions runner handles `node --test test/` fine, that was
  a sandbox-only Node 22 quirk). **Also found the 2026-07-18 doc-vs-
  reality mismatch**: `chicken-saga-village-doctest-session.patch`
  removal was logged as done but was only ever a local sandbox
  change, never pushed — file is still on `origin/main` as of this
  session. Not yet removed (deferred to developer this round; flagged
  again for whoever picks it up).
  Implemented the 5 Backend Engineer tasks from
  `openspec/changes/add-heroes-dungeons/tasks.md` against
  `design.md`:
  - `js/heroes.js` (new): hero data model, `RARITY_TABLE`
    (common/rare/epic weights+stats per design.md), `recruitHero()`
    (weighted roll), `effectivePower()` (+10%/level, capped at 20),
    `grantXp()` (chained level-ups), `RECRUIT_COST`.
  - `js/dungeons.js` (new): `DUNGEON_TIERS` (easy/medium/hard config
    per design.md), `sendHeroToDungeon()`, `resolveDungeon()` (lazy,
    deterministic power-vs-difficulty check, 50%-floored partial
    credit on failure), `resolveReadyDungeons()` (batch/lazy resolve
    on next interaction).
  - `js/luckyWheel.js`: extracted the private `pickWeightedReward()`
    algorithm into an exported generic `pickWeighted(entries,
    weightKey)` so heroes.js genuinely reuses the Lucky Wheel's
    weighted-pick pattern (imports it) instead of a parallel
    reimplementation — tasks.md said "reuse... don't reimplement", so
    treated that as license to make the shared piece explicit rather
    than just copy the algorithm by hand. Reward-table behavior is
    byte-for-byte unchanged (same random roll math), confirmed by the
    existing Lucky Wheel tests still passing untouched.
  - `js/buildingUnlocks.js`: added `barracks` (TH3, `{egg:50,
    feathers:30}`) and `dungeon_gate` (TH4, `{egg:80, feathers:50}`)
    to `UNLOCK_CONFIG`, matching design.md exactly.
  - `js/gameState.js`: added `heroes: createHeroRosterState()` to
    `createGameState()`; `loadGameState()` merges it like
    luckyWheel/upkeep (no migration needed, it's new state) but
    guards `roster` specifically to a real array (falls back to an
    empty roster) since a corrupted/non-array value would break every
    downstream roster consumer.
  - `js/interactionHandlers.js`: added `barracks` and `dungeon_gate`
    handlers following the exact existing unlock-check pattern
    (locked → requirement/cost text, unlocked → info-only, actual
    recruit/send stays button-driven per tasks.md 1.5). Dungeon
    Gate's handler calls `resolveReadyDungeons()` on every interact
    — this is where the lazy resolution actually gets triggered.
  **One deliberate deviation from design.md, flagged for the next
  session/reviewer:** design.md's hero persistence shape is `{ id,
  name, rarity, level, xp, busyUntil }` — that's enough to know a
  hero is busy, but not *which dungeon tier* it's running (needed to
  resolve rewards/difficulty). Rather than add a separate "dungeon
  state" object (design.md explicitly says not to), added one more
  nullable field directly on the hero object: `dungeonTier`. Same
  spirit as keeping busy/idle status on the hero, just enough extra
  to make resolution possible. Documented inline in `heroes.js` too.
  **Verification:** `node --check` on all 6 touched/new files;
  `node --test` full suite still 124/124 (unchanged — no test files
  touched, that's Documentation & Testing's task 4.1); import-graph
  grep confirmed clean wiring (heroes.js → luckyWheel.js, dungeons.js
  → heroes.js, gameState.js/interactionHandlers.js → heroes.js +
  dungeons.js, no circular imports). Ran a throwaway functional
  simulation (deleted after use, not committed) covering: recruit
  affordability + cost deduction, rarity distribution roughly
  matching 60/30/10 weights over 5000 rolls, power scaling exactness
  at level 11 (should be exactly 2x base), XP chaining + level-20
  cap, busy-hero double-send rejection, no-resolve-before-busyUntil,
  full reward/XP on success, floored-half reward/XP on partial
  credit, and multi-hero batch resolution via
  `resolveReadyDungeons()` — all passed.
  **Not done (out of scope for Backend Engineer):** map.js placement,
  any UI/panels, countdown display, floating popups (Frontend
  Engineer tasks 2.1-2.5); `test/heroes.test.js`/`test/dungeons.test.js`,
  new specs, world-map spec update, changes-folder archival
  (Documentation & Testing tasks 4.1-4.4); weighted-roll/resolution-
  math verification and sign-off (Code Reviewer tasks 3.1-3.5).
  Files modified: `js/luckyWheel.js`, `js/buildingUnlocks.js`,
  `js/gameState.js`, `js/interactionHandlers.js`. Files added:
  `js/heroes.js`, `js/dungeons.js`.
  **Next backend task:** none queued from my side — Frontend Engineer
  can now build the Barracks/Dungeon Gate panels against this API
  surface (`recruitHero`, `getRarityStats`, `isHeroIdle`,
  `sendHeroToDungeon`, `canSendHeroToDungeon`, `resolveReadyDungeons`,
  `DUNGEON_TIERS`). Also still pending: remove the stray
  `chicken-saga-village-doctest-session.patch` file (see above).

  **Required reading before starting tasks 2.1-2.5 (Frontend
  Engineer) — read the actual files, not just this summary:**
  - `js/luckyWheel.js` — tasks.md 1.1 and 1.2 both say "reuse this
    pattern, don't reimplement" for the weighted-pick/lazy-resolution
    mechanics. That's not a suggestion to skim; the file is short and
    the two things worth actually reading closely are (1) the
    exported `pickWeighted(entries, weightKey)` helper — the same
    function `heroes.js` now imports for the recruit roll, so any
    frontend weighted-display logic (e.g. showing rarity odds) should
    read the same `RARITY_TABLE`/`weight` shape rather than
    inventing a second convention — and (2) `syncTickets()` /
    `getMsUntilNextTicket()`, which is the lazy "resolve on next
    interaction, checkpoint by elapsed ms" pattern that
    `dungeons.js`'s `resolveDungeon()`/`resolveReadyDungeons()` also
    follows and that the countdown display (task 2.4) needs to mirror
    for the "Xm Ys remaining" formatting to feel consistent with the
    Lucky Wheel widget already on screen.
  - `js/buildingUnlocks.js` and `js/gameState.js` — these are the
    templates for how *every* prior building/state addition in this
    project has been structured, and the Barracks/Dungeon Gate
    additions this session followed them exactly: `buildingUnlocks.js`
    is the single source of truth for unlock cost/Town-Hall-gate
    (`UNLOCK_CONFIG`), and `gameState.js` is where new state gets
    composed into `createGameState()`/`loadGameState()` (see the
    `heroes: createHeroRosterState()` entries added this session for
    the exact shape to copy from if any future state needs adding).
    Any new building or persisted state should be added the same way
    — don't invent a parallel pattern for unlock config or state
    composition.
