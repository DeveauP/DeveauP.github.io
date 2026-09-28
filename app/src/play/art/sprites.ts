import type { Outfit } from '../state';
import type { ItemId } from '../stages';
import { rasterize, type Palette, type Sheet } from './pixels';

/*
 * Character: 16×24 frames facing right (outline makes them 18×26).
 * Semantic palette keys, remapped per outfit:
 *   H headgear  G headgear trim  C cockade  h hair  s skin  S skin shade
 *   e eye  m mouth  B top  A top accent  W hands/gloves  L legs  R leg stripe/seam  F feet
 */

const HEAD: Record<Outfit, string[]> = {
  polytechnique: [
    '................',
    '.......HH.......',
    '.....HHHHCH.....',
    '..HHHHHHHHHHHH..',
    '...GHHHHHHHHG...',
  ],
  university: [
    '................',
    '................',
    '......hhhhh.....',
    '.....hhhhhhhh...',
    '.....hhhhhhhhh..',
  ],
};

const FACE = [
  '.....hssssss....',
  '.....ssssses....',
  '.....sssssssS...',
  '.....ssssssss...',
  '......sssmss....',
  '.......sss......',
];

const BODY: Record<Outfit, string[]> = {
  polytechnique: [
    '......AAAAA.....',
    '....BBBBABBB....',
    '...BBBBBABBBB...',
    '...BBBBBABBBB...',
    '...BBBBBABBBB...',
    '...WBBBBBBBBW...',
    '....BBBBBBBB....',
  ],
  university: [
    '......BsssB.....',
    '....BBBBBBBB....',
    '...BBBBAABBBB...',
    '...BBBAAAABBB...',
    '...sBBBBBBBBs...',
    '...sLLLLLLLLs...',
    '....LLLLLLLL....',
  ],
};

const LEGS = {
  stand: [
    '.....LLLLLL.....',
    '.....RLLLLR.....',
    '.....RL..LR.....',
    '.....RL..LR.....',
    '.....RL..LR.....',
    '.....FFF.FFF....',
  ],
  run1: [
    '.....LLLLLL.....',
    '....RLL..LLR....',
    '...RLL....LLR...',
    '..RLL......LLR..',
    '.FFF........LR..',
    '............FFF.',
  ],
  run2: [
    '.....LLLLLL.....',
    '.....RLLLLR.....',
    '......RLLR......',
    '......RLLR......',
    '......RLFF......',
    '......FFF.......',
  ],
  jump: [
    '.....LLLLLL.....',
    '....RLLLLLLR....',
    '...RLL....LLR...',
    '..FFF......LR...',
    '...........FFF..',
    '................',
  ],
};

const SKIN: Palette = { s: '#f2c9a0', S: '#d9a27c', e: '#1b1a2a', m: '#b5655a' };

const PALETTES: Record<Outfit, Palette> = {
  polytechnique: {
    ...SKIN,
    H: '#17171f',
    G: '#d8b24a',
    C: '#d23c3c',
    h: '#3b2a20',
    B: '#1f2a57',
    A: '#d8b24a',
    W: '#f5f5f5',
    L: '#1f2a57',
    R: '#c0392b',
    F: '#111111',
  },
  university: {
    ...SKIN,
    h: '#5a3a24',
    B: '#ece8df',
    A: '#d9534f',
    W: '#f2c9a0',
    L: '#3b5f99',
    R: '#2d4a7a',
    F: '#f4f4f4',
  },
};

/** Frame order in the sheet. */
export const PLAYER_FRAMES = { stand: 0, run1: 1, run2: 2, jump: 3 } as const;

export function playerSheet(outfit: Outfit): Sheet {
  const frame = (legs: string[]) => [...HEAD[outfit], ...FACE, ...BODY[outfit], ...legs];
  return rasterize(
    [frame(LEGS.stand), frame(LEGS.run1), frame(LEGS.run2), frame(LEGS.jump)],
    PALETTES[outfit],
    `player-${outfit}`,
  );
}

