# Chicken Saga Village — Project Memory

_Last updated: 2026-07-31_

## Current Objective
Build "Chicken Village" — a free, Pixiland-genre-inspired (not
IP-copied) village builder web game for the Chicken Saga brand.
Explicitly a fan/passion project: no real monetization, no NFTs, no
tokens, pending legal review. Vanilla JS + HTML5 Canvas, no framework,
localStorage only (no backend/accounts yet).

## Current Status
**Documentation & Testing is now done for all 4 proposals**
(`add-click-to-open-panels`, `add-dungeon-failure`, `add-hero-classes`,
`add-th10-houses`) plus the previously-duplicated `add-heroes-dungeons`
folder (a stale re-upload, see Decisions — deleted again, no new work
needed there since it was already fully archived). Every
`openspec/changes/` folder is now gone; all 4+1 proposals are fully
merged into `openspec/specs/`. Test suite grew from 165 to 213
(all passing — the 3 tests that were failing at session start from
the partial-credit-removal and crafting-signature changes are now
fixed, not skipped). Also fixed 2 small pre-existing infra bugs
flagged by prior sessions: `npm test`'s script and a stale duplicate
`openspec/changes/add-heroes-dungeons/`. See "Documentation & Testing
Session: All 4 Proposals (2026-07-31)" below for full detail.

## Active Tasks
1. **Still open — found by a prior session, not fixed by anyone yet:**
   `applyUpkeep()` in `main.js`'s `loop(now)` still receives the
   `requestAnimationFrame` timestamp instead of `Date.now()`. Confirmed
   still present this session; still not touched — a balance-affecting
   fix, deliberately left for its own dedicated pass per every prior
   session that's found it.
2. Real art integration (still 100% placeholder) — unchanged.
3. **Playtest all 4 shipped features in an actual browser** — still
   nobody has actually clicked through Heal Potion/downed-state/
   click-to-open/TH10 live; verified so far via a mix of persistent
   tests, direct code review, and one prior session's temporary
   (uncommitted) jsdom smoke test.
4. **NEW — flagged, not decided:** whether to add jsdom (or similar)
   as a real, committed test dependency to get persistent automated
   coverage of click-to-open-panels' actual DOM/canvas-click behavior.
   Currently that behavior is playtested by hand + code-reviewed, same
   as all other `main.js` UI — consistent with this project's existing
   pattern, but flagging explicitly since it's a real option, not
   silently deciding either way. See this session's log for why it
   wasn't added unilaterally.

## Code Reviewer Session: All 4 Pending Proposals (2026-07-30)
Fresh clone each time per explicit standing instruction, confirmed
HEAD before starting and re-confirmed unchanged across several
re-clones mid-session (`685ab75` throughout).

**First finding: `add-click-to-open-panels`'s `tasks.md` was entirely
stale.** Every checkbox (Backend 1.1, Frontend 2.1-2.6) was unchecked,
which would normally mean "not ready for Code Reviewer work" — but
direct reading of `main.js`/`interactions.js` against design.md's
exact spec showed the feature was fully and correctly implemented.
Fixed the stale checkboxes after this independent verification rather
than either blindly trusting tasks.md and skipping the review, or
blindly trusting the code without checking it matched the spec.

**Verified via a mix of jsdom simulation and direct code review.** A
temporary jsdom smoke test (not committed — `npm install --no-save
jsdom`, deleted along with the test script before finishing) booted
the real `index.html` + `main.js`, manually drove
`requestAnimationFrame` to fast-forward the game loop deterministically,
and dispatched genuine `KeyboardEvent`s to walk a real player around.
Confirmed live: E-press open/toggle-close/re-open on a resource
building, switching between two different buildings correctly updates
panel content, and walking far away auto-closes the panel with no
explicit close action. The test's own pathing repeatedly failed to
navigate to Town Hall/Barracks/Dungeon Gate within budget — rather
than keep burning effort tuning a test-script pathfinding problem,
fell back to direct code review for those specific paths and
documented the exact scope of what was/wasn't live-simulated in
tasks.md instead of overclaiming coverage.

**`add-dungeon-failure`, `add-hero-classes`, `add-th10-houses`:** all
pure-logic (no DOM), verified with direct scripted checks against
heroes.js/dungeons.js/crafting.js/townHall.js/buildingLevels.js/
buildingUnlocks.js rather than jsdom. All checks passed except one:

**Found and fixed a real bug, not just verified against one:**
`heroes.js`'s `useHealPotion()` set a downed/injured hero's `currentHp`
straight to `getMaxHp(hero)` — a full heal — but design.md's own
Equipment Items table explicitly labels it "Heal Potion (25%)" and
lists its effect as "restores 25% max HP, instant use". This directly
contradicts a value stated in the design doc, and undermines
design.md's own stated reasoning for having both a potion and a paid
Barracks heal ("potion = quick partial heal, Barracks paid heal = full
restore" — a full-heal potion at a flat 10-rice cost strictly
dominates the rarity-scaled paid heal). Cross-checked memory.md and
found this had actually been flagged before it was even written: an
earlier Backend session's note explicitly said Heal Potion's
application logic wasn't assigned to anyone yet and suggested the
exact formula (`Math.min(getMaxHp(hero), hero.currentHp +
Math.ceil(getMaxHp(hero) * 0.25))`) — whoever eventually implemented
`useHealPotion()` didn't use it. Fixed to that formula. Scripted
regression test confirms: no-op at full HP, correct partial-heal
amount, correctly capped at max, and — flagging rather than silently
also "fixing" — confirmed a downed hero CAN be brought back above 0
via a potion for far less than the Barracks heal cost, since
`canUseHealPotion` allows use on any hero below max, not just downed
ones. This is exactly the tension design.md's own Risks section
already flags — left the gating as-is rather than inventing an extra
rule design.md doesn't state; noted in Active Tasks for a future
design pass to make an explicit call.

