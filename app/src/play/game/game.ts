import Phaser from 'phaser';
import { BootScene } from './BootScene';
import { WorldScene } from './WorldScene';
import { PhdScene } from './PhdScene';
import { ConsultingScene } from './ConsultingScene';
import { UbisoftScene } from './UbisoftScene';
import { RealityLabsScene } from './RealityLabsScene';
import { PersonalisationScene } from './PersonalisationScene';
import type { GameCtx } from './context';

/**
 * Creates the Phaser game inside `parent`. The canvas is sized in device
 * pixels and displayed at CSS size (zoom = 1/dpr) so pixel art stays crisp on
 * high-density phone screens; scenes then zoom their cameras to fit.
 */
export function createGame(parent: HTMLElement, ctx: GameCtx): { game: Phaser.Game; destroy(): void } {
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const size = () => ({
    w: Math.max(1, Math.round(parent.clientWidth * dpr)),
    h: Math.max(1, Math.round(parent.clientHeight * dpr)),
  });
  const { w, h } = size();

  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: w,
    height: h,
    transparent: true,
    banner: false,
    scale: { mode: Phaser.Scale.NONE, zoom: 1 / dpr },
    render: { smoothPixelArt: true },
    physics: { default: 'arcade', arcade: { gravity: { x: 0, y: 900 } } },
    input: { activePointers: 3 },
    scene: [BootScene, WorldScene, PhdScene, ConsultingScene, UbisoftScene, RealityLabsScene, PersonalisationScene],
    callbacks: {
      preBoot: (g) => g.registry.set('ctx', ctx),
    },
  });

  // Dev-only handle for scripted playtests.
  if (import.meta.env.DEV) (window as unknown as { __game: Phaser.Game }).__game = game;

  const observer = new ResizeObserver(() => {
    const next = size();
    if (next.w !== game.scale.width || next.h !== game.scale.height) game.scale.resize(next.w, next.h);
  });
  observer.observe(parent);

  return {
    game,
    destroy() {
      observer.disconnect();
      game.destroy(true);
    },
  };
}
