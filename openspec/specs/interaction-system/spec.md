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
  building size.
- A DOM prompt ("Press E to interact with X") shows/hides based on
  whether an interactable is in range — implemented in main.js, not
  inside the canvas render loop.
- Pressing E opens a dialogue overlay with dynamic title + text from
  that building's handler in `interactionHandlers.js` (no longer a
  static string — evolved into full per-building logic: unlock
  checks, production status, quest lists, etc.)
- Player movement is paused while dialogue is open (main.js skips
  `updatePlayer()` when `dialogueState.open`).
- **Building Panel / Crafting Panel**: a separate, always-visible
  (while in range) clickable panel — distinct from the E-press
  dialogue — handles anything requiring direct manipulation: worker
  +/- buttons, the Upgrade button (with live cost/preview, red-
  highlighted if unaffordable), and the Workbench's recipe picker.
  This split exists because upgrading/assigning workers needs to be a
  deliberate click, never triggered by E-press (an earlier version
  auto-upgraded on E, which felt wrong and was explicitly reworked).

## Constraints for future changes
- `dialogue` as a plain string is now legacy — every real building
  uses a handler function in `interactionHandlers.js` returning
  `{title, text, floatingAmount?, floatingIcon?}`. New buildings
  should follow that pattern, not the old static-string one.
- Anything requiring a button click (not just walk-up-and-E) belongs
  in the building/crafting panel system in main.js, not jammed into
  the E-press dialogue flow.
