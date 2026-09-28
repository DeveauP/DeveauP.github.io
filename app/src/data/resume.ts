import type { L } from '../i18n';

/**
 * Single source of truth for the resume. Both the classic view and the
 * interactive game read from here.
 *
 * Items marked `draft: true` are only rendered by the dev server (with a
 * visible badge) and are stripped from production builds until confirmed.
 */

export interface Bullet {
  text: L;
  draft?: boolean;
}

export interface Role {
  title: L;
  team?: L;
  /** Role dates, when a job spans several roles. */
  start?: number;
  end?: number;
  bullets: Bullet[];
}

export interface Job {
  id: string;
  company: string;
  start: number;
  end?: number; // undefined = present
  roles: Role[];
  tags: string[];
}

export interface Degree {
  school: L;
  start: number;
  end: number;
  degree: L;
  detail: L;
}

export interface Highlight {
  name: string;
  url: string;
  text: L;
}

export const person = {
  name: 'Paul Deveau',
  honorific: 'PhD',
  links: {
    linkedin: 'https://www.linkedin.com/in/deveaupaul/',
    github: 'https://github.com/DeveauP',
    scholar: 'https://scholar.google.com/citations?user=ekPsJ_cAAAAJ',
  },
};

export const jobs: Job[] = [
  {
    id: 'meta-msl',
    company: 'Meta',
    start: 2022,
    end: 2026,
    tags: ['LLM agents', 'Synthetic data', 'LLM evaluation', 'Personalisation', 'Data annotation'],
    roles: [
      {
        title: { en: 'Senior Research Engineer, ML', fr: 'Senior Research Engineer, ML' },
        team: { en: 'Meta Superintelligence Labs', fr: 'Meta Superintelligence Labs' },
        start: 2025,
        end: 2026,
        bullets: [
          {
            text: {
              en: 'Web browsing agents: improved agent tooling, raising the success rate on GAIA web tasks to 49% (+7 pts).',
              fr: 'Agents de navigation web : amélioration de l’outillage de l’agent, portant son taux de réussite sur les tâches web de GAIA à 49 % (+7 pts).',
            },
          },
          {
            text: {
              en: 'Developed the synthetic training-data generation and model evaluation pipeline for responses to trending topics and personalisation in Meta AI 2.0: better alignment with human evals and 70% fewer LLM-judge calls than the previous pipeline, at equal quality.',
              fr: 'Développement du pipeline de génération de données d’entraînement synthétiques et d’évaluation des modèles pour les réponses aux sujets d’actualité et la personnalisation dans Meta AI 2.0 : meilleur alignement avec les évaluations humaines et 70 % d’appels aux juges LLM en moins par rapport au pipeline existant, à qualité égale.',
            },
          },
          {
            text: {
              en: 'In charge of the Muse Annotation Platform, where internal and third-party annotators evaluate models in an agentic environment for preference reward modelling and multimodal evaluations.',
              fr: 'Responsable de la Muse Annotation Platform, qui permet aux annotateurs internes et externes d’évaluer les modèles dans un environnement agentique, pour la modélisation de la récompense par préférences et les évaluations multimodales.',
            },
          },
        ],
      },
      {
        title: { en: 'Senior Software Engineer, ML', fr: 'Senior Software Engineer, ML' },
        team: { en: 'Reality Labs', fr: 'Reality Labs' },
        start: 2022,
        end: 2025,
        bullets: [
          {
            text: {
              en: 'Core contributor to Audio2Expression, facial animation driven by audio only, shipped on Quest 2, Quest 3 and Quest Pro through the Movement SDK and used in Batman: Arkham Shadow (Best VR/AR Game, The Game Awards 2024). Implemented losses and metrics that filter out jittery checkpoints (up to 25% of them).',
              fr: 'Contributeur principal d’Audio2Expression, animation faciale pilotée uniquement par l’audio, déployée sur Quest 2, Quest 3 et Quest Pro via le Movement SDK et utilisée dans Batman: Arkham Shadow (meilleur jeu VR/AR, The Game Awards 2024). Implémentation de fonctions de perte et de métriques filtrant les checkpoints instables (jusqu’à 25 % d’entre eux).',
            },
          },
          {
            text: {
              en: 'Codec Avatars: owned quality evaluation for the audio-video Codec Avatar models.',
              fr: 'Codec Avatars : responsable de l’évaluation qualité des modèles Codec Avatar audio-vidéo.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'ubisoft',
    company: 'Ubisoft',
    start: 2019,
    end: 2022,
    tags: ['Team lead', 'NLP', 'People analytics', 'KPIs'],
    roles: [
      {
        title: { en: 'Lead Data Scientist', fr: 'Lead Data Scientist' },
        bullets: [
          {
            text: {
              en: 'Built from scratch and managed a team of ML engineers and data analysts focused on HR processes.',
              fr: 'Création et management, à partir de zéro, d’une équipe d’ingénieurs ML et de data analysts dédiée aux processus RH.',
            },
          },
          {
            text: {
              en: 'NLP: retrieved relevant excerpts from multilingual, low-quality text to monitor comments on internal and external channels, cutting discovery time from months to days.',
              fr: 'NLP : extraction de passages pertinents dans des textes multilingues de faible qualité pour suivre les commentaires publiés sur les canaux internes et externes, réduisant le délai de détection de plusieurs mois à quelques jours.',
            },
          },
          {
            text: {
              en: 'Executive analytics: advised the C-suite on the highest-impact actions and set up KPIs for initiatives on gender diversity, attrition prevention and pay equity.',
              fr: 'Analyses pour la direction : conseil au comité exécutif sur les actions à plus fort impact et mise en place de KPI pour ses initiatives sur la diversité de genre, la prévention de l’attrition et l’équité salariale.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'converteo',
    company: 'Converteo',
    start: 2018,
    end: 2019,
    tags: ['GCP', 'Econometrics', 'A/B testing', 'Training'],
    roles: [
      {
        title: { en: 'Senior Data Scientist Consultant', fr: 'Consultant Data Scientist Senior' },
        bullets: [
          {
            text: {
              en: 'Designed and deployed predictive models such as product appetence and customer value on Google Cloud Platform.',
              fr: 'Conception et déploiement de modèles prédictifs (appétence produit, valeur client) sur Google Cloud Platform.',
            },
          },
          {
            text: {
              en: 'Built econometric models measuring how media investment drives traffic and sales, and structured regional A/B tests across shops of different sizes to validate the best media mix.',
              fr: 'Développement de modèles économétriques mesurant la contribution des investissements média au trafic et aux ventes, et conception de tests A/B régionaux sur des magasins de tailles différentes pour valider le meilleur mix média.',
            },
          },
          {
            text: {
              en: 'Trained data scientists and managers on the key processes of data-science projects.',
              fr: 'Formation de data scientists et de managers aux étapes clés des projets de data science.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'quinten',
    company: 'Quinten',
    start: 2017,
    end: 2018,
    tags: ['Pharma', 'Publications'],
    roles: [
      {
        title: { en: 'Data Scientist Consultant', fr: 'Consultant Data Scientist' },
        bullets: [
          {
            text: {
              en: 'Led publications on proprietary data-science tools with pharmaceutical partners.',
              fr: 'Responsable des publications sur les outils propriétaires de data science avec des partenaires pharmaceutiques.',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'curie',
    company: 'Institut Curie · Université Paris-Sud',
    start: 2014,
    end: 2017,
    tags: ['Clustering', 'Genomics', 'R', 'EM · GMM · MCMC'],
    roles: [
      {
        title: { en: 'PhD in Oncology', fr: 'Doctorat en oncologie' },
        bullets: [
          {
            text: {
              en: 'Designed a clustering algorithm that detects spatio-temporal heterogeneity in cancer cells from genomic data.',
              fr: 'Conception d’un algorithme de clustering détectant l’hétérogénéité spatio-temporelle des cellules cancéreuses à partir de données génomiques.',
            },
          },
          {
            text: {
              en: 'Published R packages, including QuantumClone (clustering, 15k+ CRAN downloads) and ACSNMineR (statistical enrichment and visualisation, 23k+ CRAN downloads).',
              fr: 'Publication de packages R, dont QuantumClone (clustering, 15k+ téléchargements CRAN) et ACSNMineR (enrichissement statistique et visualisation, 23k+ téléchargements CRAN).',
            },
          },
        ],
      },
    ],
  },
];

export const education: Degree[] = [
  {
    school: { en: 'École Polytechnique', fr: 'École polytechnique' },
    start: 2010,
    end: 2014,
    degree: { en: 'Engineering degree', fr: 'Diplôme d’ingénieur' },
    detail: { en: 'Specialisation: interface biology', fr: 'Spécialisation : biologie aux interfaces' },
  },
  {
    school: { en: 'Université Paris Descartes', fr: 'Université Paris Descartes' },
    start: 2013,
    end: 2014,
    degree: { en: 'Master’s degree (M2)', fr: 'Master 2' },
    detail: {
      en: 'Biomedical engineering: molecular and cellular biotherapies',
      fr: 'Ingénierie biomédicale : biothérapies moléculaires et cellulaires',
    },
  },
];

export const highlights: Highlight[] = [
  {
    name: 'QuantumClone',
    url: 'https://cran.r-project.org/package=QuantumClone',
    text: { en: 'R package for clonal clustering · 15k+ CRAN downloads', fr: 'Package R de clustering clonal · 15k+ téléchargements CRAN' },
  },
  {
    name: 'ACSNMineR',
    url: 'https://cran.r-project.org/package=ACSNMineR',
    text: { en: 'Enrichment & visualisation · 23k+ CRAN downloads', fr: 'Enrichissement & visualisation · 23k+ téléchargements CRAN' },
  },
  {
    name: 'Kaggle',
    url: 'https://www.kaggle.com/deveaup',
    text: { en: 'Competition Expert · top 3%', fr: 'Competition Expert · top 3 %' },
  },
  {
    name: 'CodinGame',
    url: 'https://www.codingame.com/profile/c51a4eb396903189fd53a97eb92d3d4c2698012',
    text: { en: 'Master · top 0.2% · DeveauP', fr: 'Master · top 0,2 % · DeveauP' },
  },
];

export const skills: { group: L; items: string[] }[] = [
  {
    group: { en: 'Machine learning', fr: 'Machine learning' },
    items: ['LLM agents', 'LLM evaluation', 'SFT', 'Synthetic data', 'NLP', 'Audio-driven animation'],
  },
  {
    group: { en: 'Statistics', fr: 'Statistiques' },
    items: ['EM · GMM', 'MCMC', 'A/B testing', 'Clustering'],
  },
  {
    group: { en: 'Engineering', fr: 'Ingénierie' },
    items: ['Python', 'PyTorch', 'R', 'Google Cloud Platform', 'Data pipelines'],
  },
  {
    group: { en: 'Leadership', fr: 'Leadership' },
    items: ['Team management', 'Technical lead', 'Training'],
  },
];

/** Drafts are visible in dev only, so unconfirmed claims never ship. */
export const visible = <T extends { draft?: boolean }>(items: T[]): T[] =>
  import.meta.env.DEV ? items : items.filter((i) => !i.draft);
