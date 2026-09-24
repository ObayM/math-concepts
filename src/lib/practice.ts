export interface PracticeSlide {
  id: string;
  skill?: string;
  exercise?: { skill?: string };
}

export type MasteryMap = Record<string, number>;
export type LastSeen = Record<string, number>;

const DAY = 24 * 60 * 60 * 1000;
const JUST_SEEN = 10 * 60 * 1000;
const DUE_BOOST = 3;

export function reviewInterval(score: number): number {
  if (score < 0.5) return 1;
  if (score < 0.7) return 3;
  if (score < 0.9) return 7;
  return 21;
}

export function timeFactor(
  score: number | undefined,
  seenAt: number | undefined,
  now: number
): number {
  if (seenAt === undefined) return 1;
  const since = now - seenAt;
  if (since < JUST_SEEN) return 0.25;
  const interval = reviewInterval(score ?? 0) * DAY;
  if (since >= interval) return DUE_BOOST;
  return 0.5 + (0.5 * since) / interval;
}

export interface PickOptions {
  lastSeen?: LastSeen;
  now?: number;
}

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
  exclude?: T,
  { lastSeen = {}, now = Date.now() }: PickOptions = {}
): T | null {
  if (!pool.length) return null;
  let candidates = pool.length > 1 && exclude ? pool.filter((s) => s !== exclude) : pool;
  if (!candidates.length) return pool[0];
  const lastSkill = exclude ? slideSkill(exclude) : null;
  if (lastSkill) {
    const mixed = candidates.filter((s) => slideSkill(s) !== lastSkill);
    if (mixed.length) candidates = mixed;
  }

  const weights = candidates.map((s) => {
    const skill = slideSkill(s);
    const time = skill ? timeFactor(mastery[skill], lastSeen[skill], now) : 1;
    return slideWeight(s, mastery) * time;
  });
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
