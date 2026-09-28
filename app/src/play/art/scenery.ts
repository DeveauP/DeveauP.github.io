import { paint } from './pixels';

type Ctx = CanvasRenderingContext2D;

const rect = (ctx: Ctx, x: number, y: number, w: number, h: number, color: string) => {
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w, h);
};

/** Rows of evenly spaced windows. */
function windows(
  ctx: Ctx,
  opts: { x0: number; x1: number; ys: number[]; w: number; h: number; gap: number; color: string; shine?: string; skip?: [number, number] },
) {
  for (const y of opts.ys)
    for (let x = opts.x0; x + opts.w <= opts.x1; x += opts.w + opts.gap) {
      if (opts.skip && x + opts.w > opts.skip[0] && x < opts.skip[1]) continue;
      rect(ctx, x, y, opts.w, opts.h, opts.color);
      if (opts.shine) rect(ctx, x, y, opts.w, 2, opts.shine);
    }
}

function door(ctx: Ctx, cx: number, bottom: number, color: string, frame: string, h = 22) {
  rect(ctx, cx - 8, bottom - h - 2, 16, h + 2, frame);
  rect(ctx, cx - 7, bottom - h, 14, h, color);
  rect(ctx, cx + 3, bottom - h / 2, 2, 2, '#e8c547');
}

export interface Building {
  key: string;
  canvas: HTMLCanvasElement;
  /** Door centre relative to the left edge. */
  doorX: number;
  /** Where the name label goes, relative to the top-left, and its max width. */
  label?: { x: number; y: number; text: string; color: string };
}

