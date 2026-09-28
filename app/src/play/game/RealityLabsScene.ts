import Phaser from 'phaser';
import { getLang } from '../../i18n';
import { fitCamera, getCtx, type GameCtx } from './context';

/*
 * Stage 5a: a nod to Audio2Expression. The avatar's mouth is driven by two
 * parameters (jaw open, lip width). Match a sequence of target visemes by
 * dragging on the face or with the arrow keys.
 */

const W = 200;
const H = 262;
const FACE = { x: 100, y: 138, rx: 54, ry: 66 };
const MOUTH_Y = 172;
const HOLD_MS = 700;

interface Pose {
  open: number; // 0..1
  width: number; // -1 (rounded) .. 1 (wide)
}

const TARGETS: (Pose & { label: string; threshold: number })[] = [
  { label: 'A', open: 0.85, width: 0.15, threshold: 0.86 },
  { label: 'E', open: 0.22, width: 0.85, threshold: 0.86 },
  { label: 'M', open: 0, width: 0, threshold: 0.86 },
  { label: 'O', open: 0.65, width: -0.75, threshold: 0.92 },
];

const NEUTRAL: Pose = { open: 0.12, width: 0.25 };

function score(a: Pose, b: Pose): number {
  const d = Math.hypot(a.open - b.open, (a.width - b.width) / 2);
  return Phaser.Math.Clamp(1 - d / 0.45, 0, 1);
}

/** Mouth outline as a superellipse: round for "O", flatter and lifted for wide shapes. */
function mouthPoints(p: Pose, cx: number, cy: number, s = 1): { x: number; y: number }[] {
  const hw = (17 + 10 * p.width) * s;
  const upper = (1.2 + p.open * 9) * s;
  const lower = (1.2 + p.open * 20) * s;
  const n = 2 + 2.2 * Math.max(0, p.width);
  const lift = 4 * Math.max(0, p.width) * s;
  const pts: { x: number; y: number }[] = [];
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * Math.PI * 2;
    const c = Math.cos(a);
    const sn = Math.sin(a);
    const x = cx + hw * Math.sign(c) * Math.abs(c) ** (2 / n);
    const y = cy + (sn < 0 ? upper : lower) * Math.sign(sn) * Math.abs(sn) ** (2 / n) - lift * Math.abs(c) ** 4;
    pts.push({ x, y });
  }
  return pts;
}

/** Graphics point methods only read x/y; their typings ask for Vector2. */
const V = (pts: { x: number; y: number }[]) => pts as unknown as Phaser.Math.Vector2[];

