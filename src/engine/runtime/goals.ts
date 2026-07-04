import type { Scope } from '@/engine/ir/types';
import type { GoalIR } from '@/engine/ir/lesson';
import { evalBool } from './eval';

export function evalGoals(goals: GoalIR[], prevMet: boolean[], scope: Scope): boolean[] {
  return goals.map((g, i) => prevMet[i] || evalBool(g.when, scope));
}