**Full verification breakdown by proposal** (same standard sweep
repeated per proposal — syntax + import-graph + full test suite,
`node --check` on all 22 `js/*.js` files clean each time, full suite
161/161 non-deferred passing throughout, same 3 pre-existing/deferred
failures as documented in prior sessions):
- `add-dungeon-failure` 3.1-3.4: downed-hero send rejection (function
  AND UI picker, which excludes downed heroes from the list entirely),
  heal cost exact-multiplier check for all 3 rarities (1x/2x/4x),
  success path fully unaffected across all 3 tiers, failure path
  grants nothing at all.
- `add-hero-classes` 3.1-3.4: all 6 class/weapon mismatch combinations
  rejected, correct-class equips succeed, armor/boots confirmed
  unrestricted; swap-returns-old-item via `unequipHero`;
  `effectivePower` sums all 3 equipped slots correctly (incremental
  equip confirmed exact per-item deltas); all 6 new crafting recipes
  match design.md's cost table exactly; Boots' item-based cost (3
  plank, not a raw resource) genuinely enforced end-to-end.
- `add-th10-houses` 3.1-3.3: all 5 new houses' `requiresTownHall`
  gating confirmed at the exact boundary (isolated from any
  resource-affordability confound), exact unlock costs match
  design.md; Town Hall's level-10 cap confirmed exact; all 9
  `UPGRADE_COSTS` entries cross-checked; population math (10x15=150)
  computed directly; generic per-house logic confirmed to actually
  extend correctly to house_6-10.

Files modified: `js/heroes.js` (Heal Potion fix),
`openspec/changes/add-click-to-open-panels/tasks.md`,
`openspec/changes/add-dungeon-failure/tasks.md`,
`openspec/changes/add-hero-classes/tasks.md`,
`openspec/changes/add-th10-houses/tasks.md`, `memory.md`. No test
files added this session (all verification was scripted/throwaway or
jsdom, not committed) — Documentation & Testing's 4.x tasks across all
4 proposals still need real `test/*.test.js` coverage for the new
heal-potion/class/equipment/downed-state/th10 logic.

## Frontend Session: Click-to-Open-Panels + Hero-Classes/Dungeon-Failure + TH10-Houses (2026-07-29)
**Sequencing decision (explicitly asked for, not assumed):**
click-to-open-panels first since it's a foundational refactor of
every panel-update function (`updateBuildingPanel`,
`updateCraftingPanel`, `updateHeroPanel`, `updateDungeonPanel`) that
the other two changes would also touch — doing it first meant
hero-classes/dungeon-failure's panel work only had to happen once,
against the final function shape. Then hero-classes + dungeon-failure
together (both modify the hero roster panel). Then th10-houses last
(fully isolated, zero shared code with the other two).

**Operational incident, worth reading before doing similar multi-
phase work:** partway through Phase 2, a sandbox environment reset
silently wiped the entire local git checkout — all three phases were
committed locally (this environment has no GitHub push access, so
local commits were the only record) but nothing had been exported to
`/mnt/user-data/outputs/` yet. Caught this immediately via a routine
"does the directory still exist" check before continuing, rather than
discovering it only after trying to keep working in a directory that
no longer existed. Recovered by re-cloning fresh and reconstructing
all three phases from the exact diffs still visible in that same
conversation's own transcript (not re-derived from first principles —
the content was known, just needed re-applying), re-verifying each
phase identically (`node --check` + full test suite) as it was
rebuilt. **This time, exported each phase to outputs immediately
after committing it**, instead of planning to batch-export everything
at the end. One real mistake during recovery, caught and fixed rather
than left standing: a commit message claimed tasks.md had been
checked off when it actually hadn't (forgot the step, remembered it
only when re-verifying) — fixed in an honest follow-up commit rather
than an amended/rewritten one.

**Phase 1 — click-to-open-panels (tasks 2.1–2.6):**
`selectedBuildingId` replaces `nearest`/proximity as what drives panel
visibility. Exported `distanceToRect` from `interactions.js` (was
module-private) for the click handler's range check. Renamed every
panel function's parameter from `nearest` to `target` throughout —
keeping the old name post-refactor would have been actively
misleading. E-press now toggles panels too (same semantics as click),
except Farmer Joe/Town Hall which keep their old dialogue-only
behavior (explicit design.md non-goal) via a `DIALOGUE_ONLY_ON_E` set.
Before the reset, this phase was verified end-to-end with a temporary
headless-jsdom test (walked a real player via genuine `keydown`/
`keyup` events, clicked the real canvas via genuine `MouseEvent`s,
confirmed via DOM observation: click-opens, click-toggles-closed,
click-empty-ground-closes, E-press-on-Town-Hall-opens-dialogue-not-
panel, E-press-on-panel-building-toggles-panel,
walk-out-of-range-auto-closes — all 7 passed). After the reset, the
reconstructed code was re-verified via `node --check` + the full test
suite (identical pass) but the jsdom walk-test itself wasn't rerun a
second time, given it was already proven sound and the reconstruction
was a faithful line-for-line re-application, not new logic.

**Phase 2 — hero-classes (2.1–2.4) + dungeon-failure (2.1–2.3):**
Before the reset, this phase involved auditing substantial
uncommitted work that was mysteriously already sitting in that
checkout (from earlier in that same conversation, with no direct
memory of writing it — context had been trimmed). Rather than trust
it, audited the entire diff line-by-line using `git diff`/`git blame`.
Found and fixed:
- A leftover `console.error('DEBUG_TEMP...')` in the E-press handler
  that would have shipped to production.
- A genuine crash risk: `formatCostHTML` would throw on
  `RESOURCE_CONFIG[id]` being `undefined` for item-based costs
  (Boots' `plank` cost is a crafted inventory item, not a raw
  resource) — fixed with an `ITEM_CONFIG` fallback + resource-vs-
  inventory-aware affordability check mirroring `crafting.js`'s own
  `splitCost()` logic.