export class RealityLabsScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private pose: Pose = { ...NEUTRAL };
  private target = 0;
  private heldMs = 0;
  private done = false;
  private face!: Phaser.GameObjects.Graphics;
  private card!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private cardLabel!: Phaser.GameObjects.Text;
  private matchText!: Phaser.GameObjects.Text;
  private drag: { x: number; y: number; pose: Pose } | null = null;
  private blinkAt = 0;
  private flash = 0;
  private keys!: Record<'up' | 'down' | 'left' | 'right', Phaser.Input.Keyboard.Key>;
  private offBus: (() => void)[] = [];

  constructor() {
    super('reality-labs');
  }

  create(): void {
    this.ctx = getCtx(this);
    this.cameras.main.setBackgroundColor('#e9eefb');
    const res = Math.max(3, Math.ceil(this.cameras.main.zoom) + 1);
    const bg = this.add.graphics();
    bg.fillStyle(0xf7f9ff, 1).fillRoundedRect(-4, -4, W + 8, H + 8, 8);
    bg.lineStyle(1, 0xdfe6f7, 1);
    for (let y = 0; y < H; y += 6) bg.lineBetween(0, y, W, y);
    // Capture-frame corner brackets.
    bg.lineStyle(2, 0x6a7aa8, 1);
    const [bx0, by0, bx1, by1] = [FACE.x - 72, FACE.y - 86, FACE.x + 72, FACE.y + 92];
    for (const [x, y, dx, dy] of [[bx0, by0, 1, 1], [bx1, by0, -1, 1], [bx0, by1, 1, -1], [bx1, by1, -1, -1]])
      bg.lineBetween(x, y, x + dx * 12, y).lineBetween(x, y, x, y + dy * 12);
    bg.lineStyle(2, 0xb8c7f0, 1).strokeRoundedRect(-4, -4, W + 8, H + 8, 8);

    this.face = this.add.graphics();
    this.card = this.add.graphics();
    this.hud = this.add.graphics();
    this.cardLabel = this.add
      .text(35, 7, '', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#2a2d3a' })
      .setOrigin(0.5, 0)
      .setResolution(res);
    this.matchText = this.add
      .text(W / 2, 236, '', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#2a2d3a' })
      .setOrigin(0.5, 1)
      .setResolution(res);

    // Drag anywhere on the face: vertical opens the jaw, horizontal widens the lips.
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      if (this.done) return;
      this.drag = { x: p.worldX, y: p.worldY, pose: { ...this.pose } };
    });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (!this.drag || !p.isDown) return;
      this.pose.open = Phaser.Math.Clamp(this.drag.pose.open + (p.worldY - this.drag.y) / 70, 0, 1);
      this.pose.width = Phaser.Math.Clamp(this.drag.pose.width + (p.worldX - this.drag.x) / 45, -1, 1);
    });
    this.input.on('pointerup', () => (this.drag = null));

    const kb = this.input.keyboard!;
    this.keys = { up: kb.addKey('UP', false), down: kb.addKey('DOWN', false), left: kb.addKey('LEFT', false), right: kb.addKey('RIGHT', false) };

    this.reset();
    fitCamera(this, W, H);
    this.scale.on('resize', this.onResize, this);
    this.offBus = [this.ctx.bus.on('stage-reset', () => this.reset())];
    this.events.once('shutdown', () => {
      this.offBus.forEach((off) => off());
      this.scale.off('resize', this.onResize, this);
      this.input.removeAllListeners();
    });
  }

  private onResize(): void {
    fitCamera(this, W, H);
  }

  private reset(): void {
    this.pose = { ...NEUTRAL };
    this.target = 0;
    this.heldMs = 0;
    this.done = false;
    this.flash = 0;
  }

  /* ---------- loop ---------- */

  update(time: number, delta: number): void {
    const dt = delta / 1000;
    if (!this.done) {
      const k = this.keys;
      if (k.up.isDown) this.pose.open = Math.max(0, this.pose.open - dt * 0.9);
      if (k.down.isDown) this.pose.open = Math.min(1, this.pose.open + dt * 0.9);
      if (k.left.isDown) this.pose.width = Math.max(-1, this.pose.width - dt * 1.6);
      if (k.right.isDown) this.pose.width = Math.min(1, this.pose.width + dt * 1.6);

      const t = TARGETS[this.target];
      const s = score(this.pose, t);
      this.heldMs = s >= t.threshold ? this.heldMs + delta : Math.max(0, this.heldMs - delta * 2);
      if (this.heldMs >= HOLD_MS) this.nextTarget();
    }
    this.flash = Math.max(0, this.flash - dt * 2);
    if (time > this.blinkAt + 3200) this.blinkAt = time;
    this.draw(time);
  }

  private nextTarget(): void {
    this.flash = 1;
    this.heldMs = 0;
    if (this.target === TARGETS.length - 1) {
      this.done = true;
      this.cameras.main.flash(250, 184, 230, 255);
      this.time.delayedCall(900, () => this.ctx.bus.emit('stage-won', 'reality-labs'));
      return;
    }
    this.target++;
  }

  /* ---------- drawing ---------- */

  private drawFace(g: Phaser.GameObjects.Graphics, pose: Pose, cx: number, cy: number, s: number, time: number, ghost?: Pose): void {
    const jaw = pose.open * 8 * s;
    // Neck + shoulders (main avatar only; the target thumbnail is just the head).
    if (s === 1) {
      g.fillStyle(0xd9a27c, 1).fillRect(cx - 14, cy + 50, 28, 30);
      g.fillStyle(0x3b5f99, 1).fillEllipse(cx, cy + 96, 150, 50);
    }
    // Head (the chin drops with the jaw).
    g.fillStyle(0xf2c9a0, 1).fillEllipse(cx, cy + jaw / 2, FACE.rx * 2 * s, (FACE.ry * 2 + jaw) * s);
    g.fillStyle(0xe8b88e, 1).fillEllipse(cx - FACE.rx * s + 3 * s, cy + 6 * s, 6 * s, 16 * s).fillEllipse(cx + FACE.rx * s - 3 * s, cy + 6 * s, 6 * s, 16 * s);
    // Hair.
    g.fillStyle(0x4a3222, 1).fillEllipse(cx, cy - 48 * s, 104 * s, 44 * s).fillRect(cx - 52 * s, cy - 50 * s, 10 * s, 36 * s).fillRect(cx + 42 * s, cy - 50 * s, 10 * s, 30 * s);
    // Eyes (blink every few seconds) and brows that rise with the jaw.
    const blink = time - this.blinkAt < 120 && s === 1;
    for (const dx of [-20, 20]) {
      const ex = cx + dx * s;
      const ey = cy - 8 * s;
      if (blink) g.fillStyle(0x2a2d3a, 1).fillRect(ex - 7 * s, ey, 14 * s, 1.5 * s);
      else {
        g.fillStyle(0xffffff, 1).fillEllipse(ex, ey, 15 * s, 10 * s);
        g.fillStyle(0x3b2a20, 1).fillCircle(ex + 1 * s, ey, 3.4 * s);
        g.fillStyle(0xffffff, 1).fillCircle(ex + 2 * s, ey - 1.2 * s, 1 * s);
      }
      const lift = (pose.open * 4 + Math.max(0, -pose.width) * 2) * s;
      g.lineStyle(2.5 * s, 0x4a3222, 1).lineBetween(ex - 8 * s, ey - 9 * s - lift, ex + 8 * s, ey - 10 * s - lift);
    }
    // Nose.
    g.lineStyle(1.5 * s, 0xd9a27c, 1).beginPath().moveTo(cx, cy).lineTo(cx - 3 * s, cy + 14 * s).lineTo(cx + 3 * s, cy + 15 * s).strokePath();

    const my = cy + (MOUTH_Y - FACE.y) * s + jaw * 0.3;
    const pts = mouthPoints(pose, cx, my, s);
    const top = Math.min(...pts.map((p) => p.y));
    const bottom = Math.max(...pts.map((p) => p.y));
    if (pose.open > 0.04) {
      g.fillStyle(0x5a1e2c, 1).fillPoints(V(pts), true);
      // Teeth and tongue: the mouth polygon clipped to a horizontal band (valid since it is convex).
      if (pose.open > 0.15) g.fillStyle(0xfafafa, 1).fillPoints(V(pts.map((p) => ({ x: p.x, y: Math.min(p.y, top + 3.2 * s) }))), true);
      if (pose.open > 0.3) g.fillStyle(0xd9667a, 1).fillPoints(V(pts.map((p) => ({ x: p.x, y: Math.max(p.y, bottom - (bottom - top) * 0.3) }))), true);
    }
    g.lineStyle(3.2 * s, 0xc2616b, 1).strokePoints(V(pts), true, true);

    if (ghost) {
      g.lineStyle(1.2, 0x3a7bff, 0.55).strokePoints(V(mouthPoints(ghost, cx, cy + (MOUTH_Y - FACE.y) * s + ghost.open * 8 * 0.3, s)), true, true);
      // Tracking landmarks on the lips and chin.
      const left = pts.reduce((a, b) => (b.x < a.x ? b : a));
      const right = pts.reduce((a, b) => (b.x > a.x ? b : a));
      g.fillStyle(0x19c3ff, 1);
      for (const p of [left, right, { x: cx, y: top }, { x: cx, y: bottom }, { x: cx, y: cy + FACE.ry + jaw }]) g.fillCircle(p.x, p.y, 1.6);
    }
  }

  private draw(time: number): void {
    const t = TARGETS[this.target];
    this.face.clear();
    this.drawFace(this.face, this.pose, FACE.x, FACE.y, 1, time, this.done ? undefined : t);

    // Target card.
    const c = this.card.clear();
    c.fillStyle(0xffffff, 1).fillRoundedRect(4, 4, 62, 66, 6);
    c.lineStyle(1.5, this.flash > 0 ? 0x7ee08a : 0xb8c7f0, 1).strokeRoundedRect(4, 4, 62, 66, 6);
    this.drawFace(c, t, 35, 40, 0.3, time);
    this.cardLabel.setText(`${getLang() === 'fr' ? 'CIBLE' : 'TARGET'} “${t.label}”`);

    // Progress dots and match meter.
    const h = this.hud.clear();
    TARGETS.forEach((_, i) => {
      const x = W - 10 - (TARGETS.length - 1 - i) * 12;
      if (i < this.target || this.done) h.fillStyle(0x7ee08a, 1).fillCircle(x, 12, 4);
      else if (i === this.target) h.lineStyle(2, 0x3a7bff, 1).strokeCircle(x, 12, 4);
      else h.fillStyle(0xd3dbf2, 1).fillCircle(x, 12, 4);
    });

    const s = this.done ? 1 : score(this.pose, t);
    const ok = s >= t.threshold;
    // Panel behind the meter, over the avatar's shoulders.
    h.fillStyle(0xf7f9ff, 0.94).fillRoundedRect(8, 224, W - 16, 32, 8);
    h.lineStyle(1, 0xdfe6f7, 1).strokeRoundedRect(8, 224, W - 16, 32, 8);
    h.fillStyle(0xdfe6f7, 1).fillRoundedRect(20, 240, W - 40, 6, 3);
    h.fillStyle(ok ? 0x49c46a : 0x3a7bff, 1).fillRoundedRect(20, 240, Math.max(4, (W - 40) * s), 6, 3);
    h.fillStyle(0x2a2d3a, 0.5).fillRect(20 + (W - 40) * t.threshold, 238, 1, 10);
    const fr = getLang() === 'fr';
    this.matchText.setText(this.done ? (fr ? 'PARFAIT !' : 'PERFECT!') : `${fr ? 'CORRESPONDANCE' : 'MATCH'} ${Math.round(s * 100)}%`);
  }
}
