import Phaser from 'phaser';
import { getLang, type L } from '../../i18n';
import { fitCamera, getCtx, type GameCtx } from './context';

/*
 * Stage 4: a tiny factory. An HR-data source feeds packets along belts to
 * three machines whose gauges fill with each packet and leak over time.
 * Two routers can be rotated; each sends packets round-robin to its open
 * sides except the one they came from. Exactly one setting keeps every gauge
 * in its green band: hold it for a few seconds to win.
 */

const TILE = 20;
const OX = 10;
const OY = 18;
const W = 160;
const H = 282;
const SPEED = 45;
const EMIT_EVERY = 1 / 6;
const GAIN = 0.1;
const BAND: [number, number] = [0.5, 0.78];
const HOLD_SECONDS = 3;

type Side = 'N' | 'E' | 'S' | 'W';
const SIDES: Side[] = ['N', 'E', 'S', 'W'];
type NodeId = 'A' | 'B' | 'team' | 'gender' | 'tech' | 'bin1' | 'bin2';

const at = (c: number, r: number) => ({ x: OX + c * TILE + TILE / 2, y: OY + r * TILE + TILE / 2 });

/** Belt routes as polylines of tile coordinates, ending at a node. */
const SOURCE_ROUTE = { pts: [at(3, 0), at(3, 2)], to: 'A' as NodeId };
/** `good` is the closed side of the intended solution (used by tests and as documentation). */
export const ROUTERS: Record<'A' | 'B', { tile: [number, number]; input: Side; outs: Partial<Record<Side, { pts: { x: number; y: number }[]; to: NodeId }>>; good: Side }> = {
  A: {
    tile: [3, 2],
    input: 'N',
    good: 'S',
    outs: {
      W: { pts: [at(3, 2), at(1, 2), at(1, 8)], to: 'team' },
      E: { pts: [at(3, 2), at(5, 2), at(5, 4)], to: 'B' },
      S: { pts: [at(3, 2), at(3, 3)], to: 'bin1' },
    },
  },
  B: {
    tile: [5, 4],
    input: 'N',
    good: 'E',
    outs: {
      W: { pts: [at(5, 4), at(3, 4), at(3, 8)], to: 'gender' },
      S: { pts: [at(5, 4), at(5, 8)], to: 'tech' },
      E: { pts: [at(5, 4), at(6, 4)], to: 'bin2' },
    },
  },
};

interface Sink {
  id: 'team' | 'gender' | 'tech';
  col: number;
  /** Leak rate: steady level = inflow × GAIN / leak, tuned to ~0.6 when the flow is right. */
  leak: number;
  label: L;
  color: number;
  level: number;
}

const SINK_DEFS: Omit<Sink, 'level'>[] = [
  { id: 'team', col: 1, leak: 0.5, color: 0x7fd6ff, label: { en: 'Team\nmanagement', fr: 'Management\nd’équipe' } },
  { id: 'gender', col: 3, leak: 0.25, color: 0xff9ec4, label: { en: 'Gender\nequality', fr: 'Égalité\nfemmes-hommes' } },
  { id: 'tech', col: 5, leak: 0.25, color: 0xa8e6a1, label: { en: 'Technical\nsupervision', fr: 'Supervision\ntechnique' } },
];

const PACKET_COLORS = [0xffd98a, 0x7fd6ff, 0xff9ec4, 0xa8e6a1, 0xc7b8ff];

interface Packet {
  dot: Phaser.GameObjects.Rectangle;
  pts: { x: number; y: number }[];
  seg: number;
  t: number;
  to: NodeId;
}

const VEC: Record<Side, [number, number]> = { N: [0, -1], E: [1, 0], S: [0, 1], W: [-1, 0] };

