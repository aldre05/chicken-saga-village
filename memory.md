# Chicken Saga Village — Project Memory

_Last updated: 2026-07-12_

## Current Objective
Build "Chicken Village" — a free, Pixiland-genre-inspired (not
IP-copied) village builder web game for the Chicken Saga brand.
Explicitly a fan/passion project: no real monetization, no NFTs, no
tokens, pending legal review. Vanilla JS + HTML5 Canvas, no framework,
localStorage only (no backend/accounts yet).

## Current Status
**Repo is in sync with the actual codebase** (verified by cloning the
repo and diffing every file against the latest local build — zero
differences). An earlier session flagged the repo as missing all
code; that's been resolved. OpenSpec is also caught up: every
implemented change has been archived into `openspec/specs/`, and all
fully-shipped change folders under `openspec/changes/` have been
removed. `openspec/changes/` is currently empty — no proposal is
mid-flight.

## Active Tasks
None blocking. Project is between features — see Next Recommended
Task for candidates.

## Completed (chronological, high-level)
1. **Village MVP** — tile-based world, WASD movement, collision,
   camera, interaction/dialogue system. Art is placeholder (flat
   colored rectangles + hand-drawn pixel sprite for the player
   character) — Kenney.nl CC0 tileset recommended for real art,
   never integrated.
2. **Resource economy build-out** — started at 1 resource (egg) with
   a linear quest chain, grew to: 6 resources total (Egg, Feathers,
   Wood, Rice [renamed from Grain], Stone, Ore), Town Hall progression
   (5 levels), building unlock system (walk up + pay cost, TH-gated),
   unlimited building leveling (tiered rate scaling, steep separate
   cap scaling, +4 worker slots/level up to 50 max), 5 independently-
   levelable houses (2-10 capacity each, unlocked 1-per-TH-level).
3. **Farmer Joe became a real quest board** — 9 quests with resource
   rewards, auto-claims completed ones, removes them from the list
   permanently. (Market Stall was removed early on as redundant once
   this existed.)
4. **Lucky Wheel** — redesigned from a walkable building into a fixed
   screen widget with a real animated spinning-wheel modal, odds-
   proportional segments, ticket accrual (currently 1/min — a
   TESTING value, meant to be 1/hour for real use), rewards that
   scale with Town Hall level.
5. **Crafting** — Workbench has a real recipe-picker panel (player
   chooses what to craft; an earlier version auto-picked the "best"
   recipe, replaced because it removed player agency). 6 recipes:
   2 decorative (Nest Charm, Basket) + 4 industrial refined goods
   (Chicken Feed, Plank, Brick, Ingot) added in the most recent batch.
6. **Egg upkeep** — assigned workers now drain egg over time
   (village-wide, not per-building). No penalty yet for hitting 0 —
   deliberately deferred, needs its own design pass.
7. **Several real bugs caught and fixed along the way** (worth
   knowing about since they reflect real fragility points in this
   codebase):
   - A building-id vs. resource-id string mismatch caused silently
     wrong worker caps/costs (caught via simulation testing, not
     visually).
   - A missing re-exported function caused the entire game to fail
     silently on load (blank screen, no console-visible error) — now
     always verified via a full import-graph trace before delivery,
     not just per-file syntax checks.
   - The interaction-radius system used center-to-center distance,
     which broke down for large buildings (Town Hall reachable from
     only one side) — fixed to edge-to-point distance.
   - The resource HUD hid resource counts behind a lock icon based on
     a building's production-gate status, even when the player
     actually had that resource from another source (Lucky Wheel) —
     misled the player into thinking crafting was broken when it
     wasn't.

## Next Recommended Task
No blockers, so this is a genuine prioritization choice. Candidates,
roughly in order of "smallest/safest" to "biggest new territory":

1. **Playtest current build for balance** — rate/cap tier formulas,
   egg upkeep drain rate, and Lucky Wheel reward scaling are all
   first-guess numbers per their specs, explicitly flagged as needing
   real playtesting, not more paper design.
2. **Decide egg-upkeep consequences** — currently a no-op at 0 egg.
   Needs a real design decision (production penalty? something else?)
   before it's a complete mechanic.
3. **Real art integration** — still 100% placeholder. Kenney.nl CC0
   pack recommended (public-repo-safe, unlike the cuter itch.io packs
   considered earlier). This is purely additive to existing code
   (tileConfig.js already has a `TILE_RENDER_MODE` flag built for
   exactly this swap).
4. **Give refined goods a purpose** — Chicken Feed/Plank/Brick/Ingot
   currently just sit in inventory. Needs a real design decision
   before more get added.
5. **Hero/dungeon system (non-NFT version)** — discussed but not
   proposed yet. Should be built as a free, in-game-only system first
   (same pattern as Lucky Wheel) to validate the loop before any
   NFT/monetization conversation, which stays gated behind legal
   review regardless of how fun the base mechanic turns out to be.

## Decisions
- **NFT/land ownership/revenue-share/monetization stays deferred
  pending legal review**, full stop, across every change so far.
  Pixiland's actual land-ownership model (landholders earn passive
  revenue from other players' activity) resembles patterns that draw
  securities-law scrutiny — flagged early, held as a hard boundary
  through every subsequent feature. Genre mechanics inspired by
  Pixiland are fair game to build; their specific assets/text/
  branding are not to be copied.
- **Kenney.nl (CC0)** is the recommended path for real art — free,
  redistribution-safe for a public repo (unlike itch.io packs like
  Sprout Lands or Cute Fantasy RPG, which restrict commercial use).
- **Resource role split** (deliberate, not incidental): Egg = worker
  upkeep sink. Feathers = reserved for a future hero-crafting system
  (no functional role yet). Rice/Wood/Stone/Ore = the "industrial"
  raw→refined material lane.
- **Workflow**: developer uploads code via GitHub's web UI (drag-and-
  drop from delivered zips), not git CLI. OpenSpec proposals are
  drafted and printed in-chat as pasteable markdown for the developer
  to add manually — double-check each proposal actually made it into
  the repo rather than assuming, since this has been missed before.
- **Verification standard**: every delivered change gets (a) a
  per-file syntax check, (b) a full import-graph trace (catches
  silent breakage that per-file checks miss), and (c) functional
  simulation tests of the actual new behavior before being called
  done. This standard exists because of real bugs caught by exactly
  this process, not as a hypothetical precaution.

## Session Log
- **This session**: Diagnosed and corrected a false alarm — an
  earlier check found the repo missing all code, but the developer
  had just uploaded it; re-verified via full diff against the latest
  build (identical, confirmed in sync). Did a full OpenSpec archive
  pass: wrote/updated 8 spec files reflecting actual current
  implementation (resource-production, building-progression,
  worker-system, town-hall-progression, quest-board, lucky-wheel,
  crafting-system, plus updates to the pre-existing world-map and
  interaction-system specs which had gone stale), removed all 5
  fully-implemented change folders. No production code changes this
  session — planning/documentation/audit only, per the Planner role.
