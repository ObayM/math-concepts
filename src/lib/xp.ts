export const XP_CORRECT = 10;
export const XP_ATTEMPT = 2;
export const XP_LESSON_COMPLETE = 25;
export const DAILY_GOAL_XP = 50;
export const XP_WARMUP_CORRECT = 1;
export const WARMUP_DAILY_XP_CAP = 30;
export const XP_BANK_CORRECT = 2;
export const BANK_XP_CAP = 30;

export interface XpAttempt {
  correct: boolean;
}

type LessonKind = string | null | undefined;

export function xpForAttempts(attempts: XpAttempt[], kind?: LessonKind): number {
  if (kind === 'bank') return attempts.filter((a) => a.correct).length * XP_BANK_CORRECT;
  return attempts.reduce((sum, a) => sum + (a.correct ? XP_CORRECT : XP_ATTEMPT), 0);
}

export function completionXp(kind?: LessonKind): number {
  return kind === 'bank' ? 0 : XP_LESSON_COMPLETE;
}

// the most a lesson can ever pay out: every exercise answered right, once,
// plus the completion bonus. replaying a lesson is worth doing, it just isn't
// worth xp a second time. a bank is capped flat, or its size would be its payout.
export function lessonXpCap(exerciseCount: number, kind?: LessonKind): number {
  if (kind === 'bank') return BANK_XP_CAP;
  return Math.max(0, exerciseCount) * XP_CORRECT + XP_LESSON_COMPLETE;
}

export function xpStillOwed(earned: number, alreadyAwarded: number, cap: number): number {
  return Math.max(0, Math.min(earned, cap - alreadyAwarded));
}

export function warmupXp(correctCount: number, awardedToday: number): number {
  return xpStillOwed(
    Math.max(0, correctCount) * XP_WARMUP_CORRECT,
    awardedToday,
    WARMUP_DAILY_XP_CAP
  );
}

export function goalProgress(xp: number, goal = DAILY_GOAL_XP) {
  const safeGoal = goal > 0 ? goal : DAILY_GOAL_XP;
  const pct = Math.min(100, Math.round((xp / safeGoal) * 100));
  return { xp, goal: safeGoal, pct, met: xp >= safeGoal, remaining: Math.max(0, safeGoal - xp) };
}
