export const LANGS = ['en', 'fr'] as const;
export type Lang = (typeof LANGS)[number];
/** A localized string: one entry per supported language. */
export type L = Record<Lang, string>;

const STORAGE_KEY = 'lang';

function detect(): Lang {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored && (LANGS as readonly string[]).includes(stored)) return stored as Lang;
  } catch {
    // Storage can be unavailable (private mode, blocked site data).
  }
  return navigator.language.toLowerCase().startsWith('fr') ? 'fr' : 'en';
}

let current: Lang = detect();
document.documentElement.lang = current;

export const getLang = (): Lang => current;

export const t = (s: L): string => s[current];

export function setLang(lang: Lang): void {
  if (lang === current) return;
  current = lang;
  document.documentElement.lang = lang;
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    // Non-fatal: the choice just won't persist.
  }
  window.dispatchEvent(new CustomEvent('langchange', { detail: lang }));
}

/** Interface strings shared by the classic and interactive views. */
export const ui = {
  role: {
    en: 'ML Engineering Leader · LLM agents, evaluation & data platforms',
    fr: 'Leader en ingénierie ML · agents LLM, évaluation & plateformes de données',
  },
  tagline: {
    en: 'From cancer genomics to AI agents: I build and lead ML teams that take research to production.',
    fr: 'De la génomique du cancer aux agents IA : je construis et dirige des équipes ML qui mènent la recherche jusqu’à la production.',
  },
  // The <br> keeps the distinctions on their own line.
  summary: {
    en: 'PhD-trained ML leader with nearly a decade of industry experience. Built and led an ML &amp; Data Analytics team from scratch at Ubisoft. At Meta, shipped audio-driven facial animation on Quest headsets, then owned the annotation platform behind Muse and evaluation pipelines for Meta AI at Meta Superintelligence Labs.<br>Kaggle Competition Expert (top 3%) · CodinGame Master (top 0.2%)',
    fr: 'Docteur et leader en ML, avec près de dix ans d’expérience en entreprise. J’ai créé et dirigé une équipe ML &amp; Data Analytics chez Ubisoft. Chez Meta, j’ai livré l’animation faciale pilotée par l’audio sur les casques Quest, puis piloté la plateforme d’annotation et les pipelines d’évaluation de Muse chez Meta Superintelligence Labs.<br>Kaggle Competition Expert (top 3 %) · CodinGame Master (top 0,2 %)',
  },
  experience: { en: 'Experience', fr: 'Expérience' },
  education: { en: 'Education', fr: 'Formation' },
  openSource: { en: 'Open source & competitions', fr: 'Open source & compétitions' },
  skills: { en: 'Skills', fr: 'Compétences' },
  present: { en: 'present', fr: 'aujourd’hui' },
  print: { en: 'Save as PDF', fr: 'Enregistrer en PDF' },
  play: { en: 'Play my career', fr: 'Jouer mon parcours' },
  playPitch: {
    en: 'Prefer to explore? My career is also a six-stage platformer, playable on your phone.',
    fr: 'Envie d’explorer ? Mon parcours existe aussi en jeu de plateforme en six niveaux, jouable sur mobile.',
  },
  classic: { en: 'Classic view', fr: 'Vue classique' },
  themeToggle: { en: 'Toggle dark mode', fr: 'Basculer le mode sombre' },
  langLabel: { en: 'Language', fr: 'Langue' },
  draft: { en: 'draft · dev only', fr: 'brouillon · dev uniquement' },
  footer: {
    en: 'Built with Vite and TypeScript. Source on GitHub.',
    fr: 'Construit avec Vite et TypeScript. Code source sur GitHub.',
  },
  comingSoon: {
    en: 'The interactive version is under construction.',
    fr: 'La version interactive est en construction.',
  },
} satisfies Record<string, L>;
