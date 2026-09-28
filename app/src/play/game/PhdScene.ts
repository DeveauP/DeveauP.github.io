import Phaser from 'phaser';
import { CLONE_COLORS } from '../art/sprites';
import { cssVar, fitCamera, getCtx, type GameCtx } from './context';

/*
 * Stage 2: one cell of each subclone has strayed into another cluster.
 * The player may move exactly one cell per colour; the puzzle is solved when
 * every cell is closer to its own clone's centroid than to any other.
 */

const CLONES = 4;
const PER_CLONE = 7;
const BOARD_W = 200;
const BOARD_H = 250;
const LEGEND_H = 26;
const DESIGN_H = LEGEND_H + BOARD_H;
const CLUSTER_R = 26;
const MIN_GAP = 12;
const GRID = 5;

interface Pt {
  x: number;
  y: number;
}

interface Cell {
  clone: number;
  sprite: Phaser.GameObjects.Image;
}

interface Puzzle {
  cells: { clone: number; x: number; y: number }[];
}

/** Small seeded PRNG so a reset restores the exact same layout. */
function mulberry32(seed: number): () => number {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const dist2 = (a: Pt, b: Pt) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;

function centroids(cells: { clone: number; x: number; y: number }[]): Pt[] {
  const sum = Array.from({ length: CLONES }, () => ({ x: 0, y: 0, n: 0 }));
  for (const c of cells) {
    sum[c.clone].x += c.x;
    sum[c.clone].y += c.y;
    sum[c.clone].n++;
  }
  return sum.map((s) => ({ x: s.x / s.n, y: s.y / s.n }));
}

const nearest = (p: Pt, cents: Pt[]) => {
  let best = 0;
  for (let i = 1; i < cents.length; i++) if (dist2(p, cents[i]) < dist2(p, cents[best])) best = i;
  return best;
};

function generate(rand: () => number): Puzzle {
  for (;;) {
    const centers: Pt[] = [
      { x: 50, y: 62 },
      { x: 150, y: 62 },
      { x: 50, y: 188 },
      { x: 150, y: 188 },
    ].map((c) => ({ x: c.x + (rand() - 0.5) * 12, y: c.y + (rand() - 0.5) * 12 }));

    // Each clone sends its stray cell to a different clone's cluster (a derangement).
    let perm: number[];
    do perm = [0, 1, 2, 3].sort(() => rand() - 0.5);
    while (perm.some((v, i) => v === i));

    const cells: Puzzle['cells'] = [];
    const place = (clone: number, center: Pt, radius: number, minR = 0): boolean => {
      for (let attempt = 0; attempt < 200; attempt++) {
        const a = rand() * Math.PI * 2;
        const r = minR + Math.sqrt(rand()) * (radius - minR);
        const p = { x: center.x + Math.cos(a) * r, y: center.y + Math.sin(a) * r };
        if (cells.every((c) => dist2(c, p) >= MIN_GAP * MIN_GAP)) {
          cells.push({ clone, ...p });
          return true;
        }
      }
      return false;
    };

    let ok = true;
    for (let c = 0; c < CLONES && ok; c++)
      for (let i = 0; i < PER_CLONE - 1 && ok; i++) ok = place(c, centers[c], CLUSTER_R);
    for (let c = 0; c < CLONES && ok; c++) ok = place(c, centers[perm[c]], 16, 6);
    if (!ok) continue;

    // Valid puzzle: exactly the strays are misassigned, and sending each stray home solves it.
    const cents = centroids(cells);
    const wrong = cells.filter((c) => nearest(c, cents) !== c.clone);
    if (wrong.length !== CLONES) continue;
    const solved = cells.map((c, i) => (i >= CLONES * (PER_CLONE - 1) ? { ...c, ...centers[c.clone] } : c));
    const solvedCents = centroids(solved);
    if (solved.some((c) => nearest(c, solvedCents) !== c.clone)) continue;

    return { cells };
  }
}

export class PhdScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private puzzle!: Puzzle;
  private cells: Cell[] = [];
  private spent: boolean[] = [];
  private regions!: Phaser.GameObjects.Graphics;
  private marks!: Phaser.GameObjects.Graphics;
  private legend!: Phaser.GameObjects.Graphics;
  private legendIcons: Phaser.GameObjects.Image[] = [];
  /** Faint enlarged clone glyph under each centre cross, so centres don't rely on colour alone. */
  private centroidIcons: Phaser.GameObjects.Image[] = [];
  private done = false;
  private dragStart: Pt | null = null;
  private offBus: (() => void)[] = [];

  constructor() {
    super('phd');
  }

  create(): void {
    this.ctx = getCtx(this);
    this.puzzle = generate(mulberry32((Math.random() * 2 ** 31) | 0));
    this.cameras.main.setBackgroundColor(cssVar('--surface-2') || '#efece4');

    const board = this.add.graphics();
    board.fillStyle(0xfbfaf6, 1).fillRoundedRect(-4, LEGEND_H - 4, BOARD_W + 8, BOARD_H + 8, 8);
    board.lineStyle(1, 0xd8d2c4, 1).strokeRoundedRect(-4, LEGEND_H - 4, BOARD_W + 8, BOARD_H + 8, 8);
    this.regions = this.add.graphics();
    this.centroidIcons = CLONE_COLORS.map((_, c) => this.add.image(0, 0, `cell-${c}`).setScale(1.6).setAlpha(0.45));
    this.marks = this.add.graphics().setDepth(5);
    this.legend = this.add.graphics();

    this.legendIcons = CLONE_COLORS.map((_, c) => this.add.image(BOARD_W * ((c + 0.5) / CLONES) - 6, 11, `cell-${c}`));

    this.input.on('dragstart', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => {
      this.dragStart = { x: obj.x, y: obj.y };
      obj.setDepth(10).setScale(1.25);
    });
    this.input.on('drag', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image, x: number, y: number) => {
      obj.setPosition(Phaser.Math.Clamp(x, 4, BOARD_W - 4), Phaser.Math.Clamp(y, LEGEND_H + 4, DESIGN_H - 4));
      this.redraw();
    });
    this.input.on('dragend', (_p: Phaser.Input.Pointer, obj: Phaser.GameObjects.Image) => this.onDrop(obj));

    this.reset();
    fitCamera(this, BOARD_W, DESIGN_H);
    this.scale.on('resize', this.onResize, this);

    this.offBus = [this.ctx.bus.on('stage-reset', () => this.reset())];
    this.events.once('shutdown', () => {
      this.offBus.forEach((off) => off());
      this.scale.off('resize', this.onResize, this);
      this.input.removeAllListeners();
    });
  }

  private onResize(): void {
    fitCamera(this, BOARD_W, DESIGN_H);
  }

  private reset(): void {
    this.cells.forEach((c) => c.sprite.destroy());
    this.done = false;
    this.spent = Array(CLONES).fill(false);
    this.cells = this.puzzle.cells.map((c) => {
      const sprite = this.add.image(c.x, c.y + LEGEND_H, `cell-${c.clone}`);
      sprite.setInteractive({ hitArea: new Phaser.Geom.Circle(7.5, 7.5, 11), hitAreaCallback: Phaser.Geom.Circle.Contains, draggable: true, useHandCursor: true });
      return { clone: c.clone, sprite };
    });
    this.redraw();
  }

  private onDrop(obj: Phaser.GameObjects.Image): void {
    obj.setDepth(0).setScale(1);
    const cell = this.cells.find((c) => c.sprite === obj)!;
    const start = this.dragStart;
    this.dragStart = null;
    if (!start || dist2(start, obj) < 9) {
      // A tap, not a move: put it back and keep the move available.
      if (start) obj.setPosition(start.x, start.y);
      this.redraw();
      return;
    }

    this.spent[cell.clone] = true;
    for (const c of this.cells) if (c.clone === cell.clone) c.sprite.disableInteractive();
    this.redraw();

    if (this.isSolved()) this.win();
    else if (this.spent.every(Boolean)) this.ctx.bus.emit('stage-stuck', 'phd');
  }

  private positions() {
    return this.cells.map((c) => ({ clone: c.clone, x: c.sprite.x, y: c.sprite.y }));
  }

  private isSolved(): boolean {
    const pos = this.positions();
    const cents = centroids(pos);
    return pos.every((p) => nearest(p, cents) === p.clone);
  }

  private redraw(): void {
    const pos = this.positions();
    const cents = centroids(pos);
    const colors = CLONE_COLORS.map((c) => Phaser.Display.Color.HexStringToColor(c).color);

    // Decision regions: each grid square takes the colour of its nearest centroid.
    this.regions.clear();
    const alpha = this.done ? 0.32 : 0.16;
    for (let y = LEGEND_H; y < DESIGN_H; y += GRID)
      for (let x = 0; x < BOARD_W; x += GRID) {
        const k = nearest({ x: x + GRID / 2, y: y + GRID / 2 }, cents);
        this.regions.fillStyle(colors[k], alpha).fillRect(x, y, GRID, GRID);
      }

    this.marks.clear();
    // Centroid crosses.
    cents.forEach((c, i) => {
      this.centroidIcons[i].setPosition(c.x, c.y);
      this.marks.lineStyle(3, 0xffffff, 0.9);
      this.marks.lineBetween(c.x - 5, c.y - 5, c.x + 5, c.y + 5).lineBetween(c.x - 5, c.y + 5, c.x + 5, c.y - 5);
      this.marks.lineStyle(1.5, 0x1b1a2a, 1);
      this.marks.lineBetween(c.x - 5, c.y - 5, c.x + 5, c.y + 5).lineBetween(c.x - 5, c.y + 5, c.x + 5, c.y - 5);
    });
    // Rings around misassigned cells.
    if (!this.done) {
      this.marks.lineStyle(1.5, 0xd23c3c, 0.9);
      for (const p of pos) if (nearest(p, cents) !== p.clone) this.marks.strokeCircle(p.x, p.y, 10);
    }

    // Legend: one move token per clone (filled = available).
    this.legend.clear();
    CLONE_COLORS.forEach((_, c) => {
      const x = BOARD_W * ((c + 0.5) / CLONES) + 8;
      this.legendIcons[c].setAlpha(this.spent[c] ? 0.45 : 1);
      if (this.spent[c]) this.legend.lineStyle(1.5, 0x9a948a, 1).strokeCircle(x, 11, 4);
      else this.legend.fillStyle(colors[c], 1).fillCircle(x, 11, 4.5).lineStyle(1, 0x1b1a2a, 0.6).strokeCircle(x, 11, 4.5);
    });
  }

  private win(): void {
    this.done = true;
    this.cells.forEach((c) => c.sprite.disableInteractive());
    this.redraw();
    const cents = centroids(this.positions());
    // Gentle "convergence": every cell drifts a little toward its centroid.
    for (const c of this.cells) {
      const m = cents[c.clone];
      this.tweens.add({
        targets: c.sprite,
        x: c.sprite.x + (m.x - c.sprite.x) * 0.25,
        y: c.sprite.y + (m.y - c.sprite.y) * 0.25,
        duration: 600,
        ease: 'Sine.inOut',
      });
    }
    this.time.delayedCall(750, () => this.ctx.bus.emit('stage-won', 'phd'));
  }
}
