// spriteRenderer.js — draws pixel-art sprite rows onto a canvas 2D
// context at a given world position, with optional horizontal flip.

export function drawPixelArtAt(ctx, rows, colorMap, x, y, pixelSize, flipX = false) {
  const height = rows.length;
  const width = rows[0].length;

  for (let ry = 0; ry < height; ry++) {
    const row = rows[ry];
    for (let rx = 0; rx < width; rx++) {
      const ch = row[rx];
      const color = colorMap[ch];
      if (!color) continue;
      const drawX = flipX ? x + (width - 1 - rx) * pixelSize : x + rx * pixelSize;
      const drawY = y + ry * pixelSize;
      ctx.fillStyle = color;
      ctx.fillRect(drawX, drawY, pixelSize, pixelSize);
    }
  }
}
