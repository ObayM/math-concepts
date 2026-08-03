export interface WarmupTotals {
  answered: number;
  correct: number;
  totalMs: number;
}

export interface FactRow {
  factKey: string;
  prompt?: string;
  attempts: number;
  misses: number;
  avgMs: number;
}

export const MIN_FACT_ATTEMPTS = 3;
export const MIN_PACE_SAMPLE = 20;

export function rollUpSession(
  rows: readonly { correct: boolean; elapsedMs: number }[]
): WarmupTotals & { bestStreak: number } {
  let correct = 0;
  let totalMs = 0;
  let streak = 0;
  let bestStreak = 0;
  for (const row of rows) {
    totalMs += row.elapsedMs;
    if (row.correct) {
      correct++;
      streak++;
      if (streak > bestStreak) bestStreak = streak;
    } else {
      streak = 0;
    }
  }
  return { answered: rows.length, correct, totalMs, bestStreak };
}

export function accuracyPct(correct: number, answered: number): number {
  if (answered <= 0) return 0;
  return Math.round((correct / answered) * 100);
}

export function paceMs(totalMs: number, answered: number): number {
  if (answered <= 0) return 0;
  return Math.round(totalMs / answered);
}

export function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

export function struggleScore(row: FactRow, referenceMs: number): number {
  const missRate = row.attempts > 0 ? row.misses / row.attempts : 0;
  const slowness = referenceMs > 0 ? Math.max(0, row.avgMs / referenceMs - 1) : 0;
  return missRate * 2 + Math.min(slowness, 2);
}

export function rankWeakSpots(
  rows: FactRow[],
  { minAttempts = MIN_FACT_ATTEMPTS, limit = 8 } = {}
): (FactRow & { score: number })[] {
  const eligible = rows.filter((r) => r.attempts >= minAttempts);
  if (!eligible.length) return [];
  const reference = median(eligible.map((r) => r.avgMs));
  return eligible
    .map((r) => ({ ...r, score: struggleScore(r, reference) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || b.attempts - a.attempts)
    .slice(0, limit);
}

export function formatPace(ms: number): string {
  if (ms <= 0) return '--';
  return `${(Math.round(ms / 100) / 10).toFixed(1)}s`;
}

export function formatDuration(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return hours ? `${hours}:${pad(minutes)}:${pad(seconds)}` : `${minutes}:${pad(seconds)}`;
}