export function buildings(): Building[] {
  const polytechnique = paint(128, 112, (c) => {
    // flag
    rect(c, 62, 0, 2, 22, '#555a66');
    rect(c, 64, 2, 5, 9, '#2a4fb5');
    rect(c, 69, 2, 5, 9, '#f4f4f4');
    rect(c, 74, 2, 5, 9, '#d23c3c');
    // pediment
    for (let i = 0; i < 16; i++) {
      const half = Math.round(i * 3.6);
      rect(c, 64 - half, 21 + i, half * 2, 1, i === 15 ? '#cdbf9c' : '#efe6cf');
    }
    rect(c, 58, 28, 12, 6, '#d9cba8');
    // entablature + frieze
    rect(c, 5, 37, 118, 10, '#e3d6b5');
    rect(c, 5, 46, 118, 1, '#c3b38f');
    // facade
    rect(c, 10, 47, 108, 65, '#eadfc4');
    // columns
    for (const x of [18, 36, 84, 102]) {
      rect(c, x - 1, 47, 10, 3, '#d9cba8');
      rect(c, x, 50, 8, 56, '#f8f2e2');
      rect(c, x + 6, 50, 2, 56, '#d6c8a6');
      rect(c, x - 1, 106, 10, 3, '#d9cba8');
    }
    // windows
    windows(c, { x0: 56, x1: 74, ys: [54], w: 16, h: 18, gap: 0, color: '#4b6a8a', shine: '#7d9cbc' });
    // steps + door
    rect(c, 40, 109, 48, 3, '#cfc3a5');
    rect(c, 46, 106, 36, 3, '#dcd1b4');
    door(c, 64, 106, '#6b3f24', '#4a2a17');
  });

  const descartes = paint(92, 78, (c) => {
    for (let i = 0; i < 16; i++) rect(c, 16 - i * 0.7, i, 60 + i * 1.4, 1, i < 2 ? '#7a8496' : '#5a6475');
    rect(c, 40, 3, 12, 10, '#e7dcc8');
    rect(c, 43, 5, 6, 7, '#4b6a8a');
    rect(c, 4, 16, 84, 62, '#e7dcc8');
    rect(c, 4, 16, 84, 2, '#cfc2a8');
    rect(c, 8, 19, 76, 8, '#d9cdb4');
    windows(c, { x0: 10, x1: 86, ys: [31, 50], w: 10, h: 12, gap: 8, color: '#4b6a8a', shine: '#7d9cbc', skip: [38, 54] });
    door(c, 46, 78, '#5a3a22', '#3d2615', 20);
  });

  const curie = paint(124, 100, (c) => {
    rect(c, 18, 4, 88, 18, '#2d3e50');
    // flask icon
    rect(c, 25, 7, 6, 2, '#e8f4f8');
    rect(c, 26, 9, 4, 4, '#e8f4f8');
    rect(c, 23, 13, 10, 2, '#e8f4f8');
    rect(c, 21, 15, 14, 4, '#7fd6c0');
    rect(c, 2, 22, 120, 4, '#c7cdd1');
    rect(c, 4, 26, 116, 74, '#eef1f2');
    windows(c, { x0: 10, x1: 118, ys: [32, 50, 68], w: 12, h: 10, gap: 4, color: '#7fb3d5', shine: '#b9dcf0', skip: [50, 74] });
    rect(c, 52, 32, 20, 40, '#dfe5e8');
    rect(c, 4, 91, 34, 9, '#4c9a4a');
    rect(c, 86, 91, 34, 9, '#4c9a4a');
    rect(c, 4, 91, 34, 2, '#6cb86a');
    rect(c, 86, 91, 34, 2, '#6cb86a');
    door(c, 62, 100, '#9fd0e8', '#5c6b73');
  });

  const consulting = paint(112, 150, (c) => {
    // tower A
    rect(c, 4, 50, 44, 100, '#3c5f8a');
    windows(c, { x0: 7, x1: 46, ys: range(54, 118, 8), w: 7, h: 5, gap: 2, color: '#8fb3dc' });
    // tower B
    rect(c, 80, 0, 2, 12, '#555a66');
    rect(c, 52, 10, 56, 140, '#34557f');
    windows(c, { x0: 55, x1: 106, ys: range(14, 118, 8), w: 7, h: 5, gap: 2, color: '#7aa3d1' });
    rect(c, 52, 10, 3, 140, '#5b86b8');
    // lobby
    rect(c, 28, 120, 56, 30, '#2f3e52');
    rect(c, 30, 124, 52, 2, '#50627a');
    windows(c, { x0: 32, x1: 82, ys: [128], w: 10, h: 20, gap: 3, color: '#cfe6f5', skip: [48, 64] });
    door(c, 56, 150, '#cfe6f5', '#1d2838');
  });

  const ubisoft = paint(132, 112, (c) => {
    rect(c, 2, 8, 128, 104, '#8a4f3d');
    for (let y = 12; y < 112; y += 6) for (let x = (y / 6) % 2 ? 4 : 10; x < 128; x += 12) rect(c, x, y, 1, 5, '#74402f');
    for (let y = 12; y < 112; y += 6) rect(c, 2, y, 128, 1, '#74402f');
    rect(c, 0, 4, 132, 5, '#5c3328');
    // big screen with a controller
    rect(c, 18, 14, 96, 42, '#1e1e28');
    rect(c, 21, 17, 90, 36, '#3a2d6b');
    rect(c, 50, 28, 32, 14, '#e8e0ff');
    rect(c, 46, 32, 4, 10, '#e8e0ff');
    rect(c, 82, 32, 4, 10, '#e8e0ff');
    rect(c, 54, 33, 6, 2, '#3a2d6b');
    rect(c, 56, 31, 2, 6, '#3a2d6b');
    rect(c, 72, 31, 3, 3, '#ff6b8a');
    rect(c, 76, 35, 3, 3, '#6bd8ff');
    windows(c, { x0: 10, x1: 126, ys: [66], w: 14, h: 12, gap: 6, color: '#ffd98a', shine: '#fff0c4', skip: [52, 80] });
    door(c, 66, 112, '#3a2d6b', '#2a1e4f');
  });

  const realityLabs = paint(124, 120, (c) => {
    for (let i = 0; i < 12; i++) rect(c, 30 - i * 2, 12 + i, 64 + i * 4, 1, '#e4e9f7');
    rect(c, 4, 24, 116, 96, '#f5f6fb');
    rect(c, 4, 24, 116, 3, '#d3dbf2');
    rect(c, 4, 60, 116, 4, '#dfe6ff');
    // headset sign
    rect(c, 40, 32, 44, 20, '#2a2d3a');
    rect(c, 44, 36, 15, 12, '#7fd6ff');
    rect(c, 65, 36, 15, 12, '#7fd6ff');
    rect(c, 44, 36, 15, 3, '#c4f0ff');
    rect(c, 65, 36, 15, 3, '#c4f0ff');
    rect(c, 36, 38, 4, 6, '#2a2d3a');
    rect(c, 84, 38, 4, 6, '#2a2d3a');
    windows(c, { x0: 10, x1: 118, ys: [72], w: 18, h: 16, gap: 6, color: '#b8c7f0', shine: '#e2e9ff', skip: [50, 74] });
    door(c, 62, 120, '#b8e6ff', '#6a7aa8');
  });

  const msl = paint(132, 144, (c) => {
    // halo + orb
    c.fillStyle = '#8c7bff33';
    c.beginPath();
    c.arc(66, 14, 14, 0, Math.PI * 2);
    c.fill();
    rect(c, 60, 6, 12, 16, '#b8a8ff');
    rect(c, 58, 8, 16, 12, '#b8a8ff');
    rect(c, 61, 8, 5, 4, '#efeaff');
    rect(c, 64, 22, 4, 8, '#3a3f5c');
    rect(c, 16, 30, 100, 114, '#1f2233');
    rect(c, 16, 30, 100, 3, '#3a3f5c');
    const glow = ['#8c7bff', '#5ad1ff', '#3a3f5c'];
    let k = 0;
    for (let y = 38; y < 110; y += 9)
      for (let x = 22; x < 110; x += 10) rect(c, x, y, 6, 5, glow[(k++ * 7) % 5 < 2 ? 0 : k % 3 === 0 ? 1 : 2]);
    rect(c, 36, 116, 60, 28, '#2a2e45');
    door(c, 66, 144, '#b8a8ff', '#15172a');
  });

  return [
    { key: 'b-polytechnique', canvas: polytechnique, doorX: 64, label: { x: 64, y: 43, text: 'ÉCOLE POLYTECHNIQUE', color: '#6b5a3a' } },
    { key: 'b-descartes', canvas: descartes, doorX: 46, label: { x: 46, y: 23, text: 'PARIS DESCARTES', color: '#5a4a32' } },
    { key: 'b-curie', canvas: curie, doorX: 62, label: { x: 69, y: 13, text: 'INSTITUT CURIE', color: '#e8f4f8' } },
    { key: 'b-consulting', canvas: consulting, doorX: 56, label: { x: 56, y: 116, text: 'QUINTEN + CONVERTEO', color: '#e8f0fa' } },
    { key: 'b-ubisoft', canvas: ubisoft, doorX: 66, label: { x: 66, y: 60, text: 'UBISOFT', color: '#ffe9b0' } },
    { key: 'b-reality-labs', canvas: realityLabs, doorX: 62, label: { x: 62, y: 56, text: 'REALITY LABS', color: '#2a2d3a' } },
    { key: 'b-msl', canvas: msl, doorX: 66, label: { x: 66, y: 112, text: 'SUPERINTELLIGENCE', color: '#cfc6ff' } },
  ];
}

