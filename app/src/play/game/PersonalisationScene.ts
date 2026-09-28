import Phaser from 'phaser';
import { getLang, type L } from '../../i18n';
import { fitCamera, getCtx, type GameCtx } from './context';

/*
 * Stage 5b: personalisation for Meta AI. Each round shows what the assistant
 * remembers about a user, their request, and six candidate suggestions. Pick
 * the three that fit; a judge checks the answer, keeps good picks and bounces
 * the rest back. Three users to finish.
 */

const W = 200;
const H = 300;
const PICKS = 3;
const FONT = 'Inter Variable, system-ui, sans-serif';

interface Round {
  name: string;
  color: number;
  memories: L[];
  prompt: L;
  options: { text: L; fits: boolean }[];
}

const ROUNDS: Round[] = [
  {
    name: 'Paul',
    color: 0x3a7bff,
    memories: [
      { en: 'Long distance runner', fr: 'Course longue distance' },
      { en: 'Vegetarian', fr: 'Végétarien' },
      { en: 'Musician', fr: 'Musicien' },
    ],
    prompt: { en: 'What should I do ?', fr: 'Que faire aujourd’hui ?' },
    options: [
      { text: { en: 'Train for the Paris 20km', fr: 'S’entraîner pour les 20km de Paris' }, fits: true },
      { text: { en: 'Steakhouse dinner downtown', fr: 'Dîner dans un steakhouse du centre' }, fits: false },
      { text: { en: 'Discover the latest bakery', fr: 'Découvrir les dernières pâtisseries' }, fits: true },
      { text: { en: 'Go for a bike run', fr: 'Faire un tour à vélo' }, fits: false },
      { text: { en: 'Practice drums and/or guitare', fr: 'Jouer de la batterie et/ou de la guitare' }, fits: true },
      { text: { en: 'Go dancing in a club', fr: 'Aller danser en boite de nuit' }, fits: false },
    ],
  },
];

type CardState = 'pool' | 'picked' | 'kept';

interface Card {
  i: number;
  fits: boolean;
  state: CardState;
  box: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  zone: Phaser.GameObjects.Zone;
  x: number;
  y: number;
}

const CARD_W = 94;
const CARD_H = 32;
const POOL_Y = 190;
const ANSWER_Y = 104;

export class PersonalisationScene extends Phaser.Scene {
  private ctx!: GameCtx;
  private round = 0;
  private cards: Card[] = [];
  private picks: Card[] = [];
  private options: Round['options'] = [];
  private answerLines: Phaser.GameObjects.Container[] = [];
  private roundObjects: Phaser.GameObjects.GameObject[] = [];
  private hud!: Phaser.GameObjects.Graphics;
  private status!: Phaser.GameObjects.Text;
  private judging = false;
  private done = false;
  private res = 3;
  private offBus: (() => void)[] = [];

  constructor() {
    super('msl');
  }

  create(): void {
    this.ctx = getCtx(this);
    this.cameras.main.setBackgroundColor('#15172a');
    this.res = Math.max(3, Math.ceil(this.cameras.main.zoom) + 1);

    const bg = this.add.graphics();
    bg.fillStyle(0x1f2233, 1).fillRoundedRect(-4, -4, W + 8, H + 8, 8);
    bg.lineStyle(2, 0x5a4fb0, 1).strokeRoundedRect(-4, -4, W + 8, H + 8, 8);
    this.hud = this.add.graphics();
    this.status = this.add
      .text(W / 2, ANSWER_Y + 3 * 24 + 4, '', { fontFamily: 'Silkscreen, monospace', fontSize: '8px', color: '#cfc6ff' })
      .setOrigin(0.5, 0)
      .setResolution(this.res);

    this.startRound(0);
    fitCamera(this, W, H);
    this.scale.on('resize', this.onResize, this);
    this.offBus = [this.ctx.bus.on('stage-reset', () => this.startRound(0))];
    this.events.once('shutdown', () => {
      this.offBus.forEach((off) => off());
      this.scale.off('resize', this.onResize, this);
    });
  }

  private onResize(): void {
    fitCamera(this, W, H);
  }

  private label(x: number, y: number, text: string, size: number, color: string, opts: Phaser.Types.GameObjects.Text.TextStyle = {}) {
    const t = this.add.text(x, y, text, { fontFamily: FONT, fontSize: `${size}px`, color, ...opts }).setResolution(this.res);
    this.roundObjects.push(t);
    return t;
  }