- Stale "Partial credit" wording in `interactionHandlers.js`'s
  Dungeon Gate E-press dialogue, left over from before
  `add-dungeon-failure`'s backend removed that mechanic entirely.
- The dungeon panel's idle-hero picker filtered only on
  `isHeroIdle`, not `isDowned` — a downed hero could appear in the
  "who can I send" list (even auto-selected as the default pick) with
  the Send button silently disabled and no visible reason why. Fixed:
  excluded from the picker entirely, with a distinct empty-state
  message ("Every idle hero is downed — heal at the Barracks first")
  when that's specifically why the list is empty.

Before the reset, verified end-to-end with a fresh headless-jsdom
smoke test: seeded a save with a downed hero + a healthy hero + a
sword + Heal Potion in inventory, walked to the Barracks via real
input events, confirmed downed-status display/styling, Heal button
enabling/clicking/clearing the downed state, equip flow raising
`effectivePower` by exactly the item's +8 power bonus (17→25), walked
to the Dungeon Gate and confirmed the reward preview renders the
correct tier reward/XP text. A planned check of the Workbench's
crafting-panel crash fix didn't reach its target within the jsdom
pathing budget — accepted as a graceful skip, backed by direct code
review instead. After the reset, the reconstruction was re-verified
via `node --check` + full test suite (same 161/161 pass) but the
jsdom walk-test wasn't rerun a second time, same reasoning as Phase 1.

**Phase 3 — th10-houses (2.1–2.3):** 5 new houses added to `map.js`
(house_6/7/8 mirror the existing house_1/3/5 column pattern shifted
3 columns west; house_9/10 placed east of the Town Hall cluster,
house_10 specifically shifted to col25 rather than col23 to clear a
decorative tree tile at `[16,23]` it would otherwise have overlapped).
Ran the actual automated collision/bounds test (`test/map.test.js`)
rather than eyeballing placement — 5/5 pass, both before and after
the reset (reconstruction was identical). Directly computed the
population-cap math (10 houses × 15 capacity via a throwaway Node
script, not just read-and-trust the "generic iteration" design claim)
— confirmed exactly 150, matching design.md, both times.

**Verification across all three phases:** `node --check` on every
touched file; full test suite after each phase (161/161 non-deferred
tests passing throughout, same 3 pre-existing/deliberately-deferred
failures as noted in prior sessions — 2 dungeon partial-credit tests
+ 1 crafting resource-reference test, all explicitly assigned to
Documentation & Testing, not reintroduced or worsened).

