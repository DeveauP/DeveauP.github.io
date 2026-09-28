import type { ItemId, StageId } from './stages';

/** Messages exchanged between the DOM UI and the Phaser scenes. */
export interface BusEvents {
  /** Game → UI: the player is standing at a door (null when leaving it). */
  'near-door': StageId | 'finish' | null;
  /** Game → UI: the player walked into another stage's area. */
  region: StageId;
  /** Game → UI: the player pressed the action key/button at a door. */
  'door-action': StageId | 'finish';
  /** Game → UI: an item was picked up in the overworld. */
  collect: ItemId;
  /** Game → UI: a mini-game was won. */
  'stage-won': StageId;
  /** Game → UI: a mini-game reached a dead end (e.g. out of moves). */
  'stage-stuck': StageId;
  /** UI → game: launch a mini-game. */
  'stage-start': StageId;
  /** UI → game: leave the running mini-game. */
  'stage-exit': void;
  /** UI → game: restart the running mini-game from its initial state. */
  'stage-reset': void;
  /** UI → game: progress changed (gates, outfit). */
  progress: void;
  /** UI → game: move the player to a stage door. */
  teleport: StageId;
  /** UI → game: a modal opened or closed; the world ignores input while paused. */
  'ui-modal': boolean;
}

type Handler<T> = (payload: T) => void;

export class Bus {
  private handlers = new Map<keyof BusEvents, Set<Handler<never>>>();

  on<K extends keyof BusEvents>(event: K, fn: Handler<BusEvents[K]>): () => void {
    let set = this.handlers.get(event);
    if (!set) this.handlers.set(event, (set = new Set()));
    set.add(fn as Handler<never>);
    return () => set.delete(fn as Handler<never>);
  }

  emit<K extends keyof BusEvents>(event: K, ...[payload]: BusEvents[K] extends void ? [] : [BusEvents[K]]): void {
    this.handlers.get(event)?.forEach((fn) => (fn as Handler<BusEvents[K]>)(payload as BusEvents[K]));
  }

  clear(): void {
    this.handlers.clear();
  }
}
