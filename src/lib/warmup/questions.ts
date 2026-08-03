import { LEVELS, type Level, type Question } from './levels';
import { rngFor } from './rng';

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

export function questionAt(level: number, seed: string, index: number): Question | null {
  const found = levelById(level);
  if (!found || !Number.isInteger(index) || index < 0) return null;
  return found.generate(rngFor(`${level}:${seed}`, index));
}
