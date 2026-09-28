import '@fontsource/silkscreen';
import '../classic/classic.css';
import './play.css';
import { education, jobs } from '../data/resume';
import { degreeHtml, esc, jobHtml } from '../fragments';
import { t, ui } from '../i18n';
import { icon } from '../icons';
import { bindControls, controlsHtml } from '../controls';
import type { View } from '../main';
import { frameDataUrl } from './art/pixels';
import { itemSheet, playerSheet } from './art/sprites';
import { Bus } from './bus';
import { createGame } from './game/game';
import { VirtualPad } from './input';
import { ITEMS, STAGES, stageById, type ItemId, type StageDef, type StageId } from './stages';
import { allDone, clearProgress, isUnlocked, loadProgress, saveProgress, type Outfit, type Progress } from './state';
import { s } from './strings';

type Dialog =
  | { kind: 'outfit' }
  | { kind: 'stage'; id: StageId }
  | { kind: 'won'; id: StageId }
  | { kind: 'menu' }
  | { kind: 'confirm-reset' }
  | { kind: 'finish' };

const memo = <K, V>(fn: (k: K) => V) => {
  const cache = new Map<K, V>();
  return (k: K) => {
    if (!cache.has(k)) cache.set(k, fn(k));
    return cache.get(k)!;
  };
};
const outfitPreview = memo((o: Outfit) => frameDataUrl(playerSheet(o), 0, 5));
const itemIcon = memo((id: ItemId) => frameDataUrl(itemSheet(id), 0, 4));

const stageLabel = (st: StageDef) => `${t(s.stage)} ${st.n} · ${t(st.title)}`;
const yearsOf = (st: StageDef) => (typeof st.years === 'string' ? st.years : t(st.years));