**Files touched:** `js/interactions.js`, `js/main.js`, `js/heroes.js`,
`js/interactionHandlers.js`, `js/map.js`, `index.html`, `styles.css`,
`openspec/changes/add-click-to-open-panels/tasks.md`,
`openspec/changes/add-hero-classes/tasks.md`,
`openspec/changes/add-dungeon-failure/tasks.md`,
`openspec/changes/add-th10-houses/tasks.md`, `memory.md`.

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
- **Dungeon failure = real risk, not partial credit (add-dungeon-failure,
  reversal of the original add-heroes-dungeons design).** The project
  originally gave a failed dungeon mission 50% of the full reward and
  50% XP specifically to avoid punishing failure outright. That was
  deliberately reversed: failure now grants nothing and downs the
  hero (0 HP, can't be sent again until healed). The soft-landing
  instinct wasn't abandoned, just moved — instead of discounting the
  loss, the game added an explicit recovery mechanic (paid Barracks
  heal + Heal Potion) as the actual safety net. Don't reintroduce
  partial-credit rewards without treating it as an equally deliberate
  design discussion, not a quick "make failure less harsh" patch.
- **Refined goods (Plank/Ingot/Brick/etc.) as hero materials: now IN
  SCOPE, reversing the earlier "out of scope, needs its own proposal"
  stance.** `add-hero-classes` resolved this by having Boots cost 3
  Plank alongside raw feathers — the first recipe with a mixed raw-
  resource + crafted-item cost. Nest Charm/Basket (purely decorative
  items) still have no defined use; only the industrial refined-goods
  question was resolved, not every crafted item's purpose.
- **jsdom as a test dependency: flagged as an open option, not
  decided either way.** `add-click-to-open-panels`' actual click-to-
  open DOM/canvas behavior has no persistent automated coverage —
  verified so far via a temporary, uncommitted jsdom install (deleted
  after use) plus direct code review, consistent with every other
  `main.js` UI behavior in this project. Adding jsdom as a real,
  committed dependency would change this project's stated zero-test-
  dependency philosophy (see README.md/docs/ARCHITECTURE.md) — that's
  a call worth making deliberately, not bundling into an unrelated
  docs/testing pass. Whoever picks this up next should make an
  explicit decision rather than silently adding or silently avoiding
  it.

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
- **2026-07-29 (Frontend — 3 changes: click-to-open-panels,
  hero-classes/dungeon-failure, th10-houses):** Sequencing (click-to-
  open-panels → hero-classes+dungeon-failure together → th10-houses)
  was explicitly requested, not decided unilaterally. Completed all
  three changes' Frontend sections; found and fixed a leftover debug
  statement, a real crash risk in `formatCostHTML` on item-based
  costs, stale "Partial credit" dialogue text, and a UX gap where
  downed heroes could be listed/auto-selected in the dungeon
  hero-picker with a silently-disabled Send button. **Mid-session, a
  sandbox reset wiped the local checkout** (no push access, so local
  commits were the only record) — caught it immediately, reconstructed
  all 3 phases from the exact diffs still visible in this same
  conversation's transcript, re-verified identically, and exported
  each phase to outputs immediately after committing it this time
  (see the detailed section above and the new Active Tasks item about
  this risk for future sessions). One recovery mistake (a commit
  message claiming tasks.md was checked off when it hadn't been) was
  caught on re-verification and fixed in an honest follow-up commit.
  Verified via node --check, full test suite after each phase
  (161/161 non-deferred passing throughout), and headless-jsdom smoke
  tests using real simulated input events + DOM observation (all
  deleted after use, run before the reset). Checked off Frontend
  sections in all 3 tasks.md files. Not pushed — no git credentials
  in this environment.
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
- **2026-07-21 (Documentation & Testing — Heroes + Dungeons)**: Fresh
  clone (explicit instruction this session to always clone/read live
  state, not reuse any local copy — noting this out loud since it
  directly addresses a stale-folder issue from an earlier session;
  worth repeating until it's clearly not a recurring problem).
  Confirmed via `openspec/changes/add-heroes-dungeons/tasks.md` that
  Backend/Frontend/Code Reviewer sections were all checked off and
  only Documentation & Testing (4.1–4.5) remained. Found
  `heroes.test.js`/`dungeons.test.js` sitting in `js/` instead of
  `test/` — they ran fine (Node's default `node --test` discovery
  isn't limited to `test/`, it globs `*.test.js` project-wide) but
  violated this project's own stated convention and would have looked
  like an oversight to any future session trusting the README's
  description of `test/`. Moved both with `git mv` (preserves
  history), reran the full suite from the new location to confirm
  (163/163 at that point). Read both test files in full before
  touching anything else — they're already thorough (weighted-roll
  distribution checks, exact rarity-boundary mocking via
  `Math.random`, the busy/idle boundary regression case, partial-
  credit reward/XP flooring, batch resolution) — so 4.1 needed
  relocation, not rewriting. Noticed `gameState.test.js` had zero
  coverage of hero roster persistence (create/round-trip/corrupted-
  data-guard/busy-hero-survives-reload) and added it, since save/load
  correctness for every new state shape is this project's established
  bar. Wrote `openspec/specs/hero-system/spec.md` and
  `openspec/specs/dungeon-system/spec.md` (4.2) by reading the actual
  shipped `heroes.js`/`dungeons.js`/`main.js` source directly — not
  copied from the original `proposal.md`/`design.md`, per this
  project's standing "specs describe what's real" convention (caught
  one place where shipped code deliberately deviated from the design
  doc: `dungeonTier` was added to the hero object as a pragmatic
  choice not listed in design.md's original persistence section —
  documented the deviation and why, not silently reconciled it).
  Updated `world-map` spec's building count (13→15, verified by
  actually counting `map.js`'s `interactables` array rather than
  trusting arithmetic) and added Barracks/Dungeon Gate placement
  reasoning (4.3). Deleted `openspec/changes/add-heroes-dungeons/`
  (4.4) — confirmed this matches the project's already-active
  convention, since every other previously-merged `changes/` folder
  was already gone before this session touched anything. Also updated
  `README.md`'s and `docs/ARCHITECTURE.md`'s module lists/lookup
  tables to include `heroes.js`/`dungeons.js`, since both docs
  explicitly enumerate every `js/` file and would otherwise have gone
  stale the moment this session ended. Corrected a stale flag while
  here: the prior Backend session's note that
  `chicken-saga-village-doctest-session.patch` was "still on
  `origin/main`" turned out to be outdated — verified via this
  session's fresh clone that the file is actually gone (applied
  sometime between that flag being written and this session
  starting); removed the stale re-flag from Active Tasks rather than
  perpetuating it a third time. **Deliberately did not touch** the
  `applyUpkeep()`/`requestAnimationFrame`-vs-`Date.now()` clock-
  mismatch bug flagged by the prior Backend session — out of scope
  for a Documentation & Testing pass on the Heroes/Dungeons ticket,
  and the prior session's own reasoning (a balance-affecting fix
  shouldn't be a drive-by change bundled into an unrelated task) still
  holds; carried the flag forward as-is in Active Tasks. Verification:
  `node --check` on every `js/*.js` file, full suite 165/165 passing
  (was 163 before this session's added `gameState.test.js` coverage).
  Docs-only + test-relocation + one new test file's worth of code
  touched — no gameplay logic changed. No push credentials in this
  sandbox (same as every prior session); packaged as a patch + zip for
  manual application, per established handoff process. Files added:
  `openspec/specs/hero-system/spec.md`,
  `openspec/specs/dungeon-system/spec.md`. Files modified:
  `README.md`, `docs/ARCHITECTURE.md`,
  `openspec/specs/world-map/spec.md`, `test/gameState.test.js`,
  `memory.md`. Files moved: `js/heroes.test.js` → `test/heroes.test.js`,
  `js/dungeons.test.js` → `test/dungeons.test.js`. Files/folders
  deleted: `openspec/changes/add-heroes-dungeons/` (all 3 files).
  **Next recommended task:** the `applyUpkeep()` clock-mismatch bug
  (Active Tasks #1) is the most concrete/actionable open item — small,
  well-understood, just deliberately out of scope for every session
  that's found it so far. Otherwise: real in-browser playtest of
  Heroes + Dungeons (Active Task #2), still nobody's actually clicked
  through it live.
- **2026-07-22 (Backend Engineer — TH10/10-Houses, tasks 1.1-1.4)**:
  Fresh clone confirmed live state (repeating this every session per
  standing instruction, not because it's shown signs of being
  necessary again yet). Four proposals now pending in
  `openspec/changes/`; user chose implementation order
  th10-houses → dungeon-failure → hero-classes specifically to avoid
  add-hero-classes and add-dungeon-failure both editing
  `heroes.js`/`dungeons.js` blind in the same pass — this session
  only did th10-houses, self-contained, no overlap.
  Implemented 1.1-1.3 per design.md exactly: `townHall.js`
  (`MAX_TOWN_HALL_LEVEL` 5→10, `UPGRADE_COSTS` extended to key 9);
  `buildingLevels.js` (`HOUSE_IDS` extended to house_10); 
  `buildingUnlocks.js` (`UNLOCK_CONFIG` house_6-10 entries).
  **Task 1.4 ("verify, don't assume downstream code needs zero
  changes") caught two real gaps design.md's claim missed:**
  1. `BASE_UPGRADE_COST` in `buildingLevels.js` is keyed by
     buildingId directly, not derived from `HOUSE_IDS` — house_6-10
     had no entries, so `getUpgradeCost('house_6', ...)` would have
     thrown (`Object.entries(undefined)`) the first time a player
     tried to upgrade any new house. Fixed by adding house_6-10 with
     the same `{egg:15, feathers:10}` cost every existing house uses
     (all houses have always shared one cost regardless of number,
     consistent with the universal capacity formula).
  2. `HOUSE_DISPLAY_NAME` in `interactionHandlers.js` (feeds the
     panel title in `makeHouseHandler`) also stopped at house_5 — new
     houses would have shown a literal `"undefined (Lvl 1)"` panel
     title. Fixed with the obvious `'House 6'`..`'House 10'` entries.
  Confirmed via grep that every other `HOUSE_IDS` consumer (worker
  cap sum in `main.js`/`workers.js`, house-migration logic in
  `gameState.js`, `isHouse()`) is genuinely generic and needed no
  changes — the design doc's claim held for those, just not the two
  above.
  **Verification:** `node --check` on all 4 touched files; full suite
  still 165/165 (no test files touched — that's Documentation &
  Testing's task 4.3). Functional simulation (thrown away after use):
  confirmed Town Hall upgrades cleanly from 1→10 and refuses to go
  past 10; confirmed every house_6-10 has working unlock config,
  upgrade cost (no throw), and a panel handler with a real title (not
  "undefined"); confirmed per-house capacity formula is unchanged
  (3→15 per house, independent of house count) and total max
  population across all 10 maxed houses is exactly 150 as design.md
  specifies.
  **Not done (out of scope for Backend Engineer):** map.js placement
  + collision verification, HUD population display (Frontend Engineer
  2.1-2.3); house_6 TH-gate/level-10-hard-cap verification, standard
  syntax/import/test verification sign-off (Code Reviewer 3.1-3.3);
  spec updates, world-map building count, new tests, memory.md
  Completed Tasks entry (Documentation & Testing 4.1-4.4 — this
  session's memory.md entry is my own backend log, not that task).
  Files modified: `js/townHall.js`, `js/buildingLevels.js`,
  `js/buildingUnlocks.js`, `js/interactionHandlers.js`.
  **Next backend task:** per the requested order, add-dungeon-failure
  next (currentHp/heal/isDowned in heroes.js, resolveDungeon()
  rewrite in dungeons.js), then add-hero-classes last — deliberately
  sequenced that way since both touch heroes.js/dungeons.js and
  hero-classes' effectivePower() equipment-bonus work should land
  after dungeon-failure's HP-related hero-object changes are settled,
  not interleaved.
- **2026-07-22 (Backend Engineer — Dungeon Failure, tasks 1.1-1.5)**:
  Second of the three-proposal sequence (th10-houses done above;
  hero-classes still last, deliberately, so its effectivePower()/
  equipment work lands on top of these settled HP fields rather than
  interleaved). Implemented all 5 tasks in
  `openspec/changes/add-dungeon-failure/tasks.md` against design.md:
  - `heroes.js`: `currentHp` added to hero creation (inits to
    rarity's max HP via existing `RARITY_BY_ID` lookup); new
    `getMaxHp(hero)`, `isDowned(hero)`
    (`currentHp <= 0`), `getHealCost(hero)` (rarity-scaled:
    `HEAL_COST_BASE` × `HEAL_COST_RARITY_MULTIPLIER` 1/2/4 for
    common/rare/epic), `canHealHero`, `healHero` (spend + restore to
    max HP, no-ops safely on a non-downed hero).
  - `dungeons.js`: `canSendHeroToDungeon` now also rejects a downed
    hero (checked separately from `isHeroIdle` — a hero can be idle
    AND downed at once, two different reasons Send is disabled).
    `resolveDungeon()`'s failure branch rewritten exactly per
    design.md: sets `currentHp = 0`, returns `{success:false,
    reward:{}, xp:0}` — the old 50%-reward/50%-XP partial-credit
    branch and its `floorRewardHalf()` helper are gone entirely, not
    just unreachable dead code. Success path untouched (verified,
    not just assumed — see below).
  - `interactionHandlers.js`: Barracks `interact()` now surfaces a
    downed-hero count in its panel text (same convention as Dungeon
    Gate surfacing idle/busy counts). Added a `heal(gameState,
    heroId)` action method on the barracks handler object per task
    1.5's literal instruction. **Flagging a structural note for
    review:** every other handler in this file only ever exposes
    `interact()` — actual state-mutating actions (recruit, upgrade,
    craft) are wired directly in `main.js` importing the underlying
    module function, not routed through this file. Adding
    `barracks.heal()` here is a deliberate one-off to satisfy task
    1.5 as literally stated, not a new file-wide convention; the
    actual reusable logic still lives in `heroes.js`
    (`healHero`/`getHealCost`/`canHealHero`) so Frontend Engineer can
    import those directly instead if that fits the button-wiring
    pattern better — flagging so nobody assumes every handler should
    now grow action methods.
  Dungeon Panel Reward Preview (design.md's other UI item) needed no
  backend work — `DUNGEON_TIERS.fullReward`/`fullXp` already existed;
  design.md itself says so explicitly.
  **Verification:** `node --check` on all 3 touched files. Full suite:
  163/165 (2 failures are the old `resolveDungeon math` partial-credit
  tests in `dungeons.test.js` — *expected* fallout from removing that
  branch per design.md, not a regression; updating/removing those
  tests is Documentation & Testing's task 4.2, deliberately left
  untouched here). Functional simulation (thrown away after use)
  covered: HP inits to rarity max on recruit; forced guaranteed
  failure (common hero vs Hard) gives exactly zero reward/XP and sets
  currentHp to 0; downed hero blocked from Send even while idle and
  fully funded; heal cost multiplier verified exactly 1x/4x for
  common/epic; heal restores HP, unblocks Send, and correctly
  no-ops (no resource spend) on an already-healthy hero; Barracks
  panel text and `.heal()` action both verified via `HANDLERS`
  directly; forced guaranteed success (epic vs Easy) confirmed
  completely unchanged — full reward, full XP, hero not downed.
  **Not done (out of scope for Backend Engineer):** roster UI
  (greyed-out downed styling), heal button, reward-preview UI,
  downed/HP display (Frontend Engineer 2.x); updating/removing the 2
  now-stale partial-credit tests, new heal/downed tests, spec updates
  (Documentation & Testing 4.x); resolution-math/heal-cost sign-off
  (Code Reviewer 3.x).
  Files modified: `js/heroes.js`, `js/dungeons.js`,
  `js/interactionHandlers.js`.
  **Next backend task:** add-hero-classes (last in the requested
  order) — class/equipment fields on heroes, `EQUIPMENT_POWER` folded
  into `effectivePower()`, equip/unequip functions, 5 new crafting
  recipes. Should build on top of the `currentHp`/`isDowned` fields
  added this session without disturbing them.
- **2026-07-22 (Backend Engineer — Hero Classes + Equipment, tasks
  1.1-1.5)**: Third and last of the three-proposal sequence.
  Implemented all 5 tasks in
  `openspec/changes/add-hero-classes/tasks.md` against design.md:
  - `heroes.js`: `HERO_CLASSES`/`HERO_CLASS_IDS`, random `class`
    assignment at recruit (uniform, unlike rarity's weighting, per
    design.md); `equipment: {weapon:null, armor:null, boots:null}`
    added to hero creation; `EQUIPMENT_ITEMS` (slot + classRestriction
    + power per item) as the source of truth, with `EQUIPMENT_POWER`
    exported as a derived flat map so it matches design.md's
    `effectivePower()` snippet by name exactly; `effectivePower()`
    updated to add the flat sum of equipped items' power on top of
    the existing level-scaled base (equipment doesn't scale with
    level); `canEquipItem`/`equipHero`/`unequipHero` — validates item
    exists, hero has it in inventory, and class restriction (weapon
    slots only) before allowing equip; swap returns the previously
    equipped item to inventory rather than destroying it; unequip
    also returns to inventory and no-ops safely on an empty slot.
  **Found and fixed a real structural gap (not just missing config)
  before it could ship broken:** design.md's Boots recipe cost is
  `{plank: 3, feathers: 5}` — but `plank` is a *crafted inventory
  item* (from crafting.js's own `plank` recipe), not a raw resource
  in `resources.js`'s `RESOURCE_CONFIG`. `crafting.js`'s
  `canAfford`/`spendResources` (imported from resources.js) only ever
  check/spend `resourceState.carried`, which has no concept of
  `plank`. Added literally as originally structured, Boots would have
  been **permanently uncraftable** (`resourceState.carried.plank` is
  always `undefined`) — directly defeating this whole change's
  stated goal ("give refined goods a purpose"). Fixed by extending
  `crafting.js` itself: `splitCost()` routes each cost-dict key to
  either the raw-resource pool or the inventory-item pool (a key is a
  raw resource iff it's in `RESOURCE_IDS`), and
  `canAffordRecipe()`/`craftSpecific()`/`getCraftableRecipes()` check
  and spend from both pools together. Every existing resource-only
  recipe is completely unaffected (empty item-cost pool is always
  vacuously affordable). `getCraftableRecipes()`'s signature changed
  to take `inventoryState` as well — required a matching one-line
  call-site update in `main.js` (line ~545), which is nominally
  Frontend Engineer's file; made it anyway since without it the call
  would throw for every recipe, not just Boots (same precedent as
  the earlier `getUpgradeCost` call-site updates).
  **Also caught and fixed a persistence gap:** heroes recruited
  before `currentHp` (add-dungeon-failure) or `class`/`equipment`
  (this change) existed would load from a legacy save missing those
  fields entirely — `gameState.js`'s heroes merge takes the saved
  roster array wholesale with no per-hero shape check. Added a
  per-hero backfill loop in `loadGameState()` (same file/style as the
  existing `migrateOldResourceShape` and grain→rice migrations):
  missing `currentHp` → full HP for rarity (not 0 — no recorded HP
  means it predates HP existing, not that the hero was downed);
  missing `class` → assigned randomly, same as at recruitment;
  missing `equipment` → empty slots.
  **Verification:** `node --check` on all 4 touched files. Full
  suite: 162/165 (3 failures — the pre-existing 2 partial-credit
  tests from last session, plus 1 new: `crafting.test.js`'s "every
  recipe cost only references known resources" now correctly fails
  because Boots' `plank` cost is intentionally not a raw resource;
  *expected* fallout from implementing design.md as specified, not a
  regression — updating it is Documentation & Testing's task 4.1).
  Functional simulation (thrown away after use) covered: 200 recruits
  all get a valid class from all 3 classes and start with empty
  equipment; Boots genuinely uncraftable with 0 plank even given
  unlimited raw resources, becomes craftable after crafting exactly 3
  plank, and consumes the plank + feathers correctly on craft; all 6
  new recipes match design.md's costs exactly; all 3 class/weapon
  mismatches rejected (not just one, per Code Reviewer's task 3.1
  concern) while same-class equip succeeds; multi-slot power
  summation verified exact (sword+armor+boots all stack); swap
  returns the old item to inventory, not destroyed; unequip returns
  the item and safely no-ops on an already-empty slot. Separately
  simulated `loadGameState()` against a hand-built legacy save object
  missing currentHp/class/equipment — backfill confirmed correct
  (valid HP, not downed, valid class, empty equipment) rather than
  crashing or leaving fields `undefined`.
  **Not done (out of scope for Backend Engineer):** roster panel
  class/equipment display, equip-slot picker UI, Workbench recipe
  rows for the new items, Heal Potion consumable-use UI (Frontend
  Engineer 2.1-2.4 — note Heal Potion's *application* logic, i.e. an
  actual "restore 25% max HP to a chosen hero" function, isn't listed
  under either role in tasks.md; flagging this now rather than
  inventing scope — `getMaxHp(hero)` is already exported and the
  formula is trivial, `Math.min(getMaxHp(hero), hero.currentHp +
  Math.ceil(getMaxHp(hero) * 0.25))`, but nobody's been assigned to
  write it as a real function yet); class-mismatch/swap/multi-slot
  sign-off, standard verification (Code Reviewer 3.1-3.4); new
  heroes.js test cases, spec updates for hero-system and
  crafting-system (resolving the "refined goods have no use" open
  question explicitly), memory.md Completed Tasks entry (Documentation
  & Testing 4.1-4.3 — again, this entry is my own backend log, not
  that deliverable).
  Files modified: `js/heroes.js`, `js/crafting.js`, `js/gameState.js`,
  `js/main.js`.
  **Next backend task:** none queued — all three proposals in the
  requested implementation order (th10-houses → dungeon-failure →
  hero-classes) are now backend-complete. add-click-to-open-panels
  is the 4th pending proposal but its tasks.md explicitly has no
  proactive Backend Engineer work ("pick up only if a data-layer gap
  surfaces" during Frontend's UI work) — nothing to do there yet.
- **2026-07-22 (Backend Engineer — Click-to-Open Panels check-in)**:
  Read proposal.md/design.md/tasks.md in full per task 1.1's own
  instruction ("confirm with Frontend once their work lands; pick up
  only if a data-layer gap surfaces"). This change is purely
  `main.js` input/rendering: canvas click listener + world-coordinate
  hit-testing, a `selectedBuildingId` state variable, and switching
  every panel-update function's trigger condition from `nearest` to
  `selectedBuildingId`. It reuses the existing data-layer read paths
  (`HANDLERS[id].interact(gameState)` from `interactionHandlers.js`,
  `getHouseCapacity`, `canSendHeroToDungeon`, etc.) completely
  unchanged — switching *when* a panel queries that data doesn't
  change *what* it needs. No code changes made. Frontend Engineer's
  tasks 2.1-2.6 haven't landed yet in this repo, so there's nothing
  to check for a surfaced gap against yet — will revisit once that
  work exists rather than speculating now.
  **Next backend task:** none queued. All three prioritized
  proposals (th10-houses, dungeon-failure, hero-classes) are backend-
  complete; add-click-to-open-panels needs no backend action until
  Frontend's work lands and reveals (or doesn't) a gap. Also still
  outstanding from 2026-07-21: the stray
  `chicken-saga-village-doctest-session.patch` file at the repo root
  was logged as removed once already but that removal never actually
  reached `origin/main` — still there as of this session, still
  unaddressed.
- **2026-07-31 (Documentation & Testing — All 4 proposals)**: Fresh
  clone (explicit instruction, repeated again this session, to always
  clone/read live state rather than reuse a local copy — the exact
  practice that would have caught the stale-`add-heroes-dungeons`-
  reappearing issue sooner; still worth saying every time). Re-
  verified the stale-patch-file flag from the note directly above this
  entry: it's actually gone, confirmed via this fresh clone, same as
  a session 10 days earlier already found — the flag itself just never
  got cleared. Didn't re-flag it a third time.

  Found 5 `openspec/changes/` folders, all with unchecked Documentation
  & Testing sections: `add-click-to-open-panels`, `add-dungeon-failure`,
  `add-hero-classes`, `add-th10-houses`, plus a duplicate, already-
  fully-archived `add-heroes-dungeons` (confirmed its specs/tests were
  already live — `openspec/specs/hero-system|dungeon-system` existed
  and were current, `test/heroes.test.js`/`test/dungeons.test.js` were
  correctly in `test/` — so this was the exact stale-reupload pattern
  memory.md's Decisions section already documented; deleted it again
  with no new work needed).

  **Fixed 2 pre-existing infra bugs while getting the suite running:**
  `package.json`'s `"test": "node --test test/"` fails with
  `MODULE_NOT_FOUND` on the Node version in this environment (`node
  --test` treats `test/` as a module specifier rather than globbing
  it) — changed to bare `node --test`, verified it correctly
  auto-discovers everything. Suite started this session at 165 tests,
  162 passing, 3 failing (exactly matching what `add-dungeon-failure`
  and `add-hero-classes`'s tasks.md files had already flagged: 2
  dungeon partial-credit tests asserting removed behavior, 1 crafting
  test asserting every recipe cost is a raw resource, which Boots'
  `plank` cost broke).

  **Fixed all 3 failing tests** (not skipped): `crafting.test.js`
  rewritten — the resource-only assumption replaced with a check that
  every cost key is either a raw resource or a known recipe id, plus
  new coverage for the mixed-cost mechanic (`canAffordRecipe`/
  `craftSpecific` consuming inventory-item costs, not just resources)
  and all 6 new recipes pinned against design.md. `dungeons.test.js`'s
  2 partial-credit tests replaced with tests for the actual shipped
  failure behavior (empty reward, 0 XP, hero downed to 0 HP, success
  leaves HP untouched, a downed hero can't be sent even if otherwise
  idle) — written as explicit regression tests against the *removed*
  behavior, with inline comments explaining why the old tests'
  assertions are gone rather than just deleting them silently.

  **Massively extended `heroes.test.js`** (13 tests → 48): class
  assignment (confirmed uniform-random via mocked `Math.random`, not
  weighted like rarity — a real distinction worth testing explicitly
  since it's easy to assume everything random in this codebase reuses
  `pickWeighted()`), equipment (all 6 class/weapon mismatches rejected,
  all 3 matches allowed, armor/boots universal, swap-returns-to-
  inventory rather than destroying the old item, power bonuses sum
  across all 3 slots not just the last-equipped one), downed state
  (`isDowned` boundary), rarity-scaled paid healing, and the Heal
  Potion — including a regression test for the exact bug the Code
  Reviewer session already found and fixed (25% additive restore, not
  a full heal), plus a test documenting the potion-can-revive-a-
  downed-hero behavior as *intentional* (per design.md's own Risks
  section) rather than leaving it un-asserted and ambiguous for the
  next person to wonder about.

  Added targeted data-pinning tests (not just relying on generic
  iteration, which already passed) for `add-th10-houses`:
  `MAX_TOWN_HALL_LEVEL === 10`, `UPGRADE_COSTS[7..9]` exact values,
  `house_6..10`'s exact unlock gates/costs from `buildingUnlocks.js`,
  confirmation the new houses reuse the existing per-house formulas
  with zero special-casing, and the total population cap math (10 ×
  15 = 150). Added a direct unit test for `distanceToRect()` (now its
  own exported function, shared between `findNearestInteractable` and
  `add-click-to-open-panels`' click handler) since it's public API now,
  not just an internal implementation detail.

  Suite finished at **213/213 passing** (up from 165/162 at session
  start).

  **Specs (all 4+1 proposals merged into `openspec/specs/`, all
  `openspec/changes/` folders deleted per the standard archive step):**
  `hero-system/spec.md` — added Class and Equipment/Healing sections,
  updated the data model and leveling formula, reversed the old
  "refined goods out of scope" constraint. `dungeon-system/spec.md` —
  rewrote Resolution to describe the actual failure behavior (no more
  partial credit) with the reversal's rationale, updated Sending to
  account for the downed-hero exclusion. `crafting-system/spec.md` —
  resolved the "refined goods have no defined use" open question
  (partially — industrial refined goods now do, purely-decorative
  items like Nest Charm/Basket still don't, called out as a distinct
  remaining question so the two don't get conflated later), documented
  the new mixed raw-resource/crafted-item cost mechanic. Also caught
  and fixed a wrong cross-reference while rewriting this spec's
  neighbor (`town-hall-progression/spec.md` pointed to
  "quest-board spec's crafting tie-in" for the popularity mechanic,
  which actually lives in crafting-system — fixed).
  `town-hall-progression/spec.md` — 5→10 levels, full cost table
  through level 9→10. `building-progression/spec.md` — houses extend
  to `house_10`, population cap 75→150, corrected a claim that panels
  are proximity-triggered (they're click/selection-driven now, per
  `add-click-to-open-panels` — this spec hadn't been updated for that
  yet). `world-map/spec.md` — building count 15→20, documented
  `house_6-10`'s spread-outward placement (the central cluster ran out
  of room by house 5). Wrote the most substantial update to
  `interaction-system/spec.md` — the two-input-path click-to-open
  design (click and E-press both toggle the same `selectedBuildingId`
  via the same `distanceToRect()` range check), the walk-away auto-
  clear behavior, the `DIALOGUE_ONLY_ON_E` exception list, and an
  explicit "test coverage gap" section stating plainly that this UI
  behavior isn't automated-tested and why, rather than letting the
  gap go unmentioned.

  **Deliberately did not add jsdom as a dependency** to close that
  coverage gap — flagged it in memory.md's Active Tasks/Decisions as
  an open question instead of deciding unilaterally, since it would
  change this project's stated zero-test-dependency philosophy and
  that felt like a call worth surfacing explicitly rather than
  bundling into a docs/testing pass. What COULD be tested without a
  DOM (the shared `distanceToRect()` range-check function) now is.

  Verification: `node --check` on every `js/*.js` file, full suite
  213/213 passing, confirmed at multiple checkpoints throughout (not
  just once at the end) as tests were added file-by-file. No push
  credentials in this sandbox (same as every prior session); packaged
  as a patch + zip for manual application. Files added: none (all
  work was edits + one new duplicate-folder deletion, no wholly new
  spec files this time — hero-system/dungeon-system already existed
  from an earlier session). Files modified: `package.json`,
  `test/crafting.test.js`, `test/dungeons.test.js`,
  `test/heroes.test.js`, `test/buildingUnlocks.test.js`,
  `test/buildingLevels.test.js`, `test/townHall.test.js`,
  `test/interactions.test.js`, `openspec/specs/hero-system/spec.md`,
  `openspec/specs/dungeon-system/spec.md`,
  `openspec/specs/crafting-system/spec.md`,
  `openspec/specs/town-hall-progression/spec.md`,
  `openspec/specs/building-progression/spec.md`,
  `openspec/specs/world-map/spec.md`,
  `openspec/specs/interaction-system/spec.md`, `memory.md`. Folders
  deleted: `openspec/changes/add-click-to-open-panels/`,
  `openspec/changes/add-dungeon-failure/`,
  `openspec/changes/add-hero-classes/`,
  `openspec/changes/add-heroes-dungeons/` (stale duplicate),
  `openspec/changes/add-th10-houses/`.
  **Next recommended task:** the `applyUpkeep()` clock-mismatch bug is
  still the most concrete/actionable open item, flagged by multiple
  sessions now without anyone picking it up. Otherwise: an actual
  human playtest of everything shipped across these 4 proposals, and a
  decision on the jsdom question.