/* ---------- Items (12×10) ---------- */

const DIPLOMA = [
  'pppppppppppp',
  'pppppppppppp',
  'ppllllllllpp',
  'pppppppppppp',
  'ppllllllllpp',
  'pppppppppppp',
  'pplllllppxxp',
  'pppppppppxxx',
  'ppppppppppxp',
  'pppppppppppp',
];

const PAPER = { p: '#fbf6e6', l: '#b9ae94' };

const BADGE = [
  '....xxxx....',
  '..xxyyyyxx..',
  '.xyyyyyyyyx.',
  '.xyyxxxxyyx.',
  'xyyxyyyyxyyx',
  'xyyxyyyyxyyx',
  '.xyyxxxxyyx.',
  '.xyyyyyyyyx.',
  '..xxyyyyxx..',
  '....xxxx....',
];

const ITEM_ART: Record<ItemId, { rows: string[]; pal: Palette }> = {
  'eng-degree': { rows: DIPLOMA, pal: { ...PAPER, x: '#d23c3c' } },
  m2: { rows: DIPLOMA, pal: { ...PAPER, x: '#2f6fd6' } },
  'phd-diploma': { rows: DIPLOMA, pal: { ...PAPER, x: '#d8a31a' } },
  'mold-broken': { rows: BADGE, pal: { x: '#8a5a2b', y: '#e0a458' } },
  'balanced-team': { rows: BADGE, pal: { x: '#5b3f99', y: '#a58bf0' } },
  'perfect-o': { rows: BADGE, pal: { x: '#1f6f8b', y: '#7fd6ff' } },
  'tailor-made': { rows: BADGE, pal: { x: '#2f7d3a', y: '#9be08a' } },
};

export const itemSheet = (id: ItemId): Sheet => rasterize([ITEM_ART[id].rows], ITEM_ART[id].pal, `item-${id}`);

/* ---------- PhD cells (13×13) ---------- */

/**
 * Picked to stay distinct under protanopia, deuteranopia and tritanopia (min ΔE ≈ 44 in
 * simulation), with a spread of lightness so they also separate in greyscale.
 */
export const CLONE_COLORS = ['#ffb000', '#66ccee', '#785ef0', '#882255'] as const;
const CLONE_DARK = ['#8a5f00', '#1f7a99', '#3a2a99', '#420f28'] as const;
/** Glyph ink: dark on the light bodies, light on the dark ones. */
const CLONE_INK = ['#8a5f00', '#1f7a99', '#f0ecff', '#f6d3e4'] as const;

/** Nucleus glyphs so clones are distinguishable without relying on colour. */
const GLYPHS = [
  ['.....', '.xxx.', '.xxx.', '.xxx.', '.....'], // dot
  ['.xxx.', 'x...x', 'x...x', 'x...x', '.xxx.'], // ring
  ['..x..', '..x..', 'xxxxx', '..x..', '..x..'], // plus
  ['..x..', '.x.x.', 'x...x', '.x.x.', '..x..'], // diamond
];

export function cellSheet(clone: number): Sheet {
  const size = 13;
  const c = 6;
  const rows: string[] = [];
  for (let y = 0; y < size; y++) {
    let row = '';
    for (let x = 0; x < size; x++) {
      const d2 = (x - c) ** 2 + (y - c) ** 2;
      if (d2 > 38) row += '.';
      else if (d2 > 26) row += 'r';
      else {
        const gx = x - (c - 2);
        const gy = y - (c - 2);
        const inGlyph = gx >= 0 && gx < 5 && gy >= 0 && gy < 5 && GLYPHS[clone][gy][gx] === 'x';
        row += inGlyph ? 'n' : x < c && y < c - 1 && d2 > 12 ? 'h' : 'b';
      }
    }
    rows.push(row);
  }
  return rasterize(
    [rows],
    { b: CLONE_COLORS[clone], r: CLONE_DARK[clone], n: CLONE_INK[clone], h: '#ffffffaa' },
    `cell-${clone}`,
  );
}
