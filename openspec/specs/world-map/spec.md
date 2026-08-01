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
- 20 buildings currently placed. **Layout v2 (tightened per
  playtesting feedback):** 6 resource buildings (Old Coop, Nest
  Bundle, Woodshed, Rice Paddy, Quarry, Mine) packed into a compact
  3×2 grid in the top-right; Town Hall, Workbench, Farmer Joe, and
  houses 1-5 clustered together centrally around Town Hall. This
  replaced an earlier layout where houses sat in a separate far
  corner and the Workbench was off inside the resource cluster —
  moved because gameplay revolves around Town Hall (upgrading it,
  checking popularity) and around houses (worker population), so
  both belong near where the player naturally spends time, not
  scattered by building "type." Every placement is
  collision-verified programmatically (no overlaps, nothing on solid
  tiles) before shipping — this check has caught real placement bugs
  multiple times, is now enforced automatically by `test/map.test.js`
  on every test run, and should keep being run for any new building.
- **Barracks and Dungeon Gate** (added with the hero/dungeon system —
  see hero-system and dungeon-system specs) sit just below the Town
  Hall/Workbench cluster, on open ground between Town Hall's footprint
  and the map's bottom border, clear of the vertical path and House 5.
  Placed there for the same "management cluster" reasoning as
  Workbench: both are buildings the player revisits often rather than
  a one-time resource stop, so they belong near where the player
  already spends time.
- **House 6-10** (added by `add-th10-houses`) spread outward from the
  central cluster rather than continuing to pack into it — by house 5,
  the central area around Town Hall was already dense with Workbench,
  Barracks, Dungeon Gate, and 5 houses, so houses 6-8 run down the
  map's left side (col 6, rows 11/14/17) and houses 9-10 down the
  right side (col 23/row 12, col 25/row 15), clear of the resource
  cluster's footprint and existing decorative tree tiles (house_10 was
  specifically shifted from its originally-planned column to clear a
  tree tile it would otherwise have overlapped — noted inline in
  map.js since it's the kind of placement decision that looks
  arbitrary without the reason attached). Same collision verification
  applies as every other building.
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
