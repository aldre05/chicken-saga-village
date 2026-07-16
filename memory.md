# Chicken Saga Village — Project Memory

_Last updated: 2026-07-15_

## Current Objective
Build "Chicken Village" — a free, Pixiland-genre-inspired (not
IP-copied) village builder web game for the Chicken Saga brand.
Explicitly a fan/passion project: no real monetization, no NFTs, no
tokens, pending legal review. Vanilla JS + HTML5 Canvas, no framework,
localStorage only (no backend/accounts yet).

## Current Status
Repo was confirmed in sync with the codebase last session (full diff,
zero differences). This session was a bug-fix + rebalance pass on top
of that — not yet re-verified against the repo, since the fixed code
hasn't been uploaded yet. **Upload the latest zip before starting any
new session.**

## Active Tasks
1. **Upload this session's fixes to the repo** (see Session Log) —
   nothing pushed yet, only delivered as a zip.
2. **Playtest the fixes**, especially the Lucky Wheel (both bugs were
   root-caused and fixed via code reasoning, not visual testing —
   worth confirming they look right in an actual browser).
3. Archive this session's changes into `openspec/` (no proposal was
   drafted for this batch — it was a rapid bug-fix pass in response
   to direct playtesting feedback, not a planned feature. Worth a
   short retroactive change note at minimum.)

## Completed (chronological, high-level)
See prior entries for the full build history (village MVP → resource
economy → quest board/Lucky Wheel/crafting → industrial resources).
This session added:

1. **Root-caused and fixed two real Lucky Wheel bugs**, not just
   symptom patches:
   - Segment dividers were invisible — a previous fix tried thin
     (1.5°) divider bands baked into the conic-gradient, which
     apparently render inconsistently (likely anti-aliased away).
     Replaced with actual DOM line elements, one per segment
     boundary, which don't have that failure mode.
   - Reward mismatch ("I see egg, but it says I won something else")
     — the actual bug was a coordinate-math error in label placement:
     `translate(radius, -12px)` positions a point near 3-o'clock
     *before* rotation, not 12-o'clock, so every label was rotated
     into roughly the wrong wedge relative to the color segment
     underneath it. The wheel's landing animation was always correct;
     only the visible label was wrong. Fixed the translate axes.
2. **Found and fixed a real layout bug behind "crafting doesn't
   work"**: the crafting panel and the "Press E to interact" prompt
   were positioned at identical screen coordinates, directly
   overlapping. Not a logic bug — verified crafting's underlying
   functions were correct via simulation both before and after.
3. **Upgrade costs redesigned**: now require every resource type
   currently unlocked at the player's Town Hall level (not a gradual
   "one more every 5 levels" rotation, which could mean a level-40
   building still ignored resources unlocked ages ago).
4. **House capacity increased 50%** (max 10→15/house, new formula
   3/6/9/12/15 across 5 levels) to keep pace with the resource-
   building count going from 4→6 after Quarry/Mine were added.
5. **Map layout tightened and reorganized**: resource cluster packed
   into a denser 3×2 grid, Workbench moved next to Town Hall, houses
   moved from a separate far corner to cluster right next to Town
   Hall too. Collision-verified, zero overlaps.
6. **Unlocking is now a deliberate button-click, not auto-on-E** —
   matching the same pattern already used for upgrades. A persistent
   panel now shows unlock requirements (Town Hall level + cost, with
   insufficient resources shown in red) whenever standing near any
   locked building/house, with a dedicated Unlock button. E-press on
   a locked building now shows info only.

## Next Recommended Task
Same candidates as last session, still valid (none of this session's
work was new-feature work, it was fixes + rebalance):
1. Upload this session's fixes to the repo (blocking — see Active Tasks)
2. Playtest for balance, especially: Lucky Wheel visuals, the new
   "all TH-unlocked resources" upgrade cost (may be steeper than
   intended now — worth checking it doesn't make early upgrades feel
   punishing), house capacity pacing
3. Decide egg-upkeep consequences (still a no-op at 0 egg)
4. Real art integration (still 100% placeholder)
5. Give refined goods a purpose (Chicken Feed/Plank/Brick/Ingot still
   just sit in inventory)
6. Hero/dungeon system (non-NFT version) — still just discussed, not
   proposed

## Decisions
(Carried over from prior session, still all in force — no changes
this session.)
- NFT/land ownership/revenue-share/monetization stays deferred
  pending legal review, full stop.
- Kenney.nl (CC0) is the recommended path for real art, not yet
  integrated.
- Resource role split: Egg = worker upkeep. Feathers = reserved for
  future hero system. Rice/Wood/Stone/Ore = industrial raw→refined
  lane.
- Workflow: developer uploads via GitHub web UI, not git CLI.
- Verification standard: every change gets a per-file syntax check,
  a full import-graph trace, and functional simulation tests before
  being called done — this session is a direct example of why: two
  real bugs (wheel label math, panel overlap) were found by reasoning
  through the actual code/CSS, not by assuming a prior fix worked.

## New Decision This Session
- **When a bug report says a previous fix "still" isn't working,
  re-derive the fix from scratch rather than re-applying the same
  patch.** Both wheel bugs this session were previously "fixed" in
  an earlier session but the fixes were incomplete/wrong in ways that
  weren't caught without a real browser to test in. Default to
  suspecting the earlier fix's own correctness, not just staleness of
  the build the developer is testing.

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

## Session Log
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
