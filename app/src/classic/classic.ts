import './classic.css';
import './print.css';
import { education, highlights, jobs, person, skills } from '../data/resume';
import { degreeHtml, esc, jobHtml, linksHtml } from '../fragments';
import { t, ui } from '../i18n';
import { icon } from '../icons';
import { bindControls, controlsHtml } from '../controls';
import type { View } from '../main';

function html(): string {
  const eduItems = education.map(degreeHtml).join('');

  const hlItems = highlights
    .map(
      (h) => `
      <li>
        <a class="hl" href="${esc(h.url)}" target="_blank" rel="noopener">
          <span class="hl-name">${esc(h.name)} ${icon('external', 13)}</span>
          <span class="hl-text">${esc(t(h.text))}</span>
        </a>
      </li>`,
    )
    .join('');

  const skillGroups = skills
    .map(
      (g) => `
      <div class="skill-group">
        <h3 class="skill-title">${esc(t(g.group))}</h3>
        <ul class="tags">${g.items.map((s) => `<li>${esc(s)}</li>`).join('')}</ul>
      </div>`,
    )
    .join('');

  return `
  <div class="classic">
    <header class="topbar">
      <a class="monogram" href="#/" aria-label="${person.name}">P.</a>
      <div class="topbar-actions">
        ${controlsHtml()}
        <button type="button" class="icon-btn" data-action="print" aria-label="${t(ui.print)}" title="${t(ui.print)}">${icon('printer')}</button>
        <a class="btn btn-play" href="#/play">${icon('gamepad')}<span>${t(ui.play)}</span></a>
      </div>
    </header>

    <main>
      <section class="hero">
        <h1 class="name">${person.name}<span class="honorific">, ${person.honorific}</span></h1>
        <p class="headline">${t(ui.role)}</p>
        <p class="tagline">${t(ui.tagline)}</p>
        <nav class="links" aria-label="Links">${linksHtml()}</nav>
      </section>

      <p class="summary">${t(ui.summary)}</p>

      <section class="section" aria-labelledby="h-exp">
        <h2 id="h-exp" class="section-title">${t(ui.experience)}</h2>
        <ol class="timeline">${jobs.map((j) => jobHtml(j)).join('')}</ol>
      </section>

      <div class="split">
        <section class="section" aria-labelledby="h-edu">
          <h2 id="h-edu" class="section-title">${t(ui.education)}</h2>
          <ol class="mini-list">${eduItems}</ol>
        </section>
        <section class="section" aria-labelledby="h-os">
          <h2 id="h-os" class="section-title">${t(ui.openSource)}</h2>
          <ul class="hl-list">${hlItems}</ul>
        </section>
      </div>

      <section class="section" aria-labelledby="h-skills">
        <h2 id="h-skills" class="section-title">${t(ui.skills)}</h2>
        <div class="skills">${skillGroups}</div>
      </section>

      <a class="play-card" href="#/play">
        <span class="play-card-icon">${icon('gamepad', 28)}</span>
        <span class="play-card-text">${t(ui.playPitch)}</span>
        <span class="play-card-cta">${t(ui.play)} ${icon('arrowRight', 16)}</span>
      </a>
    </main>

    <footer class="footer">
      <span>© ${new Date().getFullYear()} ${person.name}</span>
      <a href="${person.links.github}/DeveauP.github.io" target="_blank" rel="noopener">${t(ui.footer)}</a>
    </footer>
  </div>`;
}

export function renderClassic(root: HTMLElement): View {
  const render = () => {
    root.innerHTML = html();
  };
  const onClick = (e: MouseEvent) => {
    if ((e.target as HTMLElement).closest('[data-action="print"]')) window.print();
  };

  render();
  const unbindControls = bindControls(root);
  root.addEventListener('click', onClick);
  window.addEventListener('langchange', render);

  return {
    destroy() {
      unbindControls();
      window.removeEventListener('langchange', render);
      root.removeEventListener('click', onClick);
    },
  };
}
