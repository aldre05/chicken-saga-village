// camera.js — tracks a target position and clamps to world bounds so
// the viewport never shows past the edge of the map.

export function createCamera(worldWidth, worldHeight, viewportWidth, viewportHeight) {
  return {
    x: 0,
    y: 0,
    worldWidth,
    worldHeight,
    viewportWidth,
    viewportHeight,

    follow(targetX, targetY) {
      this.x = clamp(targetX - this.viewportWidth / 2, 0, Math.max(0, this.worldWidth - this.viewportWidth));
      this.y = clamp(targetY - this.viewportHeight / 2, 0, Math.max(0, this.worldHeight - this.viewportHeight));
    }
  };
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
