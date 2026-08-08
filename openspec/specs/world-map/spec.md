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
- **House 6-10** (added by `add-th10-houses`, repositioned by
  `fix-panel-click-reliability`) all sit in one shared 3-column grid
  together with houses 1-5 — this is a correction of this spec's own
  earlier claim that houses 6-10 "spread outward" onto the map's left/
  right edges. That was true only briefly: houses 9-10 originally
  launched east of the Town Hall cluster (a deliberate original
  design choice, not a bug), but developer playtesting found that
  confusing in practice, so `fix-panel-click-reliability` moved both
  into the same grid as houses 6-8 (columns {6, 9, 12} × rows {11, 14,
  17}). House 9 fills the grid's one genuinely empty slot (col 9, row
  17); House 10 needed a slot the 3×3 grid doesn't have at all (no 4th
  row fits before the map's border, no free column exists between the
  grid and the vertical path) — extended one column further west
  (col 3, row 17) instead, keeping the same 1-tile-gap spacing every
  other column pair in the grid already uses. Checked against the pond
  and the left map border; no overlap. Same collision verification
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
