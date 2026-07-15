# Tasks: Chicken Village MVP

## 1. Project Setup
- [ ] 1.1 Init new repo (public — safe with CC0 assets), vanilla JS +
      HTML5 Canvas
- [ ] 1.2 Download Kenney "RPG Base" (or similar) pack, confirm tile
      size, add to repo under /assets

## 2. Tile Map Rendering
- [ ] 2.1 Build tileConfig.js mapping tile IDs to source rects in the
      tileset image
- [ ] 2.2 Hand-place a small village map (2D array) — a few paths,
      grass, 2-3 buildings, some trees/decoration
- [ ] 2.3 Build the render loop: draw visible tiles only (based on
      camera position) for performance

## 3. Camera
- [ ] 3.1 Implement camera tracking player position
- [ ] 3.2 Clamp camera to map bounds

## 4. Player Controller
- [ ] 4.1 Implement keyboard input (WASD/arrows)
- [ ] 4.2 Implement collision check against collisionMap before
      committing movement
- [ ] 4.3 Implement player sprite + walk-cycle animation per direction
      (decide: reuse chicken-idle-tycoon sprite vs. new Kenney-based one)

## 5. Interaction System
- [ ] 5.1 Define interactable objects (position + radius + onInteract)
- [ ] 5.2 Implement proximity check + "Press E to interact" prompt UI
- [ ] 5.3 Implement placeholder dialogue box on interact

## 6. Polish / Verification
- [ ] 6.1 Playtest movement feel (speed, collision edges)
- [ ] 6.2 Confirm map renders correctly at different screen sizes

## Explicitly deferred to future proposals
- Quest system, inventory, combat
- Multiplayer
- Supabase persistence (player position/progress)
- Any token/wallet/earnings integration (requires legal review first)
