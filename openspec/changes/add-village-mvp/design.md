# Design: Chicken Village MVP

## Context
Solo dev, out-of-pocket, no budget for assets. Kenney.nl CC0 tilesets
chosen specifically because they're free, commercial-safe, and
redistribution is allowed (so the repo can stay public, unlike the
cuter itch.io packs discussed earlier). Target: a walkable single
village map with a handful of interactive buildings, as a foundation
to build quests/economy on top of later.

## Goals
- Smooth top-down movement with tile-based collision
- A camera that follows the player across a map larger than the screen
- A simple, reusable "interact with nearby object" system (walk up,
  press a key, see a response) — this is the hook that quests,
  buildings, and NPCs will all plug into later
- Everything built so a future proposal can add quests/economy/tokens
  without reworking this foundation

## Non-Goals
- No quest logic, inventory, combat, or multiplayer yet
- No monetization or wallet integration yet
- No procedural map generation — a single hand-placed map is enough
  for the MVP

## Tech Approach

HTML5 Canvas, vanilla JS (matches existing stack conventions). No
framework — a tile map is just a 2D array and a draw loop.

### Tile Map
- Map defined as a 2D array of tile IDs, e.g. `[[0,0,1,1,2], ...]`
- Each tile ID maps to a source rectangle in the Kenney tileset image
  (a `tileConfig.js` maps ID → {sx, sy} source coords)
- A separate `collisionMap` (2D array of 0/1) marks which tiles block
  movement — kept independent from the visual tile map so collision
  can be tuned without touching visuals
- Tile size: 16x16 (matches Kenney RPG Base), rendered scaled up
  (e.g. 3x) for visibility on modern screens

### Camera
- Camera tracks player position, clamped so it never shows past the
  map edges
- Render loop: `ctx.translate(-camera.x, -camera.y)` before drawing
  tiles/entities, so world-space and screen-space stay simple

### Player Controller
- Arrow keys / WASD move the player in 4 directions
- Position updates checked against `collisionMap` before committing
  movement (simple AABB check against the tile(s) the player would
  move into)
- Player has a small 4-frame walk cycle per direction (reuses the
  hand-authored pixel-sprite approach from chicken-idle-tycoon, or
  Kenney's player sprite if it fits the chicken theme closely enough
  — decide once assets are in hand)

### Interaction System
- Each interactive object (building, NPC) has a position + radius
- Each game tick, check distance from player to each interactable
- If within radius, show a "Press E to interact" prompt
- On keypress, fire that object's `onInteract()` callback — for MVP,
  this just shows a placeholder dialogue box with static text
- This callback structure is the seam where quests/shops/production
  buildings get hooked in later, without changing the core loop

## Data Model (local only for MVP)
No Supabase yet in this change — single-player, local-only map explore.
Player position doesn't need to persist between sessions for an MVP;
persistence can be added in a follow-up proposal once there's actual
state worth saving (inventory, quest progress, etc.)

## Risks / Open Questions
- Exact tile size and sprite dimensions depend on which Kenney pack
  gets used — confirm once the asset ZIP is in hand.
- Whether to reuse the chicken pixel sprite from chicken-idle-tycoon
  as the player character (keeps visual continuity with the Chicken
  Saga brand) vs. using a Kenney human sprite recolored/reskinned —
  recommend the former for brand consistency once we're this far in.
