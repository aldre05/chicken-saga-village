// player.js — player position, movement, collision, and animation state.
// Movement is resolved per-axis (move X, check collision, revert if
// blocked; then move Y the same way) so the player can slide along
// walls instead of getting fully stopped by a corner clip.

import { TILE_SOLID, RENDERED_TILE_SIZE } from './tileConfig.js';

export const PLAYER_PIXEL_SIZE = 3;
export const PLAYER_SPRITE_SIZE = 14 * PLAYER_PIXEL_SIZE; // 42px rendered

// Collision box is smaller than the sprite and anchored at the feet —
// standard top-down RPG trick so trees/buildings can visually overlap
// the player's head/shoulders a bit without feeling like bad collision.
const COLLIDER_WIDTH = 24;
const COLLIDER_HEIGHT = 16;
const COLLIDER_OFFSET_X = (PLAYER_SPRITE_SIZE - COLLIDER_WIDTH) / 2;
const COLLIDER_OFFSET_Y = PLAYER_SPRITE_SIZE - COLLIDER_HEIGHT - 4;

const MOVE_SPEED = 140; // px/sec
const WALK_FRAME_MS = 150;

export function createPlayer(startX, startY) {
  return {
    x: startX,
    y: startY,
    facingLeft: false,
    isMoving: false,
    frameName: 'idle',
    walkFrameToggle: false,
    lastFrameSwitch: 0
  };
}

function getColliderBox(player) {
  return {
    x: player.x + COLLIDER_OFFSET_X,
    y: player.y + COLLIDER_OFFSET_Y,
    width: COLLIDER_WIDTH,
    height: COLLIDER_HEIGHT
  };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x &&
         a.y < b.y + b.height && a.y + a.height > b.y;
}

function isBoxBlocked(box, mapGrid, interactables) {
  const startCol = Math.floor(box.x / RENDERED_TILE_SIZE);
  const endCol = Math.floor((box.x + box.width) / RENDERED_TILE_SIZE);
  const startRow = Math.floor(box.y / RENDERED_TILE_SIZE);
  const endRow = Math.floor((box.y + box.height) / RENDERED_TILE_SIZE);

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const row = mapGrid[r];
      if (!row) return true; // out of bounds
      const tile = row[c];
      if (tile === undefined) return true;
      if (TILE_SOLID[tile]) return true;
    }
  }

  for (const obj of interactables) {
    if (obj.solid && rectsOverlap(box, obj)) return true;
  }

  return false;
}

export function updatePlayer(player, keys, dt, now, mapGrid, interactables) {
  let dx = 0, dy = 0;
  if (keys.has('ArrowUp') || keys.has('KeyW')) dy -= 1;
  if (keys.has('ArrowDown') || keys.has('KeyS')) dy += 1;
  if (keys.has('ArrowLeft') || keys.has('KeyA')) dx -= 1;
  if (keys.has('ArrowRight') || keys.has('KeyD')) dx += 1;

  const moving = dx !== 0 || dy !== 0;
  player.isMoving = moving;

  if (moving) {
    // Normalize diagonal movement so it isn't faster than cardinal movement.
    const len = Math.sqrt(dx * dx + dy * dy);
    const moveX = (dx / len) * MOVE_SPEED * dt;
    const moveY = (dy / len) * MOVE_SPEED * dt;

    if (dx !== 0) player.facingLeft = dx < 0;

    // Move X, revert if blocked.
    const prevX = player.x;
    player.x += moveX;
    if (isBoxBlocked(getColliderBox(player), mapGrid, interactables)) {
      player.x = prevX;
    }

    // Move Y, revert if blocked.
    const prevY = player.y;
    player.y += moveY;
    if (isBoxBlocked(getColliderBox(player), mapGrid, interactables)) {
      player.y = prevY;
    }
  }

  // Walk-cycle animation state.
  if (moving) {
    if (now - player.lastFrameSwitch > WALK_FRAME_MS) {
      player.walkFrameToggle = !player.walkFrameToggle;
      player.frameName = player.walkFrameToggle ? 'walkA' : 'walkB';
      player.lastFrameSwitch = now;
    }
  } else if (now - player.lastFrameSwitch > 400) {
    player.frameName = 'idle';
  }
}

export function getPlayerCenter(player) {
  return {
    x: player.x + PLAYER_SPRITE_SIZE / 2,
    y: player.y + PLAYER_SPRITE_SIZE / 2
  };
}
