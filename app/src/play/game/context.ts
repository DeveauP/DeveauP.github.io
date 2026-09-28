import type Phaser from 'phaser';
import type { Bus } from '../bus';
import type { VirtualPad } from '../input';
import type { Progress } from '../state';

/** Shared services handed to every scene through the game registry. */
export interface GameCtx {
  bus: Bus;
  pad: VirtualPad;
  progress(): Progress;
  /** Whether a DOM dialog is open (the world ignores input meanwhile). */
  isModalOpen(): boolean;
}

export const getCtx = (scene: Phaser.Scene): GameCtx => scene.registry.get('ctx') as GameCtx;

/** Reads a CSS custom property from the page so scenes follow the light/dark theme. */
export const cssVar = (name: string): string =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

/** Zooms and centres the camera so a design area of w×h fits the canvas. */
export function fitCamera(scene: Phaser.Scene, w: number, h: number, pad = 10): number {
  const cam = scene.cameras.main;
  const z = Math.min(scene.scale.width / (w + pad * 2), scene.scale.height / (h + pad * 2));
  cam.setViewport(0, 0, scene.scale.width, scene.scale.height);
  cam.setZoom(z);
  cam.centerOn(w / 2, h / 2);
  return z;
}
