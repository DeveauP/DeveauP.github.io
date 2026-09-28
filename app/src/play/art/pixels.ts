/**
 * Tiny pixel-art toolkit: sprites are authored as rows of palette characters
 * ('.' = transparent) and rasterised to canvases, which Phaser registers as
 * textures and the DOM uses as data-URL previews.
 */

export type Palette = Record<string, string>;

export interface Sheet {
  canvas: HTMLCanvasElement;
  frameWidth: number;
  frameHeight: number;
  frames: number;
}

const OUTLINE = '#1b1a2a';

function assertGrid(rows: string[], label: string): void {
  const w = rows[0].length;
  rows.forEach((r, i) => {
    if (r.length !== w) throw new Error(`${label}: row ${i} is ${r.length} wide, expected ${w}`);
  });
}

/** Rasterises frames side by side; `outline` adds a 1px dark contour around each frame. */
export function rasterize(frames: string[][], pal: Palette, label: string, outline = true): Sheet {
  frames.forEach((f, i) => assertGrid(f, `${label}[${i}]`));
  const pad = outline ? 1 : 0;
  const w = frames[0][0].length;
  const h = frames[0].length;
  const fw = w + pad * 2;
  const fh = h + pad * 2;
  const canvas = document.createElement('canvas');
  canvas.width = fw * frames.length;
  canvas.height = fh;
  const ctx = canvas.getContext('2d')!;

  frames.forEach((rows, fi) => {
    const ox = fi * fw + pad;
    const solid = (x: number, y: number) => y >= 0 && y < h && x >= 0 && x < w && rows[y][x] !== '.';
    if (outline) {
      ctx.fillStyle = OUTLINE;
      for (let y = -1; y <= h; y++)
        for (let x = -1; x <= w; x++)
          if (!solid(x, y) && (solid(x - 1, y) || solid(x + 1, y) || solid(x, y - 1) || solid(x, y + 1)))
            ctx.fillRect(ox + x, pad + y, 1, 1);
    }
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const c = rows[y][x];
        if (c === '.') continue;
        const color = pal[c];
        if (!color) throw new Error(`${label}: no palette entry for '${c}'`);
        ctx.fillStyle = color;
        ctx.fillRect(ox + x, pad + y, 1, 1);
      }
  });
  return { canvas, frameWidth: fw, frameHeight: fh, frames: frames.length };
}

/** Upscaled PNG data URL of one frame, for crisp DOM previews. */
export function frameDataUrl(sheet: Sheet, frame = 0, scale = 4): string {
  const c = document.createElement('canvas');
  c.width = sheet.frameWidth * scale;
  c.height = sheet.frameHeight * scale;
  const ctx = c.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(
    sheet.canvas,
    frame * sheet.frameWidth,
    0,
    sheet.frameWidth,
    sheet.frameHeight,
    0,
    0,
    c.width,
    c.height,
  );
  return c.toDataURL();
}

/** Creates a canvas and hands its 2D context to `draw` (for scenery drawn with rectangles). */
export function paint(w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingEnabled = false;
  draw(ctx);
  return canvas;
}
