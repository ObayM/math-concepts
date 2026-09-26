import type { SlideIR } from '@/engine/ir/lesson';

export const RECENT_DAYS = 14;
export const MASTERED = 0.8;

export interface MasteryRow {
  skill: string;
  score: number;
  updatedAt: Date | string | number;
}

const DAY = 24 * 60 * 60 * 1000;

export function checkSkill(slide: SlideIR): string | null {
  if (slide.beat !== 'check' || slide.hidden) return null;
  return slide.exercise?.skill ?? slide.skill ?? null;
}

export function recentlyMastered(row: MasteryRow | undefined, now = Date.now()): boolean {
  if (!row || row.score < MASTERED) return false;
  const at = new Date(row.updatedAt).getTime();
  return Number.isFinite(at) && now - at <= RECENT_DAYS * DAY;
}

export function skippableChecks(
  slides: SlideIR[],
  requires: string[] | undefined,
  mastery: MasteryRow[],
  now = Date.now()
): number {
  if (!requires?.length) return 0;
  const path = slides.filter((s) => !s.hidden);
  const bySkill = new Map(mastery.map((m) => [m.skill, m]));
  let n = 0;
  while (n < path.length - 1) {
    const skill = checkSkill(path[n]);
    if (!skill || !requires.includes(skill) || !recentlyMastered(bySkill.get(skill), now)) break;
    n++;
  }
  return n;
}
