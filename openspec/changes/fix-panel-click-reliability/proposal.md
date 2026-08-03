# Proposal: Fix Panel Click Reliability + House 9/10 Placement

## Why
Developer testing found: Workbench craft buttons can't be clicked,
Dungeon Gate's Medium/Hard tier buttons can't be clicked, and the
Dungeon Gate's champion picker can't be clicked (always defaults to
the first hero). Separately, House 9 and House 10 aren't positioned
with the rest of the houses on the map. Bundling these as one bug-fix
batch (same precedent as the earlier Lucky Wheel/Crafting/Layout
batch), since three of the four share one likely root cause.

## What Changes (pending Backend confirmation — see design.md)
- Likely root cause for the 3 click bugs: `updatePromptUI()` — which
  calls `updateCraftingPanel()`/`updateDungeonPanel()`/
  `updateHeroPanel()` — runs every single animation frame from
  `loop(now)`, and each of those functions fully rebuilds its panel's
  `innerHTML` from scratch every call. That means every button in
  those panels (Craft, tier picker, champion picker) is destroyed and
  recreated ~60 times/second. A click is a mousedown+mouseup pair on
  the *same* element — if the element gets replaced between those two
  events (which a full innerHTML rebuild guarantees, every frame),
  the click never fires. This matches all 3 reported symptoms exactly:
  Craft never registers, tier buttons never register, and champion
  selection appears to always "default to champion 1" because
  clicking a different hero's button never successfully updates
  `selectedHeroId`.
- Fix approach (for Backend to confirm/refine, not decided here):
  these panels should only rebuild their DOM when something that
  actually affects their contents changes (target building, resource
  amounts crossing an affordability threshold, hero roster changes,
  selected tier/hero) — not unconditionally every frame. Exact
  mechanism (dirty-checking, diffing, or just gating the rebuild
  behind a "did anything relevant change" check) is a Backend design
  call.
- House 9/10: currently placed "east of the Town Hall" by deliberate
  original design (see `map.js` comment near their coordinates), not
  a wiring bug — but confirmed confusing in actual play. Reposition
  them to sit with House 1-8's grid instead.

## Non-Goals
- DON'T change any panel's actual content/logic (costs, affordability
  rules, hero stats) — this is a render-timing fix only.
- DON'T touch the Building/generic-locked panel's own update logic
  unless it turns out to share the same per-frame-rebuild issue —
  confirm first, don't assume.

## Impact
- Affected specs: crafting-system, dungeon-system, hero-system,
  world-map
- Affected code: `main.js` (`updatePromptUI`, `updateCraftingPanel`,
  `updateDungeonPanel`, `updateHeroPanel`, `loop`), `map.js` (house
  9/10 coordinates)
