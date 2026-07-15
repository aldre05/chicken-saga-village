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
  makeInteractable({
    id: 'farmer_npc', name: 'Farmer Joe',
    col: 13, row: 9, tileWidth: 1, tileHeight: 1,
    color: '#c9a23b',
    dialogue: "Howdy! Nothing much to do around here yet, but stick around — big things comin'."
  })
];
