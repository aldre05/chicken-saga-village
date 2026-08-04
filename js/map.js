// map.js — defines the village tile grid and interactable objects.
// Built programmatically (loops + fixed coordinate lists) rather than
// a hand-typed 30x20 grid literal, to avoid manual grid-typing errors.
// Layout (v2, tightened per feedback): resource-production buildings
// packed into a compact grid top-right, Town Hall + Workbench + houses
// clustered together centrally (was previously houses far bottom-left,
// Workbench off in the resource cluster — both moved close to Town
// Hall since gameplay revolves around it).

import { TILE_IDS, RENDERED_TILE_SIZE } from './tileConfig.js';

export const MAP_COLS = 30;
export const MAP_ROWS = 20;

function buildMapGrid() {
  const grid = [];
  for (let r = 0; r < MAP_ROWS; r++) {
    grid.push(new Array(MAP_COLS).fill(TILE_IDS.GRASS));
  }

  // Border ring of trees.
  for (let c = 0; c < MAP_COLS; c++) {
    grid[0][c] = TILE_IDS.TREE;
    grid[MAP_ROWS - 1][c] = TILE_IDS.TREE;
  }
  for (let r = 0; r < MAP_ROWS; r++) {
    grid[r][0] = TILE_IDS.TREE;
    grid[r][MAP_COLS - 1] = TILE_IDS.TREE;
  }

  // Horizontal path.
  for (let c = 2; c < MAP_COLS - 2; c++) {
    grid[10][c] = TILE_IDS.PATH;
  }
  // Vertical path.
  for (let r = 2; r < MAP_ROWS - 2; r++) {
    grid[r][15] = TILE_IDS.PATH;
  }

  // Small pond, top-left, away from paths and buildings.
  for (let r = 3; r <= 6; r++) {
    for (let c = 3; c <= 7; c++) {
      grid[r][c] = TILE_IDS.WATER;
    }
  }

  // Decorative flowers/trees — kept clear of the resource cluster
  // (cols17-25, rows2-7) and the Town Hall/house cluster (cols6-21,
  // rows11-18).
  const flowerSpots = [[8, 11], [9, 12], [3, 12], [4, 13]];
  for (const [r, c] of flowerSpots) grid[r][c] = TILE_IDS.FLOWER;

  const treeSpots = [[16, 23], [17, 24], [4, 26], [8, 26]];
  for (const [r, c] of treeSpots) grid[r][c] = TILE_IDS.TREE;

  return grid;
}

export const mapGrid = buildMapGrid();

// Interactable objects — placed in world pixel coordinates (derived
// from tile positions), each with a footprint for collision and a
// radius for the "press E to interact" proximity check.
function tileToPixels(col, row) {
  return { x: col * RENDERED_TILE_SIZE, y: row * RENDERED_TILE_SIZE };
}

function makeInteractable({ id, name, col, row, tileWidth, tileHeight, dialogue, color }) {
  const { x, y } = tileToPixels(col, row);
  return {
    id,
    name,
    x,
    y,
    width: tileWidth * RENDERED_TILE_SIZE,
    height: tileHeight * RENDERED_TILE_SIZE,
    solid: true,
    interactRadius: RENDERED_TILE_SIZE * 1.5,
    dialogue,
    color
  };
}

