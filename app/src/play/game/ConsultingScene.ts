import Phaser from 'phaser';
import { getLang, type L } from '../../i18n';
import { fitCamera, getCtx, type GameCtx } from './context';

/*
 * Stage 3: "Breaking the mold". A wall of skill bricks covers the stamp
 * French recruiters kept applying to PhDs; clear the wall to shatter it.
 * No game over: a missed ball simply returns to the paddle.
 */

const W = 200;
const H = 300;
const TOP = 30;
const BRICK_W = 94;
const BRICK_H = 17;
const GAP = 4;
const PADDLE_Y = 280;
const PADDLE_W = 44;
const PADDLE_H = 6;
const BALL_R = 3;
const SPEED_START = 150;
const SPEED_MAX = 230;

const SKILLS: { label: L; tough?: boolean }[] = [
  { label: { en: 'Short-term delivery', fr: 'Livraison court terme' }, tough: true },
  { label: { en: 'Business acumen', fr: 'Sens business' }, tough: true },
  { label: { en: 'Time series', fr: 'Séries temporelles' } },
  { label: { en: 'Technical lead', fr: 'Lead technique' }, tough: true },
  { label: { en: 'Predictive models', fr: 'Modèles prédictifs' } },
  { label: { en: 'Google Cloud', fr: 'Google Cloud' } },
  { label: { en: 'Econometrics', fr: 'Économétrie' } },
  { label: { en: 'A/B testing', fr: 'Tests A/B' } },
  { label: { en: 'Media mix', fr: 'Mix média' } },
  { label: { en: 'Training teams', fr: 'Formation' } },
  { label: { en: 'Pharma partners', fr: 'Partenaires pharma' } },
  { label: { en: 'Publications', fr: 'Publications' } },
];

const STAMP: L = { en: 'TOO SPECIALISED', fr: 'TROP SPÉCIALISÉ' };

interface Brick {
  x: number;
  y: number;
  hp: number;
  label: string;
  body: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
}