function range(from: number, to: number, step: number): number[] {
  const out: number[] = [];
  for (let v = from; v <= to; v += step) out.push(v);
  return out;
}

export const ground = () =>
  paint(32, 40, (c) => {
    rect(c, 0, 0, 32, 40, '#9a6b43');
    rect(c, 0, 0, 32, 4, '#5bb450');
    rect(c, 0, 4, 32, 2, '#3f8f3a');
    for (const [x, y] of [[3, 12], [18, 9], [26, 20], [9, 26], [21, 32], [5, 36], [14, 18]]) rect(c, x, y, 2, 2, '#7d5634');
    for (const x of [2, 9, 15, 22, 28]) rect(c, x, 0, 1, 1, '#7fd06f');
  });

function hills(color: string, shade: string, amp: number, seed: number) {
  return paint(256, 80, (c) => {
    for (let x = 0; x < 256; x++) {
      const t = (x / 256) * Math.PI * 2;
      const h = Math.round(40 + amp * Math.sin(t * 2 + seed) + (amp / 2) * Math.sin(t * 3 + seed * 2));
      rect(c, x, 80 - h, 1, h, color);
      rect(c, x, 80 - h, 1, 2, shade);
    }
  });
}

export const hillsFar = () => hills('#b5dcae', '#c9e8c2', 14, 1.3);
export const hillsNear = () => hills('#86c77f', '#9dd596', 10, 4.1);

