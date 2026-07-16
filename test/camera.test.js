import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { createCamera } from '../js/camera.js';

describe('camera.js', () => {
  test('follow() centers the viewport on the target when the world is bigger than the viewport', () => {
    const camera = createCamera(1000, 800, 200, 100);
    camera.follow(500, 400);
    assert.equal(camera.x, 500 - 100);
    assert.equal(camera.y, 400 - 50);
  });

  test('follow() clamps to 0 at the top-left edge', () => {
    const camera = createCamera(1000, 800, 200, 100);
    camera.follow(0, 0);
    assert.equal(camera.x, 0);
    assert.equal(camera.y, 0);
  });

  test('follow() clamps to worldSize - viewportSize at the bottom-right edge', () => {
    const camera = createCamera(1000, 800, 200, 100);
    camera.follow(999999, 999999);
    assert.equal(camera.x, 1000 - 200);
    assert.equal(camera.y, 800 - 100);
  });

  test('follow() clamps to 0 (never negative) when the viewport is bigger than the world', () => {
    const camera = createCamera(100, 100, 500, 500);
    camera.follow(50, 50);
    assert.equal(camera.x, 0);
    assert.equal(camera.y, 0);
  });

  test('regression: viewportWidth/Height can be updated in place after a resize, and follow() re-clamps against the new size', () => {
    // This is the exact seam the camera-resize bug (memory.md,
    // "Code Review: Full Pass") lived in: camera.viewportWidth/Height
    // must be mutable properties that follow() reads live, not values
    // baked in at creation time, since main.js updates them directly
    // on window resize rather than recreating the camera.
    const camera = createCamera(1000, 800, 400, 400);
    camera.follow(999999, 999999);
    assert.equal(camera.x, 1000 - 400);

    // Simulate a window resize shrinking the viewport.
    camera.viewportWidth = 200;
    camera.viewportHeight = 200;
    camera.follow(999999, 999999);
    assert.equal(camera.x, 1000 - 200, 'camera should clamp to the NEW (smaller) viewport size, not the stale original');
    assert.equal(camera.y, 800 - 200);
  });
});
