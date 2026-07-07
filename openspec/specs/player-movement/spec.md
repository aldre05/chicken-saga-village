# Spec: Player Movement

## Current State (implemented)
- WASD / arrow keys move the player in player.js's `updatePlayer()`.
- Diagonal movement is normalized so it isn't faster than cardinal
  movement.
- Movement is resolved per-axis (move X, check collision, revert if
  blocked; then move Y the same way) — this lets the player slide
  along walls instead of fully sticking on corner clips.
- Collision uses a box smaller than the sprite, anchored at the feet
  (COLLIDER_WIDTH/HEIGHT/OFFSET constants in player.js) — standard
  top-down RPG technique so trees/buildings can visually overlap the
  player's head/shoulders without collision feeling unfair.
- Collision checks against both solid map tiles (tileConfig.js) and
  solid interactable objects (map.js) in one unified check
  (`isBoxBlocked`).
- Walk-cycle animation: 2 frames (walkA/walkB) alternate every 150ms
  while moving, idle frame shown after 400ms of no movement.
- KNOWN LIMITATION: only left/right sprite frames exist. Up/down
  movement reuses the same side-view sprite. Proper 4-direction
  frames are a future addition, not yet scheduled.

## Constraints for future changes
- Movement speed (MOVE_SPEED) and collider dimensions are named
  constants at the top of player.js — tune here, don't scatter magic
  numbers into update logic.
- Any new movement modes (e.g. sprint, mounted movement) should still
  go through the same per-axis collision resolution, not bypass it.