export const cloud = () =>
  paint(40, 16, (c) => {
    rect(c, 8, 6, 28, 8, '#ffffff');
    rect(c, 12, 2, 12, 6, '#ffffff');
    rect(c, 22, 0, 10, 8, '#ffffff');
    rect(c, 4, 9, 34, 6, '#ffffff');
    rect(c, 4, 14, 34, 2, '#e3eef5');
  });

export const platform = () =>
  paint(16, 8, (c) => {
    rect(c, 0, 0, 16, 8, '#8d99a6');
    rect(c, 0, 0, 16, 2, '#b8c3cc');
    rect(c, 0, 7, 16, 1, '#5f6b77');
    rect(c, 7, 2, 1, 5, '#6f7c88');
    rect(c, 0, 0, 1, 8, '#6f7c88');
  });

export const gate = () =>
  paint(14, 64, (c) => {
    rect(c, 0, 0, 3, 64, '#4a4f5c');
    rect(c, 11, 0, 3, 64, '#4a4f5c');
    rect(c, 0, 0, 3, 2, '#7a8190');
    rect(c, 11, 0, 3, 2, '#7a8190');
    for (const y of [4, 14, 24, 44, 54]) rect(c, 3, y, 8, 3, '#6b7280');
    // padlock
    rect(c, 4, 29, 6, 2, '#8a6d1f');
    rect(c, 4, 29, 1, 4, '#8a6d1f');
    rect(c, 9, 29, 1, 4, '#8a6d1f');
    rect(c, 3, 32, 8, 7, '#e0b43c');
    rect(c, 6, 34, 2, 3, '#6b5212');
  });

export const signpost = () =>
  paint(30, 28, (c) => {
    rect(c, 13, 12, 4, 16, '#7a5230');
    rect(c, 0, 0, 30, 13, '#6e4a2a');
    rect(c, 1, 1, 28, 11, '#b07a47');
    rect(c, 1, 1, 28, 2, '#c99662');
  });

export const tree = () =>
  paint(26, 42, (c) => {
    rect(c, 11, 26, 4, 16, '#7a5230');
    const canopy = (cx: number, cy: number, r: number, color: string) => {
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++) if (x * x + y * y <= r * r + r) rect(c, cx + x, cy + y, 1, 1, color);
    };
    canopy(13, 16, 12, '#3f8f3a');
    canopy(11, 13, 9, '#5bb450');
    canopy(9, 10, 4, '#7fd06f');
  });

export const bush = () =>
  paint(22, 10, (c) => {
    rect(c, 2, 3, 18, 7, '#3f8f3a');
    rect(c, 5, 0, 12, 5, '#4fa347');
    rect(c, 6, 1, 5, 2, '#7fd06f');
  });

export const finishFlag = () =>
  paint(26, 48, (c) => {
    rect(c, 2, 0, 3, 48, '#e8e8e8');
    rect(c, 5, 2, 20, 14, '#1b1a2a');
    for (let y = 0; y < 14; y += 4) for (let x = (y / 4) % 2 ? 4 : 0; x < 20; x += 8) rect(c, 5 + x, 2 + y, 4, 4, '#f4f4f4');
    rect(c, 0, 44, 7, 4, '#9aa3ad');
  });

export const sparkle = () =>
  paint(5, 5, (c) => {
    rect(c, 2, 0, 1, 5, '#fff7c2');
    rect(c, 0, 2, 5, 1, '#fff7c2');
    rect(c, 2, 2, 1, 1, '#ffffff');
  });
