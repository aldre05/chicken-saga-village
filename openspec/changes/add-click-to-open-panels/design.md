# Design: Click-to-Open Building Panels

## Context
Extends interaction-system. This is the biggest UX change to how
players interact with buildings since the game's MVP — worth treating
as its own isolated change (see Risks).

## Goals
- Deliberate action required to see any panel, no exceptions
- Keep both mouse and keyboard as valid input methods
- Minimize new UI surface (no new "close" button, reuse existing
  interaction patterns for closing)

## Non-Goals
See proposal.md.

## Click Detection
```js
canvas.addEventListener('click', (e) => {
  const rect = canvas.getBoundingClientRect();
  const worldX = e.clientX - rect.left + camera.x;
  const worldY = e.clientY - rect.top + camera.y;
  const clicked = interactables.find(obj =>
    worldX >= obj.x && worldX <= obj.x + obj.width &&
    worldY >= obj.y && worldY <= obj.y + obj.height
  );
  if (!clicked) { selectedBuildingId = null; return; }

  const distance = distanceToRect(playerCenter, clicked); // reuse existing helper from interactions.js
  if (distance > clicked.interactRadius) return; // out of range, ignore click

  selectedBuildingId = (selectedBuildingId === clicked.id) ? null : clicked.id;
});
```

## Panel Visibility
Every panel-update function (`updateBuildingPanel`, `updateCraftingPanel`,
`updateDungeonPanel`, `updateHeroPanel`, locked-building requirements)
changes its trigger check from `nearest` to `selectedBuildingId`:
- Look up the matching object in `interactables` by `selectedBuildingId`
- If found AND still within range of the player → show panel
- Otherwise (walked away, or nothing selected) → hide panel,
  clear `selectedBuildingId` if it's now out of range

## E-Press Unification
```js
// E keydown handler:
if (nearest && distanceToRect(playerCenter, nearest) <= nearest.interactRadius) {
  selectedBuildingId = (selectedBuildingId === nearest.id) ? null : nearest.id;
}
```
Same toggle semantics as a click — press E again on the same building
to close, matching click behavior exactly.

## What Doesn't Change
- `nearest` and `findNearestInteractable()` still run every frame —
  they now only drive the "Press E / Click to interact" prompt text,
  not panel visibility.
- Farmer Joe and Town Hall's dialogue-triggered info remain on their
  existing E-press path, unaffected by this change.

## Risks / Open Questions
- This touches every panel function in main.js — larger diff than
  the description suggests. Ship as its own isolated PR.
- Confirm during implementation that dialogue-triggered buildings
  (Farmer Joe, Town Hall) aren't accidentally affected by the E-press
  unification — they should work exactly as before.
