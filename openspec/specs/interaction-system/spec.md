# Spec: Interaction System

## Current State (implemented)
- Every interactable object has a position, footprint, and
  `interactRadius` (map.js).
- Each frame, `findNearestInteractable()` (interactions.js) checks
  distance from the player's center to every interactable's center,
  and returns the closest one within radius (or null).
- A DOM prompt ("Press E to interact with X") shows/hides based on
  whether an interactable is in range — implemented in main.js, not
  inside the canvas render loop.
- Pressing E opens a dialogue overlay with static title + text from
  the interactable's `dialogue` field. Pressing E again or Escape
  closes it.
- Player movement is paused while dialogue is open (main.js skips
  `updatePlayer()` when `dialogueState.open`).

## Constraints for future changes
- This is intentionally a thin seam: `dialogue` is just a string today,
  but any future quest/shop/production logic should hook in by
  extending what `onInteract` does per-object — not by replacing this
  proximity/prompt system.
- Multiple simultaneous interactables in range are resolved by nearest
  distance only — if quests ever need priority rules (e.g. quest-giver
  over decoration), that logic should live in `findNearestInteractable`,
  not be special-cased in main.js.