export class ConsultingScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private bricks: Brick[] = [];
  private paddle!: Phaser.GameObjects.Graphics;
  private ball!: Phaser.GameObjects.Arc;
  private stamp!: Phaser.GameObjects.Container;
  private cracks!: Phaser.GameObjects.Graphics;
  private stampW = 0;
  private stampH = 0;
  private counter!: Phaser.GameObjects.Text;
  private hint!: Phaser.GameObjects.Text;
  private paddleX = W / 2;
  private targetX = W / 2;
  private vel = new Phaser.Math.Vector2(0, 0);
  private speed = SPEED_START;
  private docked = true;
  private done = false;
  private broken = 0;
  private keys!: { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };
  private offBus: (() => void)[] = [];

  constructor() {
    super('consulting');
  }

  create(): void {
    this.ctx = getCtx(this);
    this.cameras.main.setBackgroundColor('#1a2233');
    const res = () => Math.max(2, Math.ceil(this.cameras.main.zoom));

    const board = this.add.graphics();
    board.fillStyle(0x22304a, 1).fillRoundedRect(-4, -4, W + 8, H + 8, 8);
    board.lineStyle(1, 0x3b4d70, 1);
    for (let x = 0; x <= W; x += 20) board.lineBetween(x, 0, x, H);
    for (let y = 0; y <= H; y += 20) board.lineBetween(0, y, W, y);
    board.lineStyle(2, 0x5b86b8, 1).strokeRoundedRect(-4, -4, W + 8, H + 8, 8);

    // The recruiters' stamp sits between wall and paddle, cracking as skills are proven.
    const stampText = this.add
      .text(0, 0, STAMP[getLang()], { fontFamily: 'Instrument Serif, Georgia, serif', fontSize: '26px', color: '#e0474c' })
      .setOrigin(0.5)
      .setResolution(res() + 1);
    const pad = 8;
    const frame = this.add.graphics();
    frame.lineStyle(3, 0xe0474c, 1).strokeRoundedRect(-stampText.width / 2 - pad, -stampText.height / 2 - pad / 2, stampText.width + pad * 2, stampText.height + pad, 4);
    this.stampW = stampText.width + pad * 2;
    this.stampH = stampText.height + pad;
    this.cracks = this.add.graphics();
    this.stamp = this.add.container(W / 2, TOP + 6 * (BRICK_H + GAP) + 48, [frame, stampText, this.cracks]).setAngle(-8);
    const fit = (W - 24) / this.stampW;
    if (fit < 1) this.stamp.setScale(fit);

    this.counter = this.add
      .text(4, 8, '', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#cfe0f5' })
      .setResolution(res());
    this.hint = this.add
      .text(W / 2, PADDLE_Y - 26, getLang() === 'fr' ? 'TOUCHER POUR LANCER' : 'TAP TO LAUNCH', {
        fontFamily: 'Silkscreen, monospace',
        fontSize: '8px',
        color: '#ffd98a',
      })
      .setOrigin(0.5)
      .setResolution(res());
    this.tweens.add({ targets: this.hint, alpha: 0.35, duration: 600, yoyo: true, repeat: -1 });

    this.paddle = this.add.graphics();
    this.ball = this.add.circle(W / 2, PADDLE_Y - BALL_R - 1, BALL_R, 0xffffff);

    const kb = this.input.keyboard!;
    this.keys = { left: kb.addKey('LEFT', false), right: kb.addKey('RIGHT', false) };
    kb.on('keydown-SPACE', () => this.launch());
    kb.on('keydown-UP', () => this.launch());

    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (p.isDown || !p.wasTouch) this.targetX = p.worldX;
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => {
      this.targetX = p.worldX;
      this.launch();
    });

    this.reset();
    fitCamera(this, W, H);
    this.scale.on('resize', this.onResize, this);
    this.offBus = [this.ctx.bus.on('stage-reset', () => this.reset())];
    this.events.once('shutdown', () => {
      this.offBus.forEach((off) => off());
      this.scale.off('resize', this.onResize, this);
      this.input.removeAllListeners();
      kb.removeAllListeners();
    });
  }

  private onResize(): void {
    fitCamera(this, W, H);
  }

  private reset(): void {
    this.bricks.forEach((b) => (b.body.destroy(), b.text.destroy()));
    this.bricks = SKILLS.map((s, i) => {
      const x = 4 + (i % 2) * (BRICK_W + GAP);
      const y = TOP + Math.floor(i / 2) * (BRICK_H + GAP);
      const label = s.label[getLang()];
      const text = this.add
        .text(x + BRICK_W / 2, y + BRICK_H / 2, label, {
          fontFamily: 'Inter Variable, system-ui, sans-serif',
          fontSize: '7.5px',
          fontStyle: '600',
          color: '#1f2733',
        })
        .setOrigin(0.5)
        .setDepth(2)
        .setResolution(Math.max(3, Math.ceil(this.cameras.main.zoom) + 1));
      const brick: Brick = { x, y, hp: s.tough ? 2 : 1, label, body: this.add.graphics().setDepth(1), text };
      this.drawBrick(brick);
      return brick;
    });
    this.stamp.setVisible(true).setAlpha(0.85);
    this.cracks.clear();
    this.ball.setVisible(true);
    this.done = false;
    this.broken = 0;
    this.speed = SPEED_START;
    this.dock();
    this.updateCounter();
  }

  private drawBrick(b: Brick): void {
    const g = b.body.clear();
    const tough = b.hp > 1;
    g.fillStyle(tough ? 0x7d8794 : 0xb4bcc6, 1).fillRoundedRect(b.x, b.y, BRICK_W, BRICK_H, 3);
    g.fillStyle(tough ? 0x98a2ae : 0xd3d9df, 1).fillRect(b.x + 2, b.y + 1, BRICK_W - 4, 2);
    g.fillStyle(0x5f6b77, 1).fillRect(b.x + 2, b.y + BRICK_H - 2, BRICK_W - 4, 1);
    if (tough) {
      // Rivets mark two-hit bricks.
      g.fillStyle(0x4a5460, 1).fillCircle(b.x + 5, b.y + BRICK_H / 2, 1.5).fillCircle(b.x + BRICK_W - 5, b.y + BRICK_H / 2, 1.5);
    } else if (b.body.getData('cracked')) {
      g.lineStyle(1, 0x5f6b77, 1).lineBetween(b.x + 20, b.y + 2, b.x + 26, b.y + 9).lineBetween(b.x + 26, b.y + 9, b.x + 22, b.y + 15);
      g.lineBetween(b.x + 70, b.y + 3, b.x + 64, b.y + 10);
    }
    b.text.setColor(tough ? '#f1f4f7' : '#1f2733');
  }

  private updateCounter(): void {
    this.counter.setText(`${this.broken}/${SKILLS.length}`);
  }

  private dock(): void {
    this.docked = true;
    this.vel.set(0, 0);
    this.hint.setVisible(!this.done);
  }

  private launch(): void {
    if (!this.docked || this.done) return;
    this.docked = false;
    this.hint.setVisible(false);
    const angle = Phaser.Math.DegToRad(Phaser.Math.Between(-30, 30));
    this.vel.set(Math.sin(angle), -Math.cos(angle)).scale(this.speed);
  }

  update(_time: number, delta: number): void {
    const dt = Math.min(delta, 34) / 1000;
    if (this.keys.left.isDown) this.targetX -= 220 * dt;
    if (this.keys.right.isDown) this.targetX += 220 * dt;
    this.targetX = Phaser.Math.Clamp(this.targetX, PADDLE_W / 2, W - PADDLE_W / 2);
    this.paddleX = Phaser.Math.Linear(this.paddleX, this.targetX, 0.35);
    this.paddle
      .clear()
      .fillStyle(0xffd98a, 1)
      .fillRoundedRect(this.paddleX - PADDLE_W / 2, PADDLE_Y, PADDLE_W, PADDLE_H, 3)
      .fillStyle(0xfff0c4, 1)
      .fillRect(this.paddleX - PADDLE_W / 2 + 3, PADDLE_Y + 1, PADDLE_W - 6, 1);

    if (this.docked) {
      this.ball.setPosition(this.paddleX, PADDLE_Y - BALL_R - 1);
      return;
    }

    // Sub-steps keep the ball from tunnelling through thin bricks.
    const steps = Math.ceil((this.speed * dt) / 2);
    for (let i = 0; i < steps && !this.docked; i++) this.step(dt / steps);
  }

  private step(dt: number): void {
    const b = this.ball;
    let x = b.x + this.vel.x * dt;
    let y = b.y + this.vel.y * dt;

    if (x < BALL_R || x > W - BALL_R) {
      this.vel.x *= -1;
      x = Phaser.Math.Clamp(x, BALL_R, W - BALL_R);
    }
    if (y < BALL_R) {
      this.vel.y = Math.abs(this.vel.y);
      y = BALL_R;
    }

    // Paddle: the bounce angle depends on where the ball lands.
    if (this.vel.y > 0 && y + BALL_R >= PADDLE_Y && y - BALL_R <= PADDLE_Y + PADDLE_H && Math.abs(x - this.paddleX) <= PADDLE_W / 2 + BALL_R) {
      const offset = Phaser.Math.Clamp((x - this.paddleX) / (PADDLE_W / 2), -1, 1);
      // Never bounce perfectly vertically, or the ball can loop in an emptied column.
      const deg = offset * 60;
      const angle = Phaser.Math.DegToRad(Math.abs(deg) < 10 ? (deg < 0 || (deg === 0 && Math.random() < 0.5) ? -10 : 10) : deg);
      this.speed = Math.min(SPEED_MAX, this.speed + 4);
      this.vel.set(Math.sin(angle), -Math.cos(angle)).scale(this.speed);
      y = PADDLE_Y - BALL_R;
    }

    if (y > H + 10) {
      this.dock();
      return;
    }

    for (const brick of this.bricks) {
      if (brick.hp <= 0) continue;
      const cx = Phaser.Math.Clamp(x, brick.x, brick.x + BRICK_W);
      const cy = Phaser.Math.Clamp(y, brick.y, brick.y + BRICK_H);
      if ((x - cx) ** 2 + (y - cy) ** 2 > BALL_R * BALL_R) continue;
      // Reflect on the axis of least penetration.
      const overlapX = Math.min(x + BALL_R - brick.x, brick.x + BRICK_W - (x - BALL_R));
      const overlapY = Math.min(y + BALL_R - brick.y, brick.y + BRICK_H - (y - BALL_R));
      if (overlapX < overlapY) {
        this.vel.x *= -1;
        x += this.vel.x > 0 ? overlapX : -overlapX;
      } else {
        this.vel.y *= -1;
        y += this.vel.y > 0 ? overlapY : -overlapY;
      }
      this.hit(brick);
      break;
    }

    b.setPosition(x, y);
  }

  private hit(brick: Brick): void {
    brick.hp--;
    if (brick.hp > 0) {
      brick.body.setData('cracked', true);
      this.drawBrick(brick);
      this.tweens.add({ targets: [brick.body, brick.text], x: '+=1', duration: 40, yoyo: true, repeat: 2 });
      return;
    }

    this.broken++;
    this.updateCounter();
    brick.body.destroy();
    this.chips(brick.x + BRICK_W / 2, brick.y + BRICK_H / 2);
    // The skill floats up to the counter: acquired.
    brick.text.setColor('#ffd98a').setDepth(20);
    this.tweens.add({
      targets: brick.text,
      x: 18,
      y: 12,
      scale: 0.4,
      alpha: 0,
      duration: 700,
      ease: 'Cubic.in',
      onComplete: () => brick.text.destroy(),
    });
    this.crack();

    if (this.bricks.every((b) => b.hp <= 0)) this.win();
  }

  /** Adds a jagged crack across the stamp. */
  private crack(): void {
    const hw = this.stampW / 2;
    const hh = this.stampH / 2;
    let x = Phaser.Math.FloatBetween(-hw, hw);
    let y = Math.random() < 0.5 ? -hh : hh;
    const dir = y < 0 ? 1 : -1;
    this.cracks.lineStyle(1.5, 0x1a2233, 1).beginPath().moveTo(x, y);
    for (let i = 0; i < 4; i++) {
      x += Phaser.Math.FloatBetween(-6, 6);
      y += dir * Phaser.Math.FloatBetween(3, 6);
      this.cracks.lineTo(x, y);
    }
    this.cracks.strokePath();
    this.tweens.add({ targets: this.stamp, angle: -8 + Phaser.Math.FloatBetween(-1.5, 1.5), duration: 60, yoyo: true });
  }

  private chips(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      const chip = this.add.rectangle(x + Phaser.Math.Between(-30, 30), y, 3, 3, 0x9aa3ad);
      this.tweens.add({
        targets: chip,
        x: chip.x + Phaser.Math.Between(-20, 20),
        y: y + Phaser.Math.Between(20, 60),
        angle: Phaser.Math.Between(-180, 180),
        alpha: 0,
        duration: 600,
        onComplete: () => chip.destroy(),
      });
    }
  }

  private win(): void {
    this.done = true;
    this.dock();
    this.ball.setVisible(false);
    this.cameras.main.shake(250, 0.01);
    // Shatter the stamp into red shards.
    const { x, y } = this.stamp;
    for (let i = 0; i < 24; i++) {
      const shard = this.add.triangle(x + Phaser.Math.Between(-70, 70), y + Phaser.Math.Between(-12, 12), 0, 0, 6, 2, 2, 7, 0xe0474c);
      this.tweens.add({
        targets: shard,
        x: shard.x + Phaser.Math.Between(-60, 60),
        y: shard.y + Phaser.Math.Between(40, 160),
        angle: Phaser.Math.Between(-360, 360),
        alpha: 0,
        duration: 1100,
        ease: 'Quad.in',
        onComplete: () => shard.destroy(),
      });
    }
    this.stamp.setVisible(false);
    this.time.delayedCall(1200, () => {
      this.ball.setVisible(true);
      this.ctx.bus.emit('stage-won', 'consulting');
    });
  }
}