  private startRound(n: number): void {
    this.roundObjects.forEach((o) => o.destroy());
    this.answerLines.forEach((o) => o.destroy());
    this.roundObjects = [];
    this.answerLines = [];
    this.cards = [];
    this.picks = [];
    this.round = n;
    this.judging = false;
    this.done = false;
    this.status.setText('');
    const lang = getLang();
    const r = ROUNDS[n];
    // Shuffle so the right answers never sit in a predictable column.
    this.options = Phaser.Utils.Array.Shuffle([...r.options]);

    // User card: avatar, name and what the assistant remembers.
    const g = this.add.graphics();
    this.roundObjects.push(g);
    g.fillStyle(0x2a2e45, 1).fillRoundedRect(6, 20, W - 12, 52, 8);
    g.fillStyle(r.color, 1).fillCircle(24, 38, 11);
    this.label(24, 38, r.name[0], 11, '#ffffff', { fontStyle: '700' }).setOrigin(0.5);
    const name = this.label(41, 26, r.name, 9, '#ffffff', { fontStyle: '700' });
    this.label(41 + name.width + 6, 28.5, lang === 'fr' ? 'MÉMOIRE' : 'MEMORY', 5.5, '#8f86b8', { fontStyle: '700' });
    let cx = 41;
    let cy = 42;
    for (const m of r.memories) {
      const t = this.label(0, 0, m[lang], 6.5, '#e6e0ff', { fontStyle: '600' });
      if (cx + t.width + 10 > W - 10) {
        cx = 41;
        cy += 13;
      }
      g.fillStyle(0x3b3f66, 1).fillRoundedRect(cx, cy, t.width + 8, 11, 5.5);
      t.setPosition(cx + 4, cy + 1.5);
      cx += t.width + 12;
    }

    // The user's request, as a chat bubble on the right.
    const prompt = this.label(0, 0, r.prompt[lang], 7.5, '#ffffff', { fontStyle: '600' });
    const pw = prompt.width + 14;
    g.fillStyle(r.color, 1).fillRoundedRect(W - 8 - pw, 80, pw, 16, 8);
    prompt.setPosition(W - 8 - pw + 7, 83.5);

    // Answer area: three empty slots for the assistant's suggestions.
    g.lineStyle(1, 0x3b3f66, 1);
    for (let i = 0; i < PICKS; i++) g.strokeRoundedRect(8, ANSWER_Y + i * 24, W - 16, 20, 6);
    this.label(8, ANSWER_Y - 3, 'Meta AI', 6, '#8f86b8', { fontStyle: '700' }).setOrigin(0, 1);

    // Candidate pool: six cards in two columns.
    this.options.forEach((opt, i) => {
      const x = 4 + (i % 2) * (CARD_W + 4);
      const y = POOL_Y + Math.floor(i / 2) * (CARD_H + 4);
      const box = this.add.graphics();
      const text = this.add
        .text(x + CARD_W / 2, y + CARD_H / 2, opt.text[lang], {
          fontFamily: FONT,
          fontSize: '6.8px',
          fontStyle: '600',
          color: '#1f2233',
          align: 'center',
          wordWrap: { width: CARD_W - 10 },
          lineSpacing: -1,
        })
        .setOrigin(0.5)
        .setResolution(this.res);
      const zone = this.add.zone(x + CARD_W / 2, y + CARD_H / 2, CARD_W, CARD_H).setInteractive({ useHandCursor: true });
      const card: Card = { i, fits: opt.fits, state: 'pool', box, text, zone, x, y };
      zone.on('pointerdown', () => this.pick(card));
      this.roundObjects.push(box, text, zone);
      this.cards.push(card);
      this.drawCard(card);
    });
    this.drawHud();
  }

  private drawCard(c: Card, tint?: number): void {
    const g = c.box.clear();
    const picked = c.state !== 'pool';
    g.fillStyle(tint ?? (picked ? 0x3b3f66 : 0xeeeafc), 1).fillRoundedRect(c.x, c.y, CARD_W, CARD_H, 6);
    if (!picked) g.fillStyle(0xffffff, 1).fillRoundedRect(c.x + 2, c.y + 1, CARD_W - 4, 2, 1);
    c.text.setColor(picked ? '#8f86b8' : '#1f2233');
    c.text.setAlpha(picked ? 0.7 : 1);
  }

