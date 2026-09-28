import Phaser from 'phaser';
import { cellSheet, itemSheet, playerSheet } from '../art/sprites';
import type { Sheet } from '../art/pixels';
import * as scenery from '../art/scenery';
import { ITEMS, type ItemId } from '../stages';

function addSheet(scene: Phaser.Scene, key: string, sheet: Sheet): void {
  if (scene.textures.exists(key)) return;
  const tex = scene.textures.addCanvas(key, sheet.canvas)!;
  for (let i = 0; i < sheet.frames; i++) tex.add(i, 0, i * sheet.frameWidth, 0, sheet.frameWidth, sheet.frameHeight);
}

function addCanvas(scene: Phaser.Scene, key: string, canvas: HTMLCanvasElement): void {
  if (!scene.textures.exists(key)) scene.textures.addCanvas(key, canvas);
}

/** Generates every texture from code, waits for the pixel font, then starts the world. */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot');
  }

  async create(): Promise<void> {
    for (const outfit of ['polytechnique', 'university'] as const) {
      const key = `player-${outfit}`;
      addSheet(this, key, playerSheet(outfit));
      this.anims.create({ key: `${key}-run`, frames: this.anims.generateFrameNumbers(key, { frames: [1, 0, 2, 0] }), frameRate: 13, repeat: -1 });
    }
    for (const id of Object.keys(ITEMS) as ItemId[]) addSheet(this, `item-${id}`, itemSheet(id));
    for (let c = 0; c < 4; c++) addSheet(this, `cell-${c}`, cellSheet(c));

    for (const b of scenery.buildings()) addCanvas(this, b.key, b.canvas);
    addCanvas(this, 'ground', scenery.ground());
    addCanvas(this, 'hills-far', scenery.hillsFar());
    addCanvas(this, 'hills-near', scenery.hillsNear());
    addCanvas(this, 'cloud', scenery.cloud());
    addCanvas(this, 'platform', scenery.platform());
    addCanvas(this, 'gate', scenery.gate());
    addCanvas(this, 'signpost', scenery.signpost());
    addCanvas(this, 'tree', scenery.tree());
    addCanvas(this, 'bush', scenery.bush());
    addCanvas(this, 'finish', scenery.finishFlag());
    addCanvas(this, 'sparkle', scenery.sparkle());

    try {
      await document.fonts.load('8px Silkscreen');
    } catch {
      // Falls back to a system font.
    }
    this.scene.start('world');
  }
}
