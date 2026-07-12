// render.js — draws one frame: visible tiles (culled to viewport),
// interactable objects, and the player sprite, all in world space
// (camera translation applied once per frame).

import { RENDERED_TILE_SIZE, TILE_COLORS } from './tileConfig.js';
import { CHICKEN_FRAMES, PALETTE } from './sprites.js';
import { drawPixelArtAt } from './spriteRenderer.js';
import { PLAYER_PIXEL_SIZE } from './player.js';

export function renderFrame(ctx, viewportWidth, viewportHeight, camera, player, mapGrid, interactables, nearestInteractable, buildingLevels) {
  ctx.clearRect(0, 0, viewportWidth, viewportHeight);
  ctx.save();
  ctx.translate(-camera.x, -camera.y);

  drawVisibleTiles(ctx, camera, viewportWidth, viewportHeight, mapGrid);
  drawInteractables(ctx, interactables, nearestInteractable, buildingLevels);
  drawPlayer(ctx, player);

  ctx.restore();
}

function drawVisibleTiles(ctx, camera, viewportWidth, viewportHeight, mapGrid) {
  const startCol = Math.max(0, Math.floor(camera.x / RENDERED_TILE_SIZE));
  const endCol = Math.min(mapGrid[0].length - 1, Math.ceil((camera.x + viewportWidth) / RENDERED_TILE_SIZE));
  const startRow = Math.max(0, Math.floor(camera.y / RENDERED_TILE_SIZE));
  const endRow = Math.min(mapGrid.length - 1, Math.ceil((camera.y + viewportHeight) / RENDERED_TILE_SIZE));

  for (let r = startRow; r <= endRow; r++) {
    for (let c = startCol; c <= endCol; c++) {
      const tile = mapGrid[r][c];
      ctx.fillStyle = TILE_COLORS[tile] || '#000';
      ctx.fillRect(c * RENDERED_TILE_SIZE, r * RENDERED_TILE_SIZE, RENDERED_TILE_SIZE, RENDERED_TILE_SIZE);
    }
  }
}

function drawInteractables(ctx, interactables, nearestInteractable, buildingLevels) {
  for (const obj of interactables) {
    ctx.fillStyle = obj.color;
    ctx.fillRect(obj.x, obj.y, obj.width, obj.height);

    if (obj === nearestInteractable) {
      ctx.strokeStyle = '#f4ce6e';
      ctx.lineWidth = 3;
      ctx.strokeRect(obj.x - 2, obj.y - 2, obj.width + 4, obj.height + 4);
    }

    const level = buildingLevels && buildingLevels[obj.id];
    const label = level ? `${obj.name} (Lvl ${level})` : obj.name;

    ctx.fillStyle = '#f2e8d2';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(label, obj.x + obj.width / 2, obj.y - 6);
  }
}

function drawPlayer(ctx, player) {
  drawPixelArtAt(ctx, CHICKEN_FRAMES[player.frameName], PALETTE, player.x, player.y, PLAYER_PIXEL_SIZE, player.facingLeft);
}
