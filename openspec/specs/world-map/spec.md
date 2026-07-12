# Spec: World Map

## Current State (implemented)
- Map is a hand-placed 2D grid of tile IDs, generated via code
  (map.js) rather than a literal typed grid, to avoid manual
  grid-authoring errors. 30 cols x 20 rows, 16px tiles rendered at 3x
  scale (48px on screen).
- Tile types: grass, path, water, wall, tree, flower — defined in
  tileConfig.js along with a solid/non-solid flag per tile type.
- Rendering is currently PLACEHOLDER: flat colors per tile type
  (TILE_RENDER_MODE = 'color'). Swapping to a real Kenney tileset
  image means: set TILE_RENDER_MODE = 'image', fill in
  TILE_SOURCE_RECTS in tileConfig.js. No other file needs to change —
  render.js already branches on this flag.
- Interactable objects (buildings/NPCs) are separate from tiles —
  defined with pixel position, footprint size, solidity, interact
  radius, and dialogue text (map.js).
- Only the tiles within the current camera viewport are drawn each
  frame (render.js `drawVisibleTiles`), not the whole map.
- 13 buildings currently placed, clustered by type: 6 resource
  buildings (Old Coop, Nest Bundle, Woodshed, Rice Paddy, Quarry,
  Mine) in one area, 5 houses in another, Town Hall + Workbench +
  Farmer Joe placed centrally. Every placement is collision-verified
  programmatically (no overlaps, nothing on solid tiles) before
  shipping — this check has caught real placement bugs multiple
  times and should keep being run for any new building.
- **Exception**: the Lucky Wheel is NOT on the map — it's a fixed
  screen UI widget, not a walkable interactable (see lucky-wheel
  spec). Building-level labels (e.g. "Old Coop (Lvl 3)") are drawn
  above each interactable that has a level, sourced live from
  `buildingLevels` state passed into the render call.

## Constraints for future changes
- Tile IDs and solidity must stay defined in tileConfig.js, not
  hardcoded elsewhere — this is what keeps collision, rendering, and
  future minimap/pathfinding features in sync.
- New buildings/NPCs go in map.js's `interactables` array using the
  existing `makeInteractable()` helper — don't hand-place raw objects.
