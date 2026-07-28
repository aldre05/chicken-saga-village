# Proposal: Click-to-Open Building Panels

## Why
Every building panel currently opens automatically when the player
walks into range. Feedback: require a deliberate click instead —
applies to every building, no exceptions.

## What Changes
- Clicking a building's on-screen sprite opens its panel, replacing
  "walk into range" as the trigger.
- Player must still be within `interactRadius` for a click to
  register — range-gating stays, only the trigger changes.
- E-press remains a keyboard-equivalent trigger.
- New `selectedBuildingId` state replaces `nearest` as what drives
  panel visibility.

## Non-Goals
- DON'T change movement/collision.
- DON'T add a "close" button — clicking the same building again,
  clicking empty ground, or walking out of range all close it.
- DON'T change the dialogue box (Farmer Joe, Town Hall info) — was
  never proximity-automatic, keeps its existing E-press behavior.

## Impact
- Affected specs: interaction-system (significant update — this is
  the biggest behavioral change to that spec since its creation)
- Affected code: main.js (every panel-update function), a new click
  listener on the canvas
