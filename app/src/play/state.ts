import { STAGES, type ItemId, type StageId } from './stages';

export type Outfit = 'polytechnique' | 'university';

export interface Progress {
  outfit: Outfit | null;
  done: StageId[];
  items: ItemId[];
}

const KEY = 'play-progress-v1';

const empty = (): Progress => ({ outfit: null, done: [], items: [] });

export function loadProgress(): Progress {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...empty(), ...(JSON.parse(raw) as Partial<Progress>) };
  } catch {
    // Unavailable or corrupt storage: start fresh.
  }
  return empty();
}

export function saveProgress(p: Progress): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(p));
  } catch {
    // Non-fatal: progress just won't survive a reload.
  }
}

export function clearProgress(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Non-fatal.
  }
}

/** A stage is open once every earlier stage is done. */
export function isUnlocked(p: Progress, id: StageId): boolean {
  const idx = STAGES.findIndex((s) => s.id === id);
  return STAGES.slice(0, idx).every((s) => p.done.includes(s.id));
}

export const allDone = (p: Progress): boolean => STAGES.every((s) => p.done.includes(s.id));