  private drawHud(): void {
    const h = this.hud.clear();
    ROUNDS.forEach((_, i) => {
      const x = W - 10 - (ROUNDS.length - 1 - i) * 12;
      if (i < this.round || this.done) h.fillStyle(0x7ee08a, 1).fillCircle(x, 10, 4);
      else if (i === this.round) h.lineStyle(2, 0xb8a8ff, 1).strokeCircle(x, 10, 4);
      else h.fillStyle(0x3b3f66, 1).fillCircle(x, 10, 4);
    });
  }

  private answerSlotY(k: number): number {
    return ANSWER_Y + k * 24;
  }

  private pick(card: Card): void {
    if (this.judging || this.done || card.state !== 'pool' || this.picks.length >= PICKS) return;
    card.state = 'picked';
    this.drawCard(card);
    const slot = this.picks.length;
    this.picks.push(card);

    // The suggestion flies into the answer as an assistant line.
    const line = this.add.container(card.x + CARD_W / 2, card.y + CARD_H / 2);
    const bubble = this.add.graphics();
    const text = this.add
      .text(0, 0, this.options[card.i].text[getLang()], {
        fontFamily: FONT,
        fontSize: '6.8px',
        fontStyle: '600',
        color: '#ffffff',
        wordWrap: { width: W - 40 },
      })
      .setOrigin(0, 0.5)
      .setResolution(this.res);
    bubble.fillStyle(0x5a4fb0, 1).fillRoundedRect(-(W - 16) / 2, -10, W - 16, 20, 6);
    text.setX(-(W - 16) / 2 + 8);
    line.add([bubble, text]);
    line.setData('card', card);
    this.answerLines.push(line);
    this.tweens.add({ targets: line, x: W / 2, y: this.answerSlotY(slot) + 10, duration: 260, ease: 'Cubic.out' });

    if (this.picks.length === PICKS) this.time.delayedCall(350, () => this.judge());
  }

  private judge(): void {
    this.judging = true;
    const fr = getLang() === 'fr';
    const good = this.picks.filter((c) => c.fits).length;
    this.status.setText(fr ? `JUGE : ${good}/${PICKS} PERTINENTS` : `JUDGE: ${good}/${PICKS} RELEVANT`);

    // Mark each line; bounce wrong picks back to the pool, keep good ones.
    for (const line of this.answerLines) {
      const card = line.getData('card') as Card;
      const mark = this.add
        .text((W - 16) / 2 - 8, 0, card.fits ? '✓' : '✕', { fontFamily: FONT, fontSize: '9px', fontStyle: '700', color: card.fits ? '#7ee08a' : '#ff6b6b' })
        .setOrigin(1, 0.5)
        .setResolution(this.res);
      line.add(mark);
    }

    if (good === PICKS) {
      this.cameras.main.flash(200, 126, 224, 138);
      this.time.delayedCall(1100, () => {
        if (this.round === ROUNDS.length - 1) {
          this.done = true;
          this.drawHud();
          this.status.setText(fr ? 'SUR MESURE !' : 'TAILOR-MADE!');
          this.time.delayedCall(700, () => this.ctx.bus.emit('stage-won', 'msl'));
        } else {
          this.startRound(this.round + 1);
        }
      });
      return;
    }

    this.time.delayedCall(1300, () => {
      const kept: Phaser.GameObjects.Container[] = [];
      for (const line of this.answerLines) {
        const card = line.getData('card') as Card;
        if (card.fits) {
          card.state = 'kept';
          kept.push(line);
        } else {
          card.state = 'pool';
          this.drawCard(card);
          this.tweens.add({ targets: line, x: card.x + CARD_W / 2, y: card.y + CARD_H / 2, alpha: 0, duration: 250, onComplete: () => line.destroy() });
        }
      }
      // Keep good picks and remove their marks, then compact them to the top slots.
      this.answerLines = kept;
      this.picks = kept.map((l) => l.getData('card') as Card);
      kept.forEach((line, k) => {
        line.list.slice(2).forEach((o) => o.destroy());
        this.tweens.add({ targets: line, y: this.answerSlotY(k) + 10, duration: 200 });
      });
      this.status.setText('');
      this.judging = false;
    });
  }
}