export const interactables = [
  // --- Resource cluster (tightened, top-right, packed 3x2 grid) ---
  makeInteractable({
    id: 'old_coop', name: 'Old Coop',
    col: 17, row: 2, tileWidth: 3, tileHeight: 2,
    color: '#8a6a4a',
    dialogue: "This coop's seen better days. Maybe it'll house something bigger someday..."
  }),
  makeInteractable({
    id: 'nest_bundle', name: 'Nest Bundle',
    col: 21, row: 2, tileWidth: 2, tileHeight: 2,
    color: '#d9c07a',
    dialogue: "A bundle of nests, ready to gather feathers from."
  }),
  makeInteractable({
    id: 'woodshed', name: 'Woodshed',
    col: 24, row: 2, tileWidth: 2, tileHeight: 2,
    color: '#6b4a32',
    dialogue: "Stacks of timber, waiting to be hauled."
  }),
  makeInteractable({
    id: 'rice_paddy', name: 'Rice Paddy',
    col: 17, row: 5, tileWidth: 2, tileHeight: 2,
    color: '#c9a23b',
    dialogue: "Paddies of rice, ready for harvest."
  }),
  makeInteractable({
    id: 'quarry', name: 'Quarry',
    col: 20, row: 5, tileWidth: 2, tileHeight: 2,
    color: '#8a8a8a',
    dialogue: "A rocky pit, rich with stone."
  }),
  makeInteractable({
    id: 'mine', name: 'Mine',
    col: 23, row: 5, tileWidth: 2, tileHeight: 2,
    color: '#5a5a6a',
    dialogue: "A dark shaft leading down toward ore."
  }),

  // --- Town Hall + Workbench + houses, all clustered together ---
  makeInteractable({
    id: 'town_hall', name: 'Town Hall',
    col: 17, row: 12, tileWidth: 3, tileHeight: 3,
    color: '#9c7a4a', dialogue: "The heart of the village."
  }),
  makeInteractable({
    id: 'workbench', name: 'Workbench',
    col: 20, row: 13, tileWidth: 2, tileHeight: 2,
    color: '#7a5f4a',
    dialogue: "Tools laid out, ready for crafting."
  }),
  makeInteractable({
    id: 'house_1', name: 'House 1',
    col: 9, row: 11, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "A cozy little house."
  }),
  makeInteractable({
    id: 'house_2', name: 'House 2',
    col: 12, row: 11, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "Room for more of the flock."
  }),
  makeInteractable({
    id: 'house_3', name: 'House 3',
    col: 9, row: 14, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "The village keeps growing."
  }),
  makeInteractable({
    id: 'house_4', name: 'House 4',
    col: 12, row: 14, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "Another roof, another flock."
  }),
  makeInteractable({
    id: 'house_5', name: 'House 5',
    col: 12, row: 17, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "The last house — for now."
  }),
  // add-th10-houses: 5 more, same 2x2 footprint/pattern as above.
  // house_6/7/8 mirror house_1/3/5's column (c9-10) shifted 3 cols
  // west (c6-7) — same row triplet (11-12 / 14-15 / 17-18), clear of
  // the pond (c3-7, r3-6 — different rows) and the vertical path
  // (col15 — different col). house_9/10 originally went east of the
  // Town Hall cluster (c23/r12, c25/r15) — see the comment further
  // below, right above their actual placement, for why they were
  // later moved into this same grid by fix-panel-click-reliability
  // task 1.4 instead.
  makeInteractable({
    id: 'house_6', name: 'House 6',
    col: 6, row: 11, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "Still growing."
  }),
  makeInteractable({
    id: 'house_7', name: 'House 7',
    col: 6, row: 14, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "Word's getting around about this place."
  }),
  makeInteractable({
    id: 'house_8', name: 'House 8',
    col: 6, row: 17, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "The village is really taking shape."
  }),
  // fix-panel-click-reliability task 1.4: house_9/10 originally sat
  // east of the Town Hall cluster (c23/r12 and c25/r15) — moved into
  // House 1-8's own grid instead, per that task's explicit
  // instruction, not left where they were. The existing grid is
  // columns {6, 9, 12} x rows {11, 14, 17} (9 slots, 1-tile gaps
  // between columns) — 8 of 9 slots were filled, with col9/row17
  // the only genuinely empty one (house_5 sits at col12/row17,
  // house_8 at col6/row17, nothing at col9/row17). house_9 fills
  // that real gap exactly.
  // house_10 needed a 10th slot the existing 3x3 grid doesn't have.
  // A 4th ROW isn't possible — MAP_ROWS is 20 (indices 0-19), row19
  // is the solid border-tree row, so row20 would be entirely off the
  // map. Checked squeezing a column between the house grid (ends at
  // col12-13) and the vertical path (col15) — col13 is already
  // house_2's/house_4's/house_5's own footprint (col12, tileWidth 2
  // = cols12-13) at every one of the 3 house rows, so there's no
  // free column between the grid and the path at any row. Extended
  // WEST to col3 instead, staying in the row17 group (matching
  // house_9's row), keeping the same 1-tile-gap spacing every other
  // column pair in this grid already uses (col5 gap between house_8
  // at c6-7 and house_9 at c9-10 mirrors this). Checked against the
  // pond (rows3-6, cols3-7 — same column range but a completely
  // different row range, no overlap at row17) and the left border
  // (col0 — col3 leaves cols1-2 as clear buffer).
  makeInteractable({
    id: 'house_9', name: 'House 9',
    col: 9, row: 17, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "Nearly a proper town now."
  }),
  makeInteractable({
    id: 'house_10', name: 'House 10',
    col: 3, row: 17, tileWidth: 2, tileHeight: 2,
    color: '#9c6a4a', dialogue: "The final house. Quite the village you've built."
  }),
  makeInteractable({
    id: 'farmer_npc', name: 'Farmer Joe',
    col: 13, row: 9, tileWidth: 1, tileHeight: 1,
    color: '#c9a23b',
    dialogue: "Howdy! Nothing much to do around here yet, but stick around — big things comin'."
  }),

  // --- Heroes/Dungeons (add-heroes-dungeons) — placed just below
  // Town Hall/Workbench, same "management cluster" reasoning design.md
  // gives for Workbench: cols17-21/rows15-16 is open ground between
  // the Town Hall footprint (rows12-14) and the map's bottom border
  // (row19), clear of the vertical path (col15) and house_5
  // (cols12-13, rows17-18).
  makeInteractable({
    id: 'barracks', name: 'Barracks',
    col: 17, row: 15, tileWidth: 2, tileHeight: 2,
    color: '#6a5a3a',
    dialogue: "Recruits drilling in formation, ready to be sent on missions."
  }),
  makeInteractable({
    id: 'dungeon_gate', name: 'Dungeon Gate',
    col: 20, row: 15, tileWidth: 2, tileHeight: 2,
    color: '#3a2a4a',
    dialogue: "A stone archway humming with old magic. Something waits beyond it."
  })
];
