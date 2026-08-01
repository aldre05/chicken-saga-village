import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import {
  distanceToRect,
  findNearestInteractable,
  createDialogueState,
  openDialogue,
  closeDialogue
} from '../js/interactions.js';

function rect(id, x, y, width, height, interactRadius) {
  return { id, name: id, x, y, width, height, interactRadius, dialogue: `dialogue for ${id}` };
}

describe('interactions.js', () => {
  // distanceToRect is exported specifically so main.js's click-to-open
  // handler (add-click-to-open-panels) reuses this exact function for
  // its range check instead of reimplementing edge-distance math —
  // see interactions.js's own comment. Tested directly here since it's
  // now public API, not just an internal helper of
  // findNearestInteractable.
  describe('distanceToRect (exported for main.js click-handler reuse)', () => {
    test('is 0 for a point inside the rectangle', () => {
      assert.equal(distanceToRect(50, 50, { x: 0, y: 0, width: 100, height: 100 }), 0);
    });

    test('measures to the nearest edge, not the center, for a point outside', () => {
      const r = { x: 100, y: 100, width: 300, height: 300 };
      // Directly left of the rect, vertically centered -- nearest edge is 10px away horizontally.
      assert.equal(distanceToRect(90, 250, r), 10);
    });

    test('is symmetric on all 4 sides for the same offset distance', () => {
      const r = { x: 100, y: 100, width: 100, height: 100 };
      const left = distanceToRect(90, 150, r);
      const right = distanceToRect(210, 150, r);
      const top = distanceToRect(150, 90, r);
      const bottom = distanceToRect(150, 210, r);
      assert.equal(left, 10);
      assert.equal(left, right);
      assert.equal(left, top);
      assert.equal(left, bottom);
    });

    test('uses true Euclidean distance from a corner, not axis-aligned distance', () => {
      const r = { x: 0, y: 0, width: 100, height: 100 };
      // 3px left, 4px above the top-left corner -> classic 3-4-5 triangle.
      assert.equal(distanceToRect(-3, -4, r), 5);
    });
  });

  test('findNearestInteractable returns null when nothing is in range', () => {
    const objs = [rect('a', 1000, 1000, 50, 50, 10)];
    const result = findNearestInteractable({ x: 0, y: 0 }, objs);
    assert.equal(result, null);
  });

  test('findNearestInteractable measures distance to the nearest EDGE, not the center (large-building regression guard)', () => {
    // A large 3x3 building: center distance would wrongly exceed the
    // radius on the near side. Player stands just outside the left edge.
    const bigBuilding = rect('town_hall', 100, 100, 300, 300, 20);
    // Player is 10px to the left of the building's left edge, vertically centered.
    const player = { x: 90, y: 250 };
    const result = findNearestInteractable(player, [bigBuilding]);
    assert.equal(result.id, 'town_hall', 'should be in range via edge distance even though far from center');
  });

  test('findNearestInteractable returns null just outside the radius (edge-distance boundary)', () => {
    const building = rect('b', 100, 100, 50, 50, 10);
    // Left edge is at x=100; radius 10 means x=89 (11px away) should be out of range.
    const player = { x: 89, y: 125 };
    assert.equal(findNearestInteractable(player, [building]), null);
  });

  test('findNearestInteractable picks the closest of several in-range candidates', () => {
    const far = rect('far', 50, 0, 10, 10, 100);   // nearest edge at x=50, distance 50
    const near = rect('near', 10, 0, 5, 5, 100);   // nearest edge at x=10, distance 10
    const result = findNearestInteractable({ x: 0, y: 0 }, [far, near]);
    assert.equal(result.id, 'near');
  });

  test('findNearestInteractable treats a point inside the rectangle as distance 0', () => {
    const building = rect('inside', 0, 0, 100, 100, 5);
    const result = findNearestInteractable({ x: 50, y: 50 }, [building]);
    assert.equal(result.id, 'inside');
  });

  test('dialogue state: create -> open -> close lifecycle', () => {
    const state = createDialogueState();
    assert.equal(state.open, false);

    openDialogue(state, { name: 'Farmer Joe', dialogue: 'Howdy!' });
    assert.equal(state.open, true);
    assert.equal(state.title, 'Farmer Joe');
    assert.equal(state.text, 'Howdy!');

    closeDialogue(state);
    assert.equal(state.open, false);
  });
});
