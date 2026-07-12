// interactions.js — finds the nearest in-range interactable object
// each frame, and manages a simple open/close dialogue state.
// This is the seam future proposals (quests, shops, buildings) hook
// into — onInteract just shows static text for the MVP.

// Distance from a point to the NEAREST EDGE of a rectangle (0 if the
// point is inside it), not to the rectangle's center. Using center
// distance was the bug: large buildings (e.g. 3x3 Town Hall) have
// their center far from their edges, so interactRadius could reach
// some sides but not others depending on exactly where the player's
// collision box stopped them. Edge distance is symmetric on all sides
// regardless of building size.
function distanceToRect(px, py, rect) {
  const closestX = Math.max(rect.x, Math.min(px, rect.x + rect.width));
  const closestY = Math.max(rect.y, Math.min(py, rect.y + rect.height));
  return Math.sqrt((px - closestX) ** 2 + (py - closestY) ** 2);
}

export function findNearestInteractable(playerCenter, interactables) {
  let nearest = null;
  let nearestDist = Infinity;

  for (const obj of interactables) {
    const d = distanceToRect(playerCenter.x, playerCenter.y, obj);
    if (d <= obj.interactRadius && d < nearestDist) {
      nearest = obj;
      nearestDist = d;
    }
  }

  return nearest;
}

export function createDialogueState() {
  return { open: false, title: '', text: '' };
}

export function openDialogue(state, obj) {
  state.open = true;
  state.title = obj.name;
  state.text = obj.dialogue;
}

export function closeDialogue(state) {
  state.open = false;
}
