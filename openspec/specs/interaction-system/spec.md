# Spec: Interaction System

## Current State (implemented)
- Every interactable object has a position, footprint, and
  `interactRadius` (map.js).
- Each frame, `findNearestInteractable()` (interactions.js) checks
  distance from the player's position to the NEAREST EDGE of each
  interactable's rectangle (not center-to-center) — this was a real
  bug fix. Center-distance broke down for large buildings (e.g. the
  3x3 Town Hall): the radius could reach some sides but not others
  depending on where the player's collision box actually stopped
  them. Edge-distance is symmetric on every side regardless of
  building size. This edge-distance math now lives in its own
  exported `distanceToRect()` function (see below).
- A DOM prompt ("Press E or click to interact with X") shows/hides
  based on whether an interactable is in range — implemented in
  main.js, not inside the canvas render loop.

### Two ways to open a building's panel: E-press or click (`add-click-to-open-panels`)
Panels (Building Panel, Crafting Panel, hero roster, dungeon picker,
unlock-requirements panel — everything that isn't the E-press flavor-
text dialogue) are **selectedBuildingId-driven, not proximity-driven**.
Just walking within `interactRadius` of a building no longer opens its
panel by itself — the player has to actually select it, via either:
- **Clicking** the building's on-screen sprite (`canvas`'s click
  listener converts screen coordinates to world coordinates via the
  camera offset, hit-tests against `interactables`' rectangles, then
  range-checks the click against `interactRadius` using the *same*
  `distanceToRect()` function `findNearestInteractable` uses — a
  click doesn't bypass the "must be in range" rule, it just replaces
  walking-into-range as the trigger).
- **Pressing E** near the nearest interactable — toggles
  `selectedBuildingId` exactly the same way a click does, for every
  building except `farmer_npc` and `town_hall`
  (`DIALOGUE_ONLY_ON_E`), which keep E as a pure flavor-text-dialogue
  trigger with no panel to toggle.

Clicking/E-pressing an already-selected building, or clicking empty
ground, deselects it (closes the panel). `getSelectedInteractable()`
re-resolves `selectedBuildingId` against the player's *current*
position every frame and auto-clears the selection the moment the
player walks out of range — the panel doesn't linger open after
walking away. A panel is also force-cleared while a dialogue box is
open (`dialogueState.open`), specifically because Barracks and
Dungeon Gate sit close enough to Town Hall that a player can be within
both buildings' `interactRadius` simultaneously — without this, a
panel could stay visibly stuck open behind/alongside an unrelated
dialogue box.

**This replaced purely proximity-triggered panels** (the previous
behavior: standing in range alone was enough to show a panel). The
motivation (per `add-click-to-open-panels/design.md`) was that as more
panel-driving buildings clustered near Town Hall (Workbench, Barracks,
Dungeon Gate, houses), multiple panels' trigger radii started
overlapping, so proximity alone couldn't unambiguously pick which
panel to show.

- Pressing E on a `DIALOGUE_ONLY_ON_E` building (or on anything while a
  panel isn't the relevant response) opens a dialogue overlay with
  dynamic title + text from that building's handler in
  `interactionHandlers.js` (no longer a static string — evolved into
  full per-building logic: unlock checks, production status, quest
  lists, etc.)
- Player movement is paused while dialogue is open (main.js skips
  `updatePlayer()` when `dialogueState.open`).
- **Building Panel / Crafting Panel / hero & dungeon panels**: once
  selected (see above), these handle anything requiring direct
  manipulation: worker +/- buttons, the Upgrade button (with live
  cost/preview, red-highlighted if unaffordable), the Workbench's
  recipe picker, hero recruit/equip/heal, and dungeon send. This split
  from the E-press dialogue exists because upgrading/assigning
  workers/spending resources needs to be a deliberate click, never
  triggered by E-press alone (an earlier version auto-upgraded on E,
  which felt wrong and was explicitly reworked).

### Test coverage gap — flagged, not silently skipped
`main.js` (including all of the above — click hit-testing, selection
state, panel show/hide) is DOM/Canvas glue and is **not** covered by
this project's automated `node:test` suite, consistent with every
other main.js behavior (see docs/ARCHITECTURE.md's "pure logic vs.
presentation glue" split). Persistently automating a real canvas click
→ panel-opens assertion would need a DOM environment (e.g. jsdom) that
this project doesn't currently depend on — the test suite's whole
premise (`README.md`/`docs/ARCHITECTURE.md`) is running under plain
Node with zero installed dependencies. Adding jsdom is a real, valid
option, but it's a philosophy change (first non-Node-builtin test
dependency) worth an explicit decision rather than a silent addition
bundled into a docs/testing pass. What IS covered: `distanceToRect()`
itself is directly unit-tested (`test/interactions.test.js`) since
it's the shared range-check both the click handler and
`findNearestInteractable` depend on — the pure math is tested, the DOM
wiring around it is playtested by hand, same split as everywhere else
in this codebase.

## Constraints for future changes
- `dialogue` as a plain string is now legacy — every real building
  uses a handler function in `interactionHandlers.js` returning
  `{title, text, floatingAmount?, floatingIcon?}`. New buildings
  should follow that pattern, not the old static-string one.
- Anything requiring a button click (not just walk-up-and-E) belongs
  in the building/crafting panel system in main.js, not jammed into
  the E-press dialogue flow.
- Keep click and E-press using the *same* `selectedBuildingId` toggle
  and the *same* `distanceToRect()` range check — don't let the two
  input paths drift into separately-implemented selection logic.
- `DIALOGUE_ONLY_ON_E` should stay a short, deliberate exception list
  (currently just `farmer_npc`/`town_hall`) — new buildings should
  default to panel-driven selection unless there's a specific reason
  they're pure-dialogue, matching Farmer Joe/Town Hall's own reasons
  (an NPC with nothing to click-configure; Town Hall's actionable
  content is its Upgrade button, which already lives in the Building
  Panel, not the dialogue).