export function mountPlay(root: HTMLElement): View {
  const bus = new Bus();
  const pad = new VirtualPad();
  let progress: Progress = loadProgress();
  let region: StageId = 'education';
  let nearDoor: StageId | 'finish' | null = null;
  let dialog: Dialog | null = null;
  let activeStage: StageId | null = null;
  let stuck = false;
  let sheetOpen = false;
  let toastTimer = 0;

  root.innerHTML = `
    <div class="play">
      <header class="play-bar">
        <a class="icon-btn" href="#/" aria-label="${esc(t(ui.classic))}" title="${esc(t(ui.classic))}" data-i18n-label="classic">${icon('arrowLeft')}</a>
        <div class="bar-stage" aria-live="polite"></div>
        <ul class="bar-inventory"></ul>
        <button type="button" class="icon-btn" data-act="menu" data-i18n-label="menu">${menuIcon}</button>
      </header>
      <div class="play-main">
        <section class="stage">
          <div class="minihead"></div>
          <div class="canvas-wrap"></div>
          <div class="overlay">
            <div class="toast" role="status" hidden></div>
            <button type="button" class="door-prompt" data-act="door" hidden></button>
            <p class="keys-hint"></p>
          </div>
          <div class="dialog-layer" hidden></div>
        </section>
        <div class="controls">
          <div class="pad-group">
            <button type="button" class="pad-btn" data-pad="left">${icon('arrowLeft', 26)}</button>
            <button type="button" class="pad-btn" data-pad="right">${icon('arrowRight', 26)}</button>
          </div>
          <button type="button" class="pad-btn pad-jump" data-pad="jump"></button>
        </div>
        <aside class="panel"></aside>
      </div>
    </div>`;

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel)!;
  const el = {
    stage: $('.stage'),
    barStage: $('.bar-stage'),
    inventory: $('.bar-inventory'),
    minihead: $('.minihead'),
    canvas: $('.canvas-wrap'),
    toast: $('.toast'),
    prompt: $<HTMLButtonElement>('.door-prompt'),
    keysHint: $('.keys-hint'),
    dialogLayer: $('.dialog-layer'),
    controls: $('.controls'),
    panel: $('.panel'),
  };

  /* ---------- progress ---------- */

  const commit = () => {
    saveProgress(progress);
    bus.emit('progress');
    renderBar();
    renderPanel();
  };

  const complete = (id: StageId, withRewards: boolean) => {
    if (!progress.done.includes(id)) progress.done.push(id);
    if (withRewards) for (const item of stageById(id).rewards) if (!progress.items.includes(item)) progress.items.push(item);
    commit();
  };

  /* ---------- rendering ---------- */

  function renderBar() {
    const st = stageById(region);
    el.barStage.innerHTML = `<span class="bar-kicker">${esc(t(s.stage))} ${st.n}/6</span><span class="bar-title">${esc(t(st.title))}</span>`;
    el.inventory.setAttribute('aria-label', t(s.inventory));
    el.inventory.innerHTML = progress.items
      .map((id) => `<li title="${esc(t(ITEMS[id]))}"><img src="${itemIcon(id)}" alt="${esc(t(ITEMS[id]))}" /></li>`)
      .join('');
    root.querySelector('[data-i18n-label="menu"]')!.setAttribute('aria-label', t(s.menu));
  }

  function renderPanel() {
    const st = stageById(activeStage ?? region);
    const entries = st.resume
      .map((ref) => {
        if (ref.kind === 'education') return `<ol class="mini-list">${education.map(degreeHtml).join('')}</ol>`;
        const job = jobs.find((j) => j.id === ref.id);
        return job ? `<ol class="timeline">${jobHtml(job, ref.roles)}</ol>` : '';
      })
      .join('');
    el.panel.dataset.open = String(sheetOpen);
    el.panel.innerHTML = `
      <button type="button" class="panel-toggle" data-act="sheet" aria-expanded="${sheetOpen}">
        <span>${esc(stageLabel(st))}</span>
        <span class="panel-toggle-cta">${esc(t(s.resume))} <span class="chev" aria-hidden="true">▴</span></span>
      </button>
      <div class="panel-body">
        <p class="panel-kicker">${esc(t(s.stage))} ${st.n} · ${esc(yearsOf(st))}</p>
        <h2 class="panel-title">${esc(t(st.title))}</h2>
        <p class="panel-place">${esc(st.place)}</p>
        <p class="panel-story">${esc(t(st.story))}</p>
        ${entries}
        <a class="panel-link" href="#/">${esc(t(ui.classic))} ${icon('arrowRight', 14)}</a>
      </div>`;
  }

  function renderPrompt() {
    if (!nearDoor || dialog || activeStage) {
      el.prompt.hidden = true;
      return;
    }
    const label =
      nearDoor === 'finish' ? t(s.finish) : nearDoor === 'education' ? `${t(s.pickOutfit)}` : `${t(s.enter)} · ${stageById(nearDoor).place}`;
    el.prompt.innerHTML = `<kbd>E</kbd><span>${esc(label)}</span>`;
    el.prompt.hidden = false;
  }

  function renderMinihead() {
    el.stage.toggleAttribute('data-mini', !!activeStage);
    el.controls.hidden = !!activeStage;
    if (!activeStage) {
      el.minihead.innerHTML = '';
      return;
    }
    const st = stageById(activeStage);
    el.minihead.innerHTML = `
      <div class="mh-top">
        <div>
          <p class="mh-kicker">${esc(stageLabel(st))}</p>
          <p class="mh-howto">${esc(t(st.howTo ?? st.story))}</p>
        </div>
        <button type="button" class="icon-btn" data-act="mg-exit" aria-label="${esc(t(s.exit))}" title="${esc(t(s.exit))}">✕</button>
      </div>
      ${stuck ? `<p class="mh-stuck" role="alert">${esc(t(s.stuck))}</p>` : ''}
      <div class="mh-actions">
        <button type="button" class="btn btn-soft${stuck ? ' btn-attn' : ''}" data-act="mg-reset">${esc(t(s.reset))}</button>
        <button type="button" class="btn btn-ghost" data-act="mg-skip">${esc(t(s.skip))}</button>
      </div>`;
  }

  function renderStatic() {
    el.keysHint.textContent = t(s.keysHint);
    root.querySelector('[data-pad="left"]')!.setAttribute('aria-label', t(s.left));
    root.querySelector('[data-pad="right"]')!.setAttribute('aria-label', t(s.right));
    root.querySelector('[data-pad="jump"]')!.textContent = t(s.jump);
    const back = root.querySelector('[data-i18n-label="classic"]')!;
    back.setAttribute('aria-label', t(ui.classic));
    back.setAttribute('title', t(ui.classic));
  }

  function dialogHtml(d: Dialog): string {
    switch (d.kind) {
      case 'outfit': {
        const opt = (o: Outfit, title: string, sub: string) => `
          <button type="button" class="outfit${progress.outfit === o ? ' is-current' : ''}" data-act="outfit" data-outfit="${o}">
            <img src="${outfitPreview(o)}" alt="" />
            <span class="outfit-title">${esc(title)}</span>
            <span class="outfit-sub">${esc(sub)}</span>
          </button>`;
        return `
          <p class="dlg-kicker">${esc(stageLabel(stageById('education')))} · 2010</p>
          <h2 class="dlg-title">${esc(t(s.pickOutfit))}</h2>
          <p class="dlg-text">${esc(t(s.outfitIntro))}</p>
          <div class="outfits">
            ${opt('polytechnique', t(s.outfitPolytechnique), t(s.outfitPolytechniqueSub))}
            ${opt('university', t(s.outfitSWE), t(s.outfitSWESub))}
          </div>
          ${progress.outfit ? `<div class="dlg-actions"><button type="button" class="btn btn-ghost" data-act="close">${esc(t(s.close))}</button></div>` : ''}`;
      }
      case 'stage': {
        const st = stageById(d.id);
        const done = progress.done.includes(d.id);
        const actions = st.scene
          ? `<button type="button" class="btn btn-primary" data-act="start" data-id="${d.id}">${esc(t(done ? s.replay : s.start))}</button>
             ${done ? '' : `<button type="button" class="btn btn-ghost" data-act="skip" data-id="${d.id}">${esc(t(s.skip))}</button>`}`
          : `${done ? '' : `<button type="button" class="btn btn-primary" data-act="skip" data-id="${d.id}">${esc(t(s.skipForNow))}</button>`}`;
        return `
          <p class="dlg-kicker">${esc(t(s.stage))} ${st.n} · ${esc(yearsOf(st))}</p>
          <h2 class="dlg-title">${esc(t(st.title))}</h2>
          <p class="dlg-place">${esc(st.place)}</p>
          <p class="dlg-text">${esc(t(st.story))}</p>
          ${st.scene ? '' : `<p class="dlg-note">${esc(t(s.comingSoon))}</p>`}
          <div class="dlg-actions">
            ${actions}
            <button type="button" class="btn btn-ghost" data-act="close">${esc(t(s.close))}</button>
          </div>`;
      }
      case 'won': {
        const st = stageById(d.id);
        const items = st.rewards
          .map((id) => `<li><img src="${itemIcon(id)}" alt="" /><span>${esc(t(ITEMS[id]))}</span></li>`)
          .join('');
        return `
          <p class="dlg-kicker">${esc(stageLabel(st))}</p>
          <h2 class="dlg-title">${esc(t(s.stageComplete))}</h2>
          <p class="dlg-text">${esc(t(s.unlocked))}:</p>
          <ul class="rewards">${items}</ul>
          <div class="dlg-actions">
            <button type="button" class="btn btn-primary" data-act="continue" data-id="${d.id}">${esc(t(s.continue))}</button>
          </div>`;
      }
      case 'menu': {
        const rows = STAGES.map((st) => {
          const open = isUnlocked(progress, st.id);
          const done = progress.done.includes(st.id);
          const status = done ? `${icon('check', 13)} ${esc(t(s.done))}` : open ? '' : `${icon('lock', 13)} ${esc(t(s.locked))}`;
          return `
            <li class="menu-row${open ? '' : ' is-locked'}">
              <span class="menu-n">${st.n}</span>
              <span class="menu-name">${esc(t(st.title))}<small>${esc(yearsOf(st))}</small></span>
              <span class="menu-status">${status}</span>
              ${open ? `<button type="button" class="btn btn-soft btn-sm" data-act="travel" data-id="${st.id}">${esc(t(s.travel))}</button>` : ''}
            </li>`;
        }).join('');
        return `
          <h2 class="dlg-title">${esc(t(s.menu))}</h2>
          <ol class="menu-list">${rows}</ol>
          <div class="menu-controls">${controlsHtml()}</div>
          <div class="dlg-actions">
            <button type="button" class="btn btn-ghost btn-danger" data-act="ask-reset">${esc(t(s.resetProgress))}</button>
            <button type="button" class="btn btn-primary" data-act="close">${esc(t(s.close))}</button>
          </div>`;
      }
      case 'confirm-reset':
        return `
          <h2 class="dlg-title">${esc(t(s.resetProgress))}</h2>
          <p class="dlg-text">${esc(t(s.resetConfirm))}</p>
          <div class="dlg-actions">
            <button type="button" class="btn btn-primary btn-danger-solid" data-act="do-reset">${esc(t(s.resetProgress))}</button>
            <button type="button" class="btn btn-ghost" data-act="menu">${esc(t(s.close))}</button>
          </div>`;
      case 'finish':
        return `
          <p class="dlg-kicker">${icon('flag', 14)} ${esc(t(s.finish))}</p>
          <h2 class="dlg-title">${esc(t(s.finishTitle))}</h2>
          <p class="dlg-text">${esc(t(allDone(progress) && STAGES.every((st) => !st.scene || progress.items.includes(st.rewards[0])) ? s.finishBody : s.finishEarly))}</p>
          <div class="dlg-actions">
            <a class="btn btn-primary" href="#/">${esc(t(ui.classic))}</a>
            <a class="btn btn-soft" href="https://www.linkedin.com/in/deveaupaul/" target="_blank" rel="noopener">${icon('linkedin', 16)} LinkedIn</a>
            <button type="button" class="btn btn-ghost" data-act="close">${esc(t(s.close))}</button>
          </div>`;
    }
  }

  function renderDialog() {
    if (!dialog) {
      el.dialogLayer.hidden = true;
      el.dialogLayer.innerHTML = '';
      return;
    }
    el.dialogLayer.hidden = false;
    el.dialogLayer.innerHTML = `<div class="dialog" role="dialog" aria-modal="true">${dialogHtml(dialog)}</div>`;
  }

  function renderAll() {
    renderBar();
    renderPanel();
    renderPrompt();
    renderMinihead();
    renderStatic();
    renderDialog();
  }

  /* ---------- dialogs & toasts ---------- */

  function openDialog(d: Dialog) {
    const wasOpen = !!dialog;
    dialog = d;
    renderDialog();
    renderPrompt();
    if (!wasOpen) bus.emit('ui-modal', true);
    el.dialogLayer.querySelector<HTMLElement>('button, a')?.focus({ preventScroll: true });
  }

  function closeDialog() {
    if (!dialog) return;
    dialog = null;
    renderDialog();
    renderPrompt();
    // Return keyboard focus to the game so Space jumps instead of re-clicking a button.
    (document.activeElement as HTMLElement | null)?.blur();
    bus.emit('ui-modal', false);
  }

  function toast(html: string) {
    el.toast.innerHTML = html;
    el.toast.hidden = false;
    el.toast.classList.remove('is-in');
    void el.toast.offsetWidth;
    el.toast.classList.add('is-in');
    clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => (el.toast.hidden = true), 2800);
  }

  /* ---------- mini-games ---------- */

  function startStage(id: StageId) {
    closeDialog();
    // A leftover toast would cover the mini-game's instructions.
    clearTimeout(toastTimer);
    el.toast.hidden = true;
    activeStage = id;
    stuck = false;
    renderMinihead();
    renderPrompt();
    renderPanel();
    bus.emit('stage-start', id);
  }

  function exitStage() {
    if (!activeStage) return;
    activeStage = null;
    stuck = false;
    renderMinihead();
    renderPrompt();
    renderPanel();
    bus.emit('stage-exit');
  }

  const gateToast = (id: StageId) => {
    const next = STAGES[stageById(id).n];
    if (next) toast(`<strong>${esc(t(s.stageComplete))}</strong> ${esc(t(s.gateOpen))}`);
  };

  /* ---------- bus (game → UI) ---------- */

  const offBus = [
    bus.on('near-door', (id) => {
      nearDoor = id;
      renderPrompt();
    }),
    bus.on('region', (id) => {
      region = id;
      renderBar();
      renderPanel();
    }),
    bus.on('door-action', (id) => {
      if (id === 'finish') openDialog({ kind: 'finish' });
      else if (id === 'education') openDialog({ kind: 'outfit' });
      else openDialog({ kind: 'stage', id });
    }),
    bus.on('collect', (id) => {
      if (!progress.items.includes(id)) progress.items.push(id);
      commit();
      const edu = stageById('education');
      if (!progress.done.includes('education') && edu.rewards.every((r) => progress.items.includes(r))) {
        complete('education', true);
        gateToast('education');
      } else {
        toast(`<img src="${itemIcon(id)}" alt="" /><span>${esc(t(s.collected))}: <strong>${esc(t(ITEMS[id]))}</strong></span>`);
      }
    }),
    bus.on('stage-won', (id) => openDialog({ kind: 'won', id })),
    bus.on('stage-stuck', () => {
      stuck = true;
      renderMinihead();
    }),
  ];

  /* ---------- DOM events ---------- */

  const onClick = (e: MouseEvent) => {
    const target = (e.target as HTMLElement).closest<HTMLElement>('[data-act]');
    if (!target) {
      if (e.target === el.dialogLayer && dialog && dialog.kind !== 'won' && !(dialog.kind === 'outfit' && !progress.outfit)) closeDialog();
      return;
    }
    const id = target.dataset.id as StageId | undefined;
    switch (target.dataset.act) {
      case 'door':
        if (nearDoor) bus.emit('door-action', nearDoor);
        break;
      case 'outfit': {
        const first = !progress.outfit;
        progress.outfit = target.dataset.outfit as Outfit;
        commit();
        closeDialog();
        if (first) toast(esc(t(s.collectHint)));
        break;
      }
      case 'close':
        closeDialog();
        break;
      case 'start':
        startStage(id!);
        break;
      case 'skip':
        complete(id!, false);
        closeDialog();
        gateToast(id!);
        break;
      case 'continue':
        closeDialog();
        complete(id!, true);
        exitStage();
        gateToast(id!);
        break;
      case 'menu':
        openDialog({ kind: 'menu' });
        break;
      case 'travel':
        closeDialog();
        bus.emit('teleport', id!);
        break;
      case 'ask-reset':
        openDialog({ kind: 'confirm-reset' });
        break;
      case 'do-reset':
        clearProgress();
        progress = loadProgress();
        closeDialog();
        restartGame();
        break;
      case 'sheet':
        sheetOpen = !sheetOpen;
        renderPanel();
        break;
      case 'mg-reset':
        stuck = false;
        renderMinihead();
        bus.emit('stage-reset');
        break;
      case 'mg-skip': {
        const stage = activeStage!;
        exitStage();
        complete(stage, false);
        gateToast(stage);
        break;
      }
      case 'mg-exit':
        exitStage();
        break;
    }
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key !== 'Escape') return;
    if (dialog && dialog.kind !== 'won' && !(dialog.kind === 'outfit' && !progress.outfit)) closeDialog();
    else if (sheetOpen) {
      sheetOpen = false;
      renderPanel();
    } else if (activeStage && !dialog) exitStage();
  };

  // Touch pad: pointer capture keeps a held button pressed even if the finger slides.
  const padDown = (e: PointerEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pad]');
    if (!btn) return;
    e.preventDefault();
    btn.setPointerCapture(e.pointerId);
    btn.classList.add('is-down');
    const key = btn.dataset.pad;
    if (key === 'left') pad.left = true;
    else if (key === 'right') pad.right = true;
    else pad.pressJump();
  };
  const padUp = (e: PointerEvent) => {
    const btn = (e.target as HTMLElement).closest<HTMLElement>('[data-pad]');
    if (!btn) return;
    btn.classList.remove('is-down');
    const key = btn.dataset.pad;
    if (key === 'left') pad.left = false;
    else if (key === 'right') pad.right = false;
    else pad.releaseJump();
  };
  const noMenu = (e: Event) => e.preventDefault();

  root.addEventListener('click', onClick);
  window.addEventListener('keydown', onKey);
  el.controls.addEventListener('pointerdown', padDown);
  el.controls.addEventListener('pointerup', padUp);
  el.controls.addEventListener('pointercancel', padUp);
  el.controls.addEventListener('contextmenu', noMenu);
  const unbindControls = bindControls(root);

  const onLang = () => renderAll();
  window.addEventListener('langchange', onLang);

  /* ---------- game ---------- */

  const ctx = { bus, pad, progress: () => progress, isModalOpen: () => !!dialog };
  let game = createGame(el.canvas, ctx);

  function restartGame() {
    activeStage = null;
    stuck = false;
    region = 'education';
    nearDoor = null;
    game.destroy();
    game = createGame(el.canvas, ctx);
    renderAll();
    if (!progress.outfit) openDialog({ kind: 'outfit' });
  }

  renderAll();
  if (!progress.outfit) openDialog({ kind: 'outfit' });

  return {
    destroy() {
      clearTimeout(toastTimer);
      offBus.forEach((off) => off());
      bus.clear();
      game.destroy();
      unbindControls();
      root.removeEventListener('click', onClick);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('langchange', onLang);
    },
  };
}

const menuIcon =
  '<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>';
