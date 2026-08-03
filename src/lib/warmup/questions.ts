import { LEVELS, type Level, type Question } from './levels';
import { shuffled } from './rng';

export const MIN_LEVEL = 1;
export const MAX_LEVEL = LEVELS.length;

export type { Level, Question };

export function levelById(level: number): Level | null {
  return LEVELS.find((l) => l.id === level) ?? null;
}

export function isValidLevel(level: unknown): level is number {
  return (
    typeof level === 'number' && Number.isInteger(level) && level >= MIN_LEVEL && level <= MAX_LEVEL
  );
}

const DECK_CACHE = new Map<string, number[]>();
const DECK_CACHE_MAX = 8;

function deckFor(size: number, key: string): number[] {
  const hit = DECK_CACHE.get(key);
  if (hit) return hit;
  const deck = shuffled(size, key);
  if (DECK_CACHE.size >= DECK_CACHE_MAX) DECK_CACHE.delete(DECK_CACHE.keys().next().value!);
  DECK_CACHE.set(key, deck);
  return deck;
}

export function questionAt(level: number, seed: string, index: number): Question | null {
  const found = levelById(level);
  if (!found || !Number.isInteger(index) || index < 0) return null;
  const epoch = Math.floor(index / found.size);
  const deck = deckFor(found.size, `${level}:${seed}:${epoch}`);
  return found.at(deck[index % found.size]);
}
