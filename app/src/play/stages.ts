import type { L } from '../i18n';

export type StageId = 'education' | 'phd' | 'consulting' | 'ubisoft' | 'reality-labs' | 'msl';
export type ItemId = 'eng-degree' | 'm2' | 'phd-diploma' | 'mold-broken' | 'balanced-team' | 'perfect-o' | 'tailor-made';

/** Which resume entries the side panel shows for a stage. */
export type ResumeRef = { kind: 'education' } | { kind: 'job'; id: string; roles?: number[] };

export interface StageDef {
  id: StageId;
  n: number;
  title: L;
  place: string;
  years: string | L;
  story: L;
  /** Instructions shown in the mini-game header. */
  howTo?: L;
  /** Phaser scene key; undefined = not built yet ("coming soon"). */
  scene?: string;
  rewards: ItemId[];
  resume: ResumeRef[];
}

export const STAGES: StageDef[] = [
  {
    id: 'education',
    n: 1,
    title: { en: 'Education', fr: 'Formation' },
    place: 'École Polytechnique · Paris Descartes',
    years: '2010 – 2014',
    story: {
      en: 'Pick your outfit: Polytechnique’s grand uniform and bicorne, or the classic SWE style: jeans and a t-shirt. Then jump up and grab both diplomas.',
      fr: 'Choisissez votre tenue : le grand uniforme de Polytechnique et son bicorne, ou le style développeur: jean et t-shirt. Puis sautez pour attraper les deux diplômes.',
    },
    rewards: ['eng-degree', 'm2'],
    resume: [{ kind: 'education' }],
  },
  {
    id: 'phd',
    n: 2,
    title: { en: 'PhD', fr: 'Doctorat' },
    place: 'Institut Curie',
    years: '2014 – 2017',
    story: {
      en: 'A tumour is a mix of subclones. My PhD built clustering methods, like the QuantumClone R package, to untangle them from genomic data.',
      fr: 'Une tumeur est un mélange de sous-clones. Ma thèse a développé des méthodes de clustering, comme le package R QuantumClone, pour les démêler à partir de données génomiques.',
    },
    howTo: {
      en: 'Each colour is a subclone, and one cell of each has strayed into another cluster. Drag exactly one cell per colour so every cell ends up closest to its own clone’s centre (✕).',
      fr: 'Chaque couleur est un sous-clone, et une cellule de chacun s’est égarée dans un autre groupe. Déplacez exactement une cellule par couleur pour que chaque cellule soit au plus près du centre de son clone (✕).',
    },
    scene: 'phd',
    rewards: ['phd-diploma'],
    resume: [{ kind: 'job', id: 'curie' }],
  },
  {
    id: 'consulting',
    n: 3,
    title: { en: 'Consulting', fr: 'Conseil' },
    place: 'Quinten · Converteo',
    years: '2017 – 2019',
    story: {
      en: '“PhDs are too specialised,” French recruiters kept telling me. Time to break the mold.',
      fr: '« Les docteurs sont trop spécialisés », me répétaient les recruteurs. Il est temps de briser le moule.',
    },
    howTo: {
      en: 'Drag (or use ← →) to move the paddle, tap or press Space to launch. Break every skill brick to shatter the mold. Riveted bricks take two hits.',
      fr: 'Faites glisser (ou ← →) pour déplacer la raquette, touchez ou appuyez sur Espace pour lancer. Cassez toutes les briques pour briser le moule. Les briques rivetées demandent deux coups.',
    },
    scene: 'consulting',
    rewards: ['mold-broken'],
    resume: [
      { kind: 'job', id: 'converteo' },
      { kind: 'job', id: 'quinten' },
    ],
  },
  {
    id: 'ubisoft',
    n: 4,
    title: { en: 'Ubisoft', fr: 'Ubisoft' },
    place: 'Ubisoft',
    years: '2019 – 2022',
    story: {
      en: 'As Lead Data Scientist, the job was balance: team management, gender equality and technical supervision, all fed by the same pipeline.',
      fr: 'En tant que Lead Data Scientist, tout était affaire d’équilibre : management, égalité femmes-hommes et supervision technique, alimentés par le même pipeline.',
    },
    howTo: {
      en: 'Tap a router (or press 1 / 2) to rotate it. Packets lost in meetings (zZ) never reach a goal. Keep all three gauges in the green band for 3 seconds.',
      fr: 'Touchez un routeur (ou 1 / 2) pour le faire pivoter. Les paquets perdus en réunion (zZ) n’arrivent jamais. Gardez les trois jauges dans la zone verte pendant 3 secondes.',
    },
    scene: 'ubisoft',
    rewards: ['balanced-team'],
    resume: [{ kind: 'job', id: 'ubisoft' }],
  },
  {
    id: 'reality-labs',
    n: 5,
    title: { en: 'Reality Labs', fr: 'Reality Labs' },
    place: 'Meta Reality Labs',
    years: '2022 – 2025',
    story: {
      en: 'Audio2Expression animates an avatar’s face from voice alone. It shipped on every Quest headset and in Batman: Arkham Shadow. Can you match the target mouth shape?',
      fr: 'Audio2Expression anime le visage d’un avatar à partir de la voix seule. Il est livré sur tous les casques Quest et dans Batman: Arkham Shadow. Saurez-vous reproduire la forme de bouche demandée ?',
    },
    howTo: {
      en: 'Drag on the face (up/down opens the jaw, left/right widens the lips) or use the arrow keys to match each target mouth.',
      fr: 'Faites glisser sur le visage (haut/bas ouvre la mâchoire, gauche/droite étire les lèvres) ou utilisez les flèches pour reproduire chaque bouche cible.',
    },
    scene: 'reality-labs',
    rewards: ['perfect-o'],
    resume: [{ kind: 'job', id: 'meta-msl', roles: [1] }],
  },
  {
    id: 'msl',
    n: 6,
    title: { en: 'Superintelligence Labs', fr: 'Superintelligence Labs' },
    place: 'Meta Superintelligence Labs',
    years: '2025 – 2026',
    story: {
      en: 'Web agents, personalisation for Meta AI, and the data annotation platform behind Muse.',
      fr: 'Agents web, personnalisation de Meta AI et plateforme d’annotation de données derrière Muse.',
    },
    howTo: {
      en: 'Meta AI remembers a few things about each user. Tap the three suggestions that fit them best: the judge keeps good picks and bounces the rest back. Personalise three answers to finish.',
      fr: 'Meta AI se souvient de quelques informations sur chaque utilisateur. Touchez les trois suggestions qui lui conviennent le mieux : le juge garde les bons choix et renvoie les autres. Personnalisez trois réponses pour finir.',
    },
    scene: 'msl',
    rewards: ['tailor-made'],
    resume: [{ kind: 'job', id: 'meta-msl', roles: [0] }],
  },
];

export const stageById = (id: StageId): StageDef => STAGES.find((s) => s.id === id)!;

export const ITEMS: Record<ItemId, L> = {
  'eng-degree': { en: 'Engineering degree', fr: 'Diplôme d’ingénieur' },
  m2: { en: 'Master’s degree', fr: 'Master 2' },
  'phd-diploma': { en: 'PhD diploma', fr: 'Diplôme de doctorat' },
  'mold-broken': { en: 'Mold broken', fr: 'Moule brisé' },
  'balanced-team': { en: 'Balanced team', fr: 'Équipe équilibrée' },
  'perfect-o': { en: 'Perfect “O”', fr: '« O » parfait' },
  'tailor-made': { en: 'Tailor-made', fr: 'Sur mesure' },
};
