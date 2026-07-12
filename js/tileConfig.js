// tileConfig.js — defines what each tile ID looks like and whether it
// blocks movement. PLACEHOLDER RENDERING: solid colors for now. Once
// the Kenney tileset PNG is added, swap TILE_RENDER_MODE to 'image'
// and fill in TILE_SOURCE_RECTS below — render.js already branches on
// this flag so no other file needs to change.

export const TILE_SIZE = 16;   // source tile size in pixels
export const SCALE = 3;        // on-screen scale factor
export const RENDERED_TILE_SIZE = TILE_SIZE * SCALE;

export const TILE_RENDER_MODE = 'color'; // 'color' | 'image'

export const TILE_IDS = {
  GRASS: 0,
  PATH: 1,
  WATER: 2,
  WALL: 3,
  TREE: 4,
  FLOWER: 5
};

// Placeholder flat colors, used while TILE_RENDER_MODE === 'color'.
export const TILE_COLORS = {
  [TILE_IDS.GRASS]:  '#5c7a3f',
  [TILE_IDS.PATH]:   '#c9a86a',
  [TILE_IDS.WATER]:  '#4a7fa0',
  [TILE_IDS.WALL]:   '#5a4432',
  [TILE_IDS.TREE]:   '#2f4a24',
  [TILE_IDS.FLOWER]: '#6b8f4f'
};

// Once real Kenney art is in hand, fill these in as { sx, sy } source
// coordinates (in source-tile units, not pixels) into the tileset image,
// and flip TILE_RENDER_MODE to 'image'.
export const TILE_SOURCE_RECTS = {
  [TILE_IDS.GRASS]:  null,
  [TILE_IDS.PATH]:   null,
  [TILE_IDS.WATER]:  null,
  [TILE_IDS.WALL]:   null,
  [TILE_IDS.TREE]:   null,
  [TILE_IDS.FLOWER]: null
};

// Which tiles block player movement.
export const TILE_SOLID = {
  [TILE_IDS.GRASS]:  false,
  [TILE_IDS.PATH]:   false,
  [TILE_IDS.WATER]:  true,
  [TILE_IDS.WALL]:   true,
  [TILE_IDS.TREE]:   true,
  [TILE_IDS.FLOWER]: false
};
