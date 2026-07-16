import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import { mapGrid, interactables, MAP_COLS, MAP_ROWS } from '../js/map.js';
import { TILE_IDS, RENDERED_TILE_SIZE } from '../js/tileConfig.js';

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

describe('map.js layout integrity', () => {
  test('interactable ids are unique', () => {
    const ids = interactables.map(o => o.id);
    assert.equal(new Set(ids).size, ids.length);
  });

  test('no two interactable footprints overlap each other', () => {
    // Regression guard for the layout claim in memory.md ("tightened,
    // zero overlaps") — re-derived independently here so it's checked
    // on every run instead of trusted from a prior session's notes.
    const overlaps = [];
    for (let i = 0; i < interactables.length; i++) {
      for (let j = i + 1; j < interactables.length; j++) {
        if (rectsOverlap(interactables[i], interactables[j])) {
          overlaps.push(`${interactables[i].id} <-> ${interactables[j].id}`);
        }
      }
    }
    assert.deepEqual(overlaps, []);
  });

  test('every interactable footprint stays within the map bounds', () => {
    const worldWidth = MAP_COLS * RENDERED_TILE_SIZE;
    const worldHeight = MAP_ROWS * RENDERED_TILE_SIZE;
    for (const obj of interactables) {
      assert.ok(obj.x >= 0 && obj.y >= 0, `${obj.id} starts outside the map (negative coordinate)`);
      assert.ok(obj.x + obj.width <= worldWidth, `${obj.id} extends past the right map edge`);
      assert.ok(obj.y + obj.height <= worldHeight, `${obj.id} extends past the bottom map edge`);
    }
  });

  test('mapGrid has the declared MAP_ROWS x MAP_COLS dimensions', () => {
    assert.equal(mapGrid.length, MAP_ROWS);
    for (const row of mapGrid) assert.equal(row.length, MAP_COLS);
  });

  test('the outer ring of the map is all TREE tiles (world border)', () => {
    for (let c = 0; c < MAP_COLS; c++) {
      assert.equal(mapGrid[0][c], TILE_IDS.TREE, `top row col ${c} should be TREE`);
      assert.equal(mapGrid[MAP_ROWS - 1][c], TILE_IDS.TREE, `bottom row col ${c} should be TREE`);
    }
    for (let r = 0; r < MAP_ROWS; r++) {
      assert.equal(mapGrid[r][0], TILE_IDS.TREE, `left col row ${r} should be TREE`);
      assert.equal(mapGrid[r][MAP_COLS - 1], TILE_IDS.TREE, `right col row ${r} should be TREE`);
    }
  });
});