export class UbisoftScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private closed: Record<'A' | 'B', Side> = { A: 'W', B: 'N' };
  private rr: Record<'A' | 'B', number> = { A: 0, B: 0 };
  private routerGfx: Record<'A' | 'B', Phaser.GameObjects.Graphics> = {} as never;
  private routerRing: Record<'A' | 'B', Phaser.GameObjects.Arc> = {} as never;
  private sinks: Sink[] = [];
  private gauges!: Phaser.GameObjects.Graphics;
  private timerBar!: Phaser.GameObjects.Graphics;
  private packets: Packet[] = [];
  private emitClock = 0;
  private held = 0;
  private done = false;
  private offBus: (() => void)[] = [];

  constructor() {
    super('ubisoft');
  }

  create(): void {
    this.ctx = getCtx(this);
    this.cameras.main.setBackgroundColor('#1c1730');
    const res = Math.max(3, Math.ceil(this.cameras.main.zoom) + 1);

    const bg = this.add.graphics();
    bg.fillStyle(0x241d3d, 1).fillRoundedRect(-4, -4, W + 8, H + 8, 8);
    bg.lineStyle(1, 0x2f2750, 1);
    for (let c = 0; c <= 7; c++) bg.lineBetween(OX + c * TILE, OY, OX + c * TILE, OY + 9 * TILE);
    for (let r = 0; r <= 9; r++) bg.lineBetween(OX, OY + r * TILE, OX + 7 * TILE, OY + r * TILE);
    bg.lineStyle(2, 0x5a4d8a, 1).strokeRoundedRect(-4, -4, W + 8, H + 8, 8);

    // Belts.
    const belts = this.add.graphics();
    const routes = [SOURCE_ROUTE, ...Object.values(ROUTERS).flatMap((r) => Object.values(r.outs))];
    for (const route of routes) this.drawBelt(belts, route!.pts);

    this.drawSource();
    this.drawBin(6, 4);
    this.drawBin(3, 3);

    for (const def of SINK_DEFS) {
      const { x, y } = at(def.col, 8);
      const g = this.add.graphics();
      g.fillStyle(0x3b3160, 1).fillRoundedRect(x - 10, y - 9, 20, 18, 4);
      g.lineStyle(1.5, def.color, 1).strokeRoundedRect(x - 10, y - 9, 20, 18, 4);
      this.drawSinkIcon(g, def.id, x, y, def.color);
      this.add
        .text(x, OY + 9 * TILE + 58, def.label[getLang()], {
          fontFamily: 'Inter Variable, system-ui, sans-serif',
          fontSize: '6.5px',
          fontStyle: '600',
          color: '#e6e0ff',
          align: 'center',
          lineSpacing: -1,
        })
        .setOrigin(0.5, 0)
        .setResolution(res);
    }
    this.gauges = this.add.graphics();

    this.add
      .text(OX, 4, getLang() === 'fr' ? 'ÉQUILIBRE' : 'BALANCE', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#e6e0ff' })
      .setResolution(res);
    this.timerBar = this.add.graphics();

    for (const id of ['A', 'B'] as const) {
      const { x, y } = at(...ROUTERS[id].tile);
      this.routerRing[id] = this.add.circle(x, y, 12).setStrokeStyle(1.5, 0xffd98a, 1).setDepth(4);
      this.tweens.add({ targets: this.routerRing[id], scale: 1.25, alpha: 0, duration: 900, repeat: -1 });
      this.routerGfx[id] = this.add.graphics({ x, y }).setDepth(5);
      const hit = this.add.zone(x, y, TILE + 8, TILE + 8).setInteractive({ useHandCursor: true });
      hit.on('pointerdown', () => this.rotate(id));
    }

    this.reset();
    fitCamera(this, W, H);
    this.scale.on('resize', this.onResize, this);
    const kb = this.input.keyboard!;
    kb.on('keydown-ONE', () => this.rotate('A'));
    kb.on('keydown-TWO', () => this.rotate('B'));
    this.offBus = [this.ctx.bus.on('stage-reset', () => this.reset())];
    this.events.once('shutdown', () => {
      this.offBus.forEach((off) => off());
      this.scale.off('resize', this.onResize, this);
      kb.removeAllListeners();
    });
  }

  private onResize(): void {
    fitCamera(this, W, H);
  }

  private reset(): void {
    this.packets.forEach((p) => p.dot.destroy());
    this.packets = [];
    // Start from a wrong setting on both routers.
    this.closed = { A: Phaser.Utils.Array.GetRandom(['N', 'W', 'E'] as Side[]), B: Phaser.Utils.Array.GetRandom(['N', 'W', 'S'] as Side[]) };
    this.rr = { A: 0, B: 0 };
    this.sinks = SINK_DEFS.map((d) => ({ ...d, level: 0.25 }));
    this.held = 0;
    this.done = false;
    this.emitClock = 0;
    for (const id of ['A', 'B'] as const) {
      this.drawRouter(id);
      this.routerRing[id].setVisible(true);
    }
  }

  /* ---------- drawing ---------- */

  private drawBelt(g: Phaser.GameObjects.Graphics, pts: { x: number; y: number }[]): void {
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const horizontal = a.y === b.y;
      const x0 = Math.min(a.x, b.x) - (horizontal ? 0 : 5);
      const y0 = Math.min(a.y, b.y) - (horizontal ? 5 : 0);
      const w = horizontal ? Math.abs(b.x - a.x) : 10;
      const h = horizontal ? 10 : Math.abs(b.y - a.y);
      g.fillStyle(0x3b3160, 1).fillRect(x0, y0, w, h);
      g.fillStyle(0x4a3f78, 1).fillRect(x0 + (horizontal ? 0 : 1), y0 + (horizontal ? 1 : 0), horizontal ? w : 8, horizontal ? 8 : h);
      // Chevrons showing the flow direction.
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      const dx = (b.x - a.x) / len;
      const dy = (b.y - a.y) / len;
      g.lineStyle(1, 0x6d5fa6, 1);
      for (let d = 6; d < len - 2; d += 8) {
        const cx = a.x + dx * d;
        const cy = a.y + dy * d;
        g.lineBetween(cx - dx * 2 - dy * 3, cy - dy * 2 + dx * 3, cx, cy);
        g.lineBetween(cx - dx * 2 + dy * 3, cy - dy * 2 - dx * 3, cx, cy);
      }
    }
  }

  private drawSource(): void {
    const { x, y } = at(3, 0);
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x5a4d8a, 1).fillRoundedRect(x - 11, y - 9, 22, 18, 4);
    g.fillStyle(0xffd98a, 1);
    // Stack of records.
    for (let i = 0; i < 3; i++) g.fillRect(x - 6, y - 5 + i * 4, 12, 2);
  }

  private drawBin(c: number, r: number): void {
    const { x, y } = at(c, r);
    const g = this.add.graphics().setDepth(3);
    g.fillStyle(0x2a2440, 1).fillRoundedRect(x - 9, y - 9, 18, 18, 4);
    g.lineStyle(1, 0x6b6190, 1).strokeRoundedRect(x - 9, y - 9, 18, 18, 4);
    this.add.text(x, y, 'zZ', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#8f86b8' }).setOrigin(0.5).setDepth(3).setResolution(4);
  }

  private drawSinkIcon(g: Phaser.GameObjects.Graphics, id: Sink['id'], x: number, y: number, color: number): void {
    g.fillStyle(color, 1);
    if (id === 'team') {
      for (const dx of [-5, 0, 5]) g.fillCircle(x + dx, y - 3, 2).fillRect(x + dx - 2, y, 4, 4);
    } else if (id === 'gender') {
      // Scales.
      g.fillRect(x - 0.5, y - 5, 1, 9).fillRect(x - 6, y - 4, 12, 1);
      g.fillTriangle(x - 7, y + 1, x - 3, y + 1, x - 5, y - 3).fillTriangle(x + 3, y + 1, x + 7, y + 1, x + 5, y - 3);
      g.fillRect(x - 3, y + 4, 6, 1);
    } else {
      // Gear.
      g.fillCircle(x, y, 4);
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2;
        g.fillRect(x + Math.cos(a) * 5 - 1, y + Math.sin(a) * 5 - 1, 2, 2);
      }
      g.fillStyle(0x3b3160, 1).fillCircle(x, y, 1.5);
    }
  }

  private drawRouter(id: 'A' | 'B'): void {
    const g = this.routerGfx[id].clear();
    g.fillStyle(0x2a2440, 1).fillRoundedRect(-10, -10, 20, 20, 5);
    g.lineStyle(1.5, 0xffd98a, 1).strokeRoundedRect(-10, -10, 20, 20, 5);
    for (const side of SIDES) {
      if (side === this.closed[id]) continue;
      const [vx, vy] = VEC[side];
      g.fillStyle(0xffd98a, 1).fillRect(vx * 5 - (vx ? 4 : 2), vy * 5 - (vy ? 4 : 2), vx ? 8 : 4, vy ? 8 : 4);
    }
    g.fillStyle(0xffd98a, 1).fillCircle(0, 0, 3);
    // A red bar marks the closed side.
    const [cx, cy] = VEC[this.closed[id]];
    g.fillStyle(0xe0474c, 1).fillRect(cx * 8 - (cx ? 1 : 6), cy * 8 - (cy ? 1 : 6), cx ? 2 : 12, cy ? 2 : 12);
  }

  private drawGauges(): void {
    const g = this.gauges.clear();
    const top = OY + 9 * TILE + 4;
    const h = 50;
    for (const s of this.sinks) {
      const x = at(s.col, 8).x;
      const inBand = s.level >= BAND[0] && s.level <= BAND[1];
      g.fillStyle(0x15112a, 1).fillRoundedRect(x - 6, top, 12, h, 3);
      g.fillStyle(0x2f6b3a, 0.55).fillRect(x - 6, top + h * (1 - BAND[1]), 12, h * (BAND[1] - BAND[0]));
      const fill = Phaser.Math.Clamp(s.level, 0, 1) * (h - 2);
      g.fillStyle(inBand ? 0x7ee08a : s.level < BAND[0] ? 0xffb347 : 0xff6b6b, 1).fillRoundedRect(x - 4, top + h - 1 - fill, 8, Math.max(1, fill), 2);
      g.lineStyle(1, 0x5a4d8a, 1).strokeRoundedRect(x - 6, top, 12, h, 3);
    }
    const t = this.timerBar.clear();
    const x0 = OX + 62;
    const w = 7 * TILE - 62;
    t.fillStyle(0x15112a, 1).fillRoundedRect(x0, 5, w, 6, 3);
    const frac = Math.min(1, this.held / HOLD_SECONDS);
    if (frac > 0) t.fillStyle(0x7ee08a, 1).fillRoundedRect(x0, 5, Math.max(3, w * frac), 6, 3);
  }

  /* ---------- simulation ---------- */

  private rotate(id: 'A' | 'B'): void {
    if (this.done) return;
    this.closed[id] = SIDES[(SIDES.indexOf(this.closed[id]) + 1) % 4];
    this.rr[id] = 0;
    this.routerRing[id].setVisible(false);
    this.drawRouter(id);
    this.routerGfx[id].setAngle(-90);
    this.tweens.add({ targets: this.routerGfx[id], angle: 0, duration: 140, ease: 'Back.out' });
  }

  private outputs(id: 'A' | 'B'): Side[] {
    const r = ROUTERS[id];
    return SIDES.filter((s) => s !== r.input && s !== this.closed[id] && r.outs[s]);
  }

  private emit(): void {
    const dot = this.add.rectangle(SOURCE_ROUTE.pts[0].x, SOURCE_ROUTE.pts[0].y, 4, 4, Phaser.Utils.Array.GetRandom(PACKET_COLORS)).setDepth(2);
    this.packets.push({ dot, pts: SOURCE_ROUTE.pts, seg: 0, t: 0, to: SOURCE_ROUTE.to });
  }

  /** Called when a packet reaches the end of its route. Returns false if it was consumed. */
  private arrive(p: Packet): boolean {
    if (p.to === 'A' || p.to === 'B') {
      const outs = this.outputs(p.to);
      if (outs.length === 0) return false;
      const side = outs[this.rr[p.to]++ % outs.length];
      const route = ROUTERS[p.to].outs[side]!;
      p.pts = route.pts;
      p.seg = 0;
      p.t = 0;
      p.to = route.to;
      return true;
    }
    const sink = this.sinks.find((s) => s.id === p.to);
    if (sink) {
      sink.level = Math.min(1, sink.level + GAIN);
    } else {
      // Lost in a meeting.
      const puff = this.add.circle(p.dot.x, p.dot.y, 3, 0x8f86b8, 0.8).setDepth(6);
      this.tweens.add({ targets: puff, scale: 2.5, alpha: 0, duration: 400, onComplete: () => puff.destroy() });
    }
    return false;
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 50) / 1000;

    this.emitClock += dt;
    while (this.emitClock >= EMIT_EVERY) {
      this.emitClock -= EMIT_EVERY;
      this.emit();
    }

    this.packets = this.packets.filter((p) => {
      let travel = SPEED * dt;
      for (;;) {
        const a = p.pts[p.seg];
        const b = p.pts[p.seg + 1];
        const len = Math.hypot(b.x - a.x, b.y - a.y);
        const remaining = len * (1 - p.t);
        if (travel < remaining) {
          p.t += travel / len;
          p.dot.setPosition(a.x + (b.x - a.x) * p.t, a.y + (b.y - a.y) * p.t);
          return true;
        }
        travel -= remaining;
        if (p.seg + 2 < p.pts.length) {
          p.seg++;
          p.t = 0;
          continue;
        }
        p.dot.setPosition(b.x, b.y);
        if (this.arrive(p)) continue;
        p.dot.destroy();
        return false;
      }
    });

    for (const s of this.sinks) s.level = Math.max(0, s.level - s.leak * s.level * dt);

    if (!this.done) {
      const balanced = this.sinks.every((s) => s.level >= BAND[0] && s.level <= BAND[1]);
      this.held = balanced ? this.held + dt : Math.max(0, this.held - dt * 2);
      if (this.held >= HOLD_SECONDS) this.win();
    }
    this.drawGauges();
  }

  private win(): void {
    this.done = true;
    this.cameras.main.flash(300, 126, 224, 138);
    for (const s of this.sinks) {
      const { x, y } = at(s.col, 8);
      for (let i = 0; i < 8; i++) {
        const spark = this.add.rectangle(x, y, 3, 3, s.color).setDepth(8);
        this.tweens.add({
          targets: spark,
          x: x + Phaser.Math.Between(-24, 24),
          y: y - Phaser.Math.Between(10, 40),
          alpha: 0,
          duration: 700,
          onComplete: () => spark.destroy(),
        });
      }
    }
    this.time.delayedCall(900, () => this.ctx.bus.emit('stage-won', 'ubisoft'));
  }
}
