# Chicken Saga Village — Project Memory

_Last updated: 2026-07-18_

## Current Objective
Build "Chicken Village" — a free, Pixiland-genre-inspired (not
IP-copied) village builder web game for the Chicken Saga brand.
Explicitly a fan/passion project: no real monetization, no NFTs, no
tokens, pending legal review. Vanilla JS + HTML5 Canvas, no framework,
localStorage only (no backend/accounts yet).

## Current Status
Test suite (124 tests), README, architecture doc, and CI workflow are
all in place as of the 2026-07-17/18 sessions. This session archived
the previously-unrecorded Lucky Wheel/crafting/layout/unlock-button
bug-fix batch (shipped 2026-07-16, never got an OpenSpec proposal)
into `openspec/specs/` — `building-progression`, `lucky-wheel`, and
`world-map` specs now describe the actual current, fixed behavior
with root causes noted, not the earlier buggy versions. No code
changes this session (docs-only).

## Active Tasks
1. **Playtest the fixes**, especially the Lucky Wheel (both bugs were
   root-caused and fixed via code reasoning, not visual testing —
   worth confirming they look right in an actual browser). Still open
   — nothing in this session touched the Lucky Wheel visuals, and
   `main.js`/`render.js` are explicitly NOT covered by the new
   automated test suite (DOM/Canvas glue — see Testing section below).
2. ~~Archive prior sessions' changes into `openspec/`~~ — **done this
   session**, see "OpenSpec Archival" below.
3. Decide egg-upkeep consequences (still a no-op at 0 egg) — unchanged.
4. Real art integration (still 100% placeholder) — unchanged.
5. Give refined goods a purpose (Chicken Feed/Plank/Brick/Ingot still
   just sit in inventory) — unchanged.

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
