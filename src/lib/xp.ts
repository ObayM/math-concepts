export const XP_CORRECT = 10;
export const XP_ATTEMPT = 2;
export const XP_LESSON_COMPLETE = 25;
export const DAILY_GOAL_XP = 50;

export interface XpAttempt {
  correct: boolean;
}

export function xpForAttempts(attempts: XpAttempt[]): number {
  return attempts.reduce((sum, a) => sum + (a.correct ? XP_CORRECT : XP_ATTEMPT), 0);
}

export function goalProgress(xp: number, goal = DAILY_GOAL_XP) {
  const safeGoal = goal > 0 ? goal : DAILY_GOAL_XP;
  const pct = Math.min(100, Math.round((xp / safeGoal) * 100));
  return { xp, goal: safeGoal, pct, met: xp >= safeGoal, remaining: Math.max(0, safeGoal - xp) };
}
