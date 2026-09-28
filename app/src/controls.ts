import { LANGS, getLang, setLang, t, ui } from './i18n';
import { icon } from './icons';

type Theme = 'light' | 'dark';

function effectiveTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === 'light' || forced === 'dark') return forced;
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function toggleTheme(): void {
  const next: Theme = effectiveTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  try {
    localStorage.setItem('theme', next);
  } catch {
    // Non-fatal.
  }
}

/** Language switch + theme toggle markup, shared by both views. */
export function controlsHtml(): string {
  const lang = getLang();
  const langButtons = LANGS.map(
    (l) =>
      `<button type="button" data-lang="${l}" aria-pressed="${l === lang}">${l.toUpperCase()}</button>`,
  ).join('');
  return `
    <div class="segmented" role="group" aria-label="${t(ui.langLabel)}">${langButtons}</div>
    <button type="button" class="icon-btn" data-action="theme" aria-label="${t(ui.themeToggle)}" title="${t(ui.themeToggle)}">
      <span class="only-light">${icon('moon')}</span><span class="only-dark">${icon('sun')}</span>
    </button>`;
}

/** Wires clicks for anything rendered by `controlsHtml` inside `scope`; returns an unbind function. */
export function bindControls(scope: HTMLElement): () => void {
  const onClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-lang],[data-action="theme"]');
    if (!target) return;
    if (target.dataset.lang) setLang(target.dataset.lang as (typeof LANGS)[number]);
    else toggleTheme();
  };
  scope.addEventListener('click', onClick);
  return () => scope.removeEventListener('click', onClick);
}
