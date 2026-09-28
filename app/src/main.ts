import '@fontsource-variable/inter';
import '@fontsource/instrument-serif';
import './styles/base.css';
import { renderClassic } from './classic/classic';

/** A mounted view; `destroy` releases listeners, canvases, audio, etc. */
export interface View {
  destroy(): void;
}

const root = document.getElementById('app')!;
let current: View | null = null;

async function route(): Promise<void> {
  current?.destroy();
  current = null;
  root.replaceChildren();

  if (location.hash.startsWith('#/play')) {
    document.body.dataset.view = 'play';
    // The interactive view is code-split so the classic resume stays light.
    const { mountPlay } = await import('./play/play');
    current = mountPlay(root);
  } else {
    document.body.dataset.view = 'classic';
    current = renderClassic(root);
  }
  window.scrollTo(0, 0);
}

window.addEventListener('hashchange', route);
route();
