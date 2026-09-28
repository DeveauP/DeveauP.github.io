import Phaser from 'phaser';
import { buildings } from '../art/scenery';
import { PLAYER_FRAMES } from '../art/sprites';
import { STAGES, stageById, type ItemId, type StageId } from '../stages';
import { isUnlocked } from '../state';
import { getCtx, type GameCtx } from './context';

const GROUND_Y = 400;
const WORLD_BOTTOM = GROUND_Y + 40;
const WORLD_W = 2020;
const FINISH_X = 1950;

const RUN_SPEED = 124;
const JUMP_VELOCITY = -300;
const COYOTE_MS = 90;
const JUMP_BUFFER_MS = 120;
const DOOR_REACH = 14;

/** Where each stage lives on the timeline. `gate` blocks the way until the previous stage is done. */
const LAYOUT: Record<StageId, { building: string; x: number; gate?: number; sign: [number, string] }> = {
  education: { building: 'b-polytechnique', x: 96, sign: [52, '2010'] },
  phd: { building: 'b-curie', x: 750, gate: 690, sign: [716, '2014'] },
  consulting: { building: 'b-consulting', x: 990, gate: 935, sign: [960, '2017'] },
  ubisoft: { building: 'b-ubisoft', x: 1246, gate: 1190, sign: [1216, '2019'] },
  'reality-labs': { building: 'b-reality-labs', x: 1506, gate: 1450, sign: [1476, '2022'] },
  msl: { building: 'b-msl', x: 1766, gate: 1710, sign: [1736, '2025'] },
};

/** Stage 1 collectibles, sitting on floating platforms. */
const PLATFORMS: { x: number; top: number; blocks: number; item: ItemId }[] = [
  { x: 290, top: GROUND_Y - 34, blocks: 3, item: 'eng-degree' },
  { x: 350, top: GROUND_Y - 64, blocks: 3, item: 'm2' },
];

const DECOR: [string, number][] = [
  ['tree', 250], ['bush', 440], ['tree', 626], ['bush', 872], ['tree', 1140], ['bush', 1392],
  ['tree', 1662], ['bush', 1900], ['bush', 60], ['tree', 2000],
];

type Door = { id: StageId | 'finish'; x: number };

