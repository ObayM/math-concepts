export interface PracticeSlide {
  id: string;
  skill?: string;
  exercise?: { skill?: string };
}

export type MasteryMap = Record<string, number>;

const UNSEEN_WEIGHT = 0.7;
const MIN_WEIGHT = 0.02;

export function slideSkill(slide: PracticeSlide): string | null {
  return slide.exercise?.skill ?? slide.skill ?? null;
}

export function slideWeight(slide: PracticeSlide, mastery: MasteryMap): number {
  const skill = slideSkill(slide);
  if (!skill) return UNSEEN_WEIGHT;
  const score = mastery[skill];
  if (score === undefined) return UNSEEN_WEIGHT;
  return Math.max(MIN_WEIGHT, 1 - score);
}

export function weightedPick<T extends PracticeSlide>(
  pool: T[],
  mastery: MasteryMap = {},
  rng: () => number = Math.random,
  exclude?: T
): T | null {
  if (!pool.length) return null;
  const candidates = pool.length > 1 && exclude ? pool.filter((s) => s !== exclude) : pool;
  if (!candidates.length) return pool[0];

  const weights = candidates.map((s) => slideWeight(s, mastery));
  const total = weights.reduce((a, b) => a + b, 0);
  if (total <= 0) return candidates[Math.floor(rng() * candidates.length)] ?? candidates[0];

  let target = rng() * total;
  for (let i = 0; i < candidates.length; i++) {
    target -= weights[i];
    if (target < 0) return candidates[i];
  }
  return candidates[candidates.length - 1];
}

export function weakestSkills(mastery: MasteryMap, limit = 3): string[] {
  return Object.entries(mastery)
    .sort((a, b) => a[1] - b[1])
    .slice(0, limit)
    .map(([skill]) => skill);
}