export class WorldScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private player!: Phaser.Types.Physics.Arcade.SpriteWithDynamicBody;
  private keys!: Record<'left' | 'right' | 'a' | 'd' | 'up' | 'w' | 'space' | 'z', Phaser.Input.Keyboard.Key>;
  private gates = new Map<StageId, Phaser.Types.Physics.Arcade.ImageWithStaticBody>();
  private items = new Map<ItemId, Phaser.GameObjects.Image>();
  private doors: Door[] = [];
  private nearDoor: Door['id'] | null = null;
  private region: StageId | null = null;
  private frozen = false;
  private queuedJump = false;
  private queuedAction = false;
  private lastGrounded = -Infinity;
  private jumpBufferedAt = -Infinity;
  private offBus: (() => void)[] = [];

  constructor() {
    super('world');
  }

  create(): void {
    this.ctx = getCtx(this);
    this.gates.clear();
    this.items.clear();
    this.doors = [];
    this.nearDoor = null;
    this.region = null;
    this.frozen = this.ctx.isModalOpen();

    this.physics.world.setBounds(0, -200, WORLD_W, WORLD_BOTTOM + 200);
    this.buildBackground();
    const solids = this.buildLevel();
    this.buildPlayer();
    this.physics.add.collider(this.player, solids);
    for (const gate of this.gates.values()) this.physics.add.collider(this.player, gate);

    const kb = this.input.keyboard!;
    // No key capture: the DOM UI keeps normal keyboard behaviour (Space on buttons, etc.).
    this.keys = {
      left: kb.addKey('LEFT', false), right: kb.addKey('RIGHT', false), a: kb.addKey('A', false), d: kb.addKey('D', false),
      up: kb.addKey('UP', false), w: kb.addKey('W', false), space: kb.addKey('SPACE', false), z: kb.addKey('Z', false),
    };
    // Presses are queued from keydown events: polling JustDown misses taps shorter than a frame.
    const JUMP_KEYS = new Set(['Space', 'ArrowUp', 'KeyW', 'KeyZ']);
    const ACTION_KEYS = new Set(['KeyE', 'Enter', 'ArrowDown', 'KeyS']);
    kb.on('keydown', (e: KeyboardEvent) => {
      if (e.repeat || (e.target as HTMLElement | null)?.closest?.('button, a, input')) return;
      if (JUMP_KEYS.has(e.code)) this.queuedJump = true;
      if (ACTION_KEYS.has(e.code)) this.queuedAction = true;
    });

    const cam = this.cameras.main;
    cam.setBounds(0, -200, WORLD_W, WORLD_BOTTOM + 200);
    cam.startFollow(this.player, false, 0.15, 0.12);
    this.layout();
    this.scale.on('resize', this.layout, this);

    const { bus } = this.ctx;
    this.offBus = [
      bus.on('progress', () => this.syncProgress()),
      bus.on('ui-modal', (open) => {
        this.frozen = open;
        if (open) this.ctx.pad.reset();
      }),
      bus.on('teleport', (id) => this.teleport(id)),
      bus.on('stage-start', (id) => this.startStage(id)),
      bus.on('stage-exit', () => this.exitStage()),
    ];
    this.events.once('shutdown', () => {
      this.offBus.forEach((off) => off());
      this.scale.off('resize', this.layout, this);
    });

    this.syncProgress(false);
  }

  /* ---------- construction ---------- */

  private buildBackground(): void {
    for (const [x, y, f] of [[80, 250, 0.08], [420, 210, 0.12], [900, 240, 0.1], [1500, 200, 0.14], [2100, 230, 0.09]])
      this.add.image(x, y, 'cloud').setScrollFactor(f, 1).setAlpha(0.9);
    this.add.tileSprite(0, GROUND_Y - 80 + 10, WORLD_W * 2, 80, 'hills-far').setOrigin(0, 0).setScrollFactor(0.25, 1);
    this.add.tileSprite(0, GROUND_Y - 80 + 22, WORLD_W * 2, 80, 'hills-near').setOrigin(0, 0).setScrollFactor(0.5, 1);
  }

  private buildLevel(): Phaser.Physics.Arcade.StaticGroup {
    const solids = this.physics.add.staticGroup();
    const ground = this.add.tileSprite(0, GROUND_Y, WORLD_W, 40, 'ground').setOrigin(0, 0);
    solids.add(ground);

    for (const [key, x] of DECOR) this.add.image(x, GROUND_Y, key).setOrigin(0.5, 1);

    const defs = buildings();
    const def = (key: string) => defs.find((b) => b.key === key)!;
    const place = (key: string, x: number) => {
      const b = def(key);
      this.add.image(x, GROUND_Y, key).setOrigin(0, 1);
      if (b.label) {
        const top = GROUND_Y - b.canvas.height;
        this.pixelText(x + b.label.x, top + b.label.y, b.label.text, b.label.color, true).setOrigin(0.5, 0.5);
      }
      return x + b.doorX;
    };

    place('b-descartes', 470);
    for (const stage of STAGES) {
      const l = LAYOUT[stage.id];
      this.doors.push({ id: stage.id, x: place(l.building, l.x) });
      this.add.image(l.sign[0], GROUND_Y, 'signpost').setOrigin(0.5, 1);
      this.pixelText(l.sign[0], GROUND_Y - 21, l.sign[1], '#3b2412').setOrigin(0.5, 0.5);
      if (l.gate !== undefined) {
        const gate = this.physics.add.staticImage(l.gate, GROUND_Y, 'gate').setOrigin(0.5, 1);
        gate.refreshBody();
        this.gates.set(stage.id, gate);
      }
    }

    this.add.image(FINISH_X, GROUND_Y, 'finish').setOrigin(0.2, 1);
    this.doors.push({ id: 'finish', x: FINISH_X });

    for (const p of PLATFORMS) {
      for (let i = 0; i < p.blocks; i++) solids.create(p.x + i * 16 + 8, p.top + 4, 'platform');
      const item = this.add.image(p.x + (p.blocks * 16) / 2, p.top - 14, `item-${p.item}`);
      this.tweens.add({ targets: item, y: item.y - 3, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.items.set(p.item, item);
    }
    return solids;
  }

  private buildPlayer(): void {
    const start = this.spawnX();
    this.player = this.physics.add.sprite(start, GROUND_Y - 20, this.playerKey(), PLAYER_FRAMES.stand);
    this.player.setOrigin(0.5, 1);
    this.player.body.setSize(8, 22).setOffset(5, 4);
    this.player.setCollideWorldBounds(true);
    this.player.setDepth(10);
  }

  /**
   * Silkscreen is drawn on an 8px grid: any other size smears its rows, which read as
   * squashed letters on desktop. Rendered 8× larger and scaled down so it stays crisp
   * at any camera zoom; `tight` drops one grid unit of letter spacing to fit facades.
   */
  private pixelText(x: number, y: number, text: string, color: string, tight = false): Phaser.GameObjects.Text {
    const k = 8;
    return this.add
      .text(x, y, text, {
        fontFamily: 'Silkscreen, monospace',
        fontSize: `${8 * k}px`,
        color,
        letterSpacing: tight ? -k : 0,
        padding: { y: k },
      })
      .setScale(1 / k);
  }

  /* ---------- progress ---------- */

  private playerKey(): string {
    return `player-${this.ctx.progress().outfit ?? 'polytechnique'}`;
  }

  /** Starts the player at the latest open stage. */
  private spawnX(): number {
    const p = this.ctx.progress();
    const open = STAGES.filter((s) => isUnlocked(p, s.id));
    const last = open[open.length - 1];
    const gate = LAYOUT[last.id].gate;
    return gate === undefined ? LAYOUT.education.x + 40 : gate + 30;
  }

  private syncProgress(animate = true): void {
    const p = this.ctx.progress();
    const key = this.playerKey();
    if (this.player.texture.key !== key) this.player.setTexture(key, PLAYER_FRAMES.stand);

    for (const [id, gate] of this.gates) {
      if (!gate.body.enable || !isUnlocked(p, id)) continue;
      gate.body.enable = false;
      if (!animate) gate.setVisible(false);
      else
        this.tweens.add({ targets: gate, y: GROUND_Y + 64, alpha: 0, duration: 900, ease: 'Quad.in', onComplete: () => gate.setVisible(false) });
    }
    for (const [id, img] of this.items) {
      if (!img.visible || !p.items.includes(id)) continue;
      img.setVisible(false);
    }
  }

  /* ---------- stages ---------- */

  private startStage(id: StageId): void {
    const scene = stageById(id).scene;
    if (!scene) return;
    this.ctx.pad.reset();
    this.scene.pause();
    this.scene.launch(scene, { stage: id });
  }

  private exitStage(): void {
    for (const s of STAGES) if (s.scene && this.scene.isActive(s.scene)) this.scene.stop(s.scene);
    this.scene.resume();
  }

  private teleport(id: StageId): void {
    const door = this.doors.find((d) => d.id === id);
    if (!door) return;
    this.player.setPosition(door.x - 22, GROUND_Y - 1);
    this.player.setVelocity(0, 0);
    this.cameras.main.centerOn(door.x, GROUND_Y - 100);
  }

  /* ---------- layout ---------- */

  private layout(): void {
    const cam = this.cameras.main;
    cam.setViewport(0, 0, this.scale.width, this.scale.height);
    // Show at least ~290 world px of height and ~170 of width, whichever is tighter.
    const zoom = Math.min(this.scale.height / 290, this.scale.width / 170);
    cam.setZoom(zoom);
  }

  /* ---------- loop ---------- */

  update(time: number): void {
    const body = this.player.body;
    const { pad, bus } = this.ctx;
    const k = this.keys;

    if (this.frozen) {
      this.queuedJump = this.queuedAction = false;
      this.player.setVelocityX(0);
      this.player.setFrame(PLAYER_FRAMES.stand);
      this.player.anims.stop();
      return;
    }

    const left = k.left.isDown || k.a.isDown || pad.left;
    const right = k.right.isDown || k.d.isDown || pad.right;
    const dir = (right ? 1 : 0) - (left ? 1 : 0);
    const onFloor = body.blocked.down || body.touching.down;
    if (onFloor) this.lastGrounded = time;

    const jumpPressed = this.queuedJump;
    this.queuedJump = false;
    if (pad.consumeJump() || jumpPressed) this.jumpBufferedAt = time;
    if (time - this.jumpBufferedAt < JUMP_BUFFER_MS && time - this.lastGrounded < COYOTE_MS) {
      body.setVelocityY(JUMP_VELOCITY);
      this.jumpBufferedAt = this.lastGrounded = -Infinity;
    }
    // Variable jump height: releasing early cuts the ascent.
    const jumpHeld = k.space.isDown || k.up.isDown || k.w.isDown || k.z.isDown || pad.jumpHeld;
    if (!jumpHeld && body.velocity.y < -110) body.setVelocityY(-110);

    const target = dir * RUN_SPEED;
    body.setVelocityX(Phaser.Math.Linear(body.velocity.x, target, onFloor ? 0.35 : 0.2));
    if (Math.abs(body.velocity.x) < 2) body.setVelocityX(0);
    if (dir !== 0) this.player.setFlipX(dir < 0);

    if (!onFloor) {
      this.player.anims.stop();
      this.player.setFrame(PLAYER_FRAMES.jump);
    } else if (dir !== 0) {
      this.player.anims.play(`${this.player.texture.key}-run`, true);
    } else {
      this.player.anims.stop();
      this.player.setFrame(PLAYER_FRAMES.stand);
    }

    this.checkItems();

    const door = onFloor ? this.doors.find((d) => Math.abs(d.x - this.player.x) < DOOR_REACH) : undefined;
    const near = door?.id ?? null;
    if (near !== this.nearDoor) {
      this.nearDoor = near;
      bus.emit('near-door', near);
    }
    const action = this.queuedAction;
    this.queuedAction = false;
    if ((pad.consumeAction() || action) && this.nearDoor) bus.emit('door-action', this.nearDoor);

    const region = [...STAGES].reverse().find((s) => this.player.x >= (LAYOUT[s.id].gate ?? 0))!.id;
    if (region !== this.region) {
      this.region = region;
      bus.emit('region', region);
    }
  }

  private checkItems(): void {
    const px = this.player.x;
    const py = this.player.y - 12;
    for (const [id, img] of this.items) {
      if (!img.visible) continue;
      if (Math.abs(img.x - px) < 10 && Math.abs(img.y - py) < 16) {
        img.setVisible(false);
        this.burst(img.x, img.y);
        this.ctx.bus.emit('collect', id);
      }
    }
  }

  private burst(x: number, y: number): void {
    const emitter = this.add.particles(x, y, 'sparkle', {
      speed: { min: 30, max: 90 },
      lifespan: 500,
      scale: { start: 1, end: 0 },
      quantity: 12,
      emitting: false,
    });
    emitter.explode(12);
    this.time.delayedCall(700, () => emitter.destroy());
  }
}
