import { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { LEVELS } from '@/lib/warmup/levels';
import { questionAt, isValidLevel } from '@/lib/warmup/questions';
import { gradeAnswer } from '@/lib/warmup/grade';
import { newSeed } from '@/lib/warmup/rng';
import {
  rollUpSession,
  rankWeakSpots,
  paceMs,
  accuracyPct,
  MIN_PACE_SAMPLE,
} from '@/lib/warmup/stats';
import { toCsv } from '@/lib/warmup/csv';
import { warmupXp } from '@/lib/xp';
import { touchActivity, awardWarmupXp, getWarmupXpToday } from '@/lib/db/activityService';

export const MAX_SESSION_ANSWERS = 500;
export const MAX_ELAPSED_MS = 120_000;
const GIVEN_MAX_CHARS = 32;
const EXPORT_ROW_CAP = 10_000;
const TREND_MIN_ANSWERS = 5;

export interface IncomingAnswer {
  idx: number;
  given?: string | null;
  elapsedMs?: number;
}

export interface SessionRow {
  id: string;
  level: number;
  startedAt: Date;
  endedAt: Date | null;
  answered: number;
  correct: number;
  bestStreak: number;
  totalMs: number;
  xpAwarded: number;
}

export type SessionSummary = SessionRow & {
  accuracy: number;
  pace: number;
  durationMs: number;
};

export interface HistoryQuery {
  cursor?: string | null;
  limit?: number;
  level?: number | null;
}

export interface FactQuery {
  level?: number | null;
  days?: number;
  limit?: number;
}

export type CsvScope = 'sessions' | 'answers';

const SESSION_FIELDS = {
  id: true,
  level: true,
  startedAt: true,
  endedAt: true,
  answered: true,
  correct: true,
  bestStreak: true,
  totalMs: true,
  xpAwarded: true,
} as const;

function clampElapsed(ms: unknown): number {
  const n = Math.round(Number(ms));
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(MAX_ELAPSED_MS, n);
}

function summarize(session: SessionRow): SessionSummary {
  const endedAt = session.endedAt ?? null;
  return {
    ...session,
    accuracy: accuracyPct(session.correct, session.answered),
    pace: paceMs(session.totalMs, session.answered),
    durationMs: endedAt ? Math.max(0, endedAt.getTime() - session.startedAt.getTime()) : 0,
  };
}

export async function startWarmupSession(userId: string, level: number, timezone?: string | null) {
  if (!isValidLevel(level)) return null;
  const session = await prisma.warmupSession.create({
    data: { userId, level, seed: newSeed() },
    select: { id: true, level: true, seed: true, startedAt: true },
  });
  await touchActivity(userId, timezone);
  return { sessionId: session.id, level: session.level, seed: session.seed };
}

export async function recordWarmupAnswers(
  userId: string,
  sessionId: string,
  answers: IncomingAnswer[],
  timezone?: string | null
) {
  const session = await prisma.warmupSession.findUnique({
    where: { id: sessionId },
    select: { id: true, userId: true, level: true, seed: true },
  });
  if (!session || session.userId !== userId) return null;

  const seen = new Set<number>();
  const graded: Prisma.WarmupAnswerCreateManyInput[] = [];
  for (const entry of answers ?? []) {
    const idx = Number(entry?.idx);
    if (!Number.isInteger(idx) || idx < 0 || idx >= MAX_SESSION_ANSWERS) continue;
    if (seen.has(idx)) continue;
    seen.add(idx);
    const question = questionAt(session.level, session.seed, idx);
    if (!question) continue;
    graded.push({
      sessionId: session.id,
      userId,
      level: session.level,
      idx,
      factKey: question.factKey,
      prompt: question.prompt,
      answer: question.answer,
      given: typeof entry.given === 'string' ? entry.given.slice(0, GIVEN_MAX_CHARS) : null,
      correct: gradeAnswer(question, entry.given),
      elapsedMs: clampElapsed(entry.elapsedMs),
    });
  }

  return prisma.$transaction(async (tx: Prisma.TransactionClient) => {
    let freshCorrect = 0;
    if (graded.length) {
      const created = await tx.warmupAnswer.createManyAndReturn({
        data: graded,
        skipDuplicates: true,
        select: { correct: true },
      });
      freshCorrect = created.filter((row) => row.correct).length;
    }

    const xp = warmupXp(freshCorrect, await getWarmupXpToday(tx, userId, timezone));
    if (xp > 0) await awardWarmupXp(tx, userId, xp, timezone);

    const rows = await tx.warmupAnswer.findMany({
      where: { sessionId },
      select: { correct: true, elapsedMs: true },
      orderBy: { idx: 'asc' },
    });

    const updated = await tx.warmupSession.update({
      where: { id: sessionId },
      data: { ...rollUpSession(rows), endedAt: new Date(), xpAwarded: { increment: xp } },
      select: SESSION_FIELDS,
    });

    return { ...summarize(updated), xp, accepted: graded.length };
  });
}

export async function endWarmupSession(userId: string, sessionId: string) {
  const session = await prisma.warmupSession.findUnique({
    where: { id: sessionId },
    select: { ...SESSION_FIELDS, userId: true },
  });
  if (!session || session.userId !== userId) return null;
  if (!session.endedAt) {
    const endedAt = new Date();
    await prisma.warmupSession.update({ where: { id: sessionId }, data: { endedAt } });
    session.endedAt = endedAt;
  }
  const { userId: _owner, ...rest } = session;
  return summarize(rest);
}

export async function getWarmupOverview(userId: string) {
  const [grouped, paceRows, latest] = await Promise.all([
    prisma.warmupSession.groupBy({
      by: ['level'] as const,
      where: { userId },
      _sum: { answered: true, correct: true },
      _count: { _all: true },
    }),
    prisma.warmupSession.findMany({
      where: { userId, answered: { gte: MIN_PACE_SAMPLE } },
      select: { level: true, answered: true, totalMs: true },
    }),
    prisma.warmupSession.findFirst({
      where: { userId, answered: { gt: 0 } },
      orderBy: { startedAt: 'desc' },
      select: { level: true },
    }),
  ]);

  const bestPace = new Map<number, number>();
  for (const row of paceRows) {
    const pace = paceMs(row.totalMs, row.answered);
    if (!pace) continue;
    const prev = bestPace.get(row.level);
    if (prev === undefined || pace < prev) bestPace.set(row.level, pace);
  }

  const byLevel = new Map(grouped.map((g) => [g.level, g]));

  return {
    lastLevel: latest?.level ?? null,
    levels: LEVELS.map((level) => {
      const stats = byLevel.get(level.id);
      const answered = stats?._sum.answered ?? 0;
      const correct = stats?._sum.correct ?? 0;
      return {
        id: level.id,
        name: level.name,
        blurb: level.blurb,
        example: level.example,
        sessions: stats?._count._all ?? 0,
        answered,
        correct,
        accuracy: accuracyPct(correct, answered),
        bestPace: bestPace.get(level.id) ?? 0,
      };
    }),
  };
}

export async function listWarmupSessions(
  userId: string,
  { cursor, limit = 20, level }: HistoryQuery = {}
) {
  const take = Math.min(100, Math.max(1, Number(limit) || 20));
  const rows = await prisma.warmupSession.findMany({
    where: { userId, answered: { gt: 0 }, ...(isValidLevel(level) ? { level } : {}) },
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: take + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    select: SESSION_FIELDS,
  });
  const hasMore = rows.length > take;
  return {
    sessions: rows.slice(0, take).map(summarize),
    nextCursor: hasMore ? rows[take - 1].id : null,
  };
}

export async function getWarmupTotals(userId: string) {
  const [agg, facts] = await Promise.all([
    prisma.warmupSession.aggregate({
      where: { userId },
      _sum: { answered: true, correct: true, totalMs: true, xpAwarded: true },
      _count: { _all: true },
    }),
    prisma.warmupAnswer.groupBy({ by: ['factKey'], where: { userId }, _count: { _all: true } }),
  ]);
  const answered = agg._sum.answered ?? 0;
  const correct = agg._sum.correct ?? 0;
  return {
    sessions: agg._count._all,
    answered,
    correct,
    accuracy: accuracyPct(correct, answered),
    pace: paceMs(agg._sum.totalMs ?? 0, answered),
    xp: agg._sum.xpAwarded ?? 0,
    facts: facts.length,
  };
}

export async function getWarmupWeakSpots(
  userId: string,
  { level, days = 30, limit = 8 }: FactQuery = {}
) {
  const since = new Date(Date.now() - Math.max(1, days) * 86_400_000);
  const where = {
    userId,
    createdAt: { gte: since },
    ...(isValidLevel(level) ? { level } : {}),
  };
  const [all, missed] = await Promise.all([
    prisma.warmupAnswer.groupBy({
      by: ['factKey'] as const,
      where,
      _count: { _all: true },
      _sum: { elapsedMs: true },
      _max: { prompt: true },
    }),
    prisma.warmupAnswer.groupBy({
      by: ['factKey'] as const,
      where: { ...where, correct: false },
      _count: { _all: true },
    }),
  ]);

  const misses = new Map(missed.map((row) => [row.factKey, row._count._all]));
  const rows = all.map((row) => ({
    factKey: row.factKey,
    prompt: row._max.prompt ?? row.factKey,
    attempts: row._count._all,
    misses: misses.get(row.factKey) ?? 0,
    avgMs: Math.round((row._sum.elapsedMs ?? 0) / Math.max(1, row._count._all)),
  }));

  return rankWeakSpots(rows, { limit });
}

export async function getWarmupSpeedTrend(userId: string, { level, limit = 20 }: FactQuery = {}) {
  const rows = await prisma.warmupSession.findMany({
    where: {
      userId,
      answered: { gte: TREND_MIN_ANSWERS },
      ...(isValidLevel(level) ? { level } : {}),
    },
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: Math.min(60, Math.max(2, Number(limit) || 20)),
    select: {
      id: true,
      level: true,
      startedAt: true,
      answered: true,
      correct: true,
      totalMs: true,
    },
  });
  return rows.reverse().map((row) => ({
    id: row.id,
    level: row.level,
    startedAt: row.startedAt,
    answered: row.answered,
    pace: paceMs(row.totalMs, row.answered),
    accuracy: accuracyPct(row.correct, row.answered),
  }));
}

const SESSION_CSV_HEADERS = [
  'session_id',
  'level',
  'started_at',
  'ended_at',
  'session_seconds',
  'answered',
  'correct',
  'accuracy_percent',
  'best_streak',
  'answering_seconds',
  'seconds_per_question',
  'xp_awarded',
];

const ANSWER_CSV_HEADERS = [
  'session_id',
  'level',
  'question_number',
  'prompt',
  'answer',
  'given',
  'correct',
  'seconds',
  'answered_at',
];

const seconds = (ms: number) => (Math.max(0, ms) / 1000).toFixed(2);

export async function exportWarmupCsv(userId: string, scope: CsvScope = 'sessions') {
  if (scope === 'answers') {
    const rows = await prisma.warmupAnswer.findMany({
      where: { userId },
      orderBy: [{ createdAt: 'desc' }, { idx: 'desc' }],
      take: EXPORT_ROW_CAP,
      select: {
        sessionId: true,
        level: true,
        idx: true,
        prompt: true,
        answer: true,
        given: true,
        correct: true,
        elapsedMs: true,
        createdAt: true,
      },
    });
    return toCsv(
      ANSWER_CSV_HEADERS,
      rows.map((row) => [
        row.sessionId,
        row.level,
        row.idx + 1,
        row.prompt,
        row.answer,
        row.given,
        row.correct,
        seconds(row.elapsedMs),
        row.createdAt.toISOString(),
      ])
    );
  }

  const rows = await prisma.warmupSession.findMany({
    where: { userId, answered: { gt: 0 } },
    orderBy: [{ startedAt: 'desc' }, { id: 'desc' }],
    take: EXPORT_ROW_CAP,
    select: SESSION_FIELDS,
  });
  return toCsv(
    SESSION_CSV_HEADERS,
    rows
      .map(summarize)
      .map((row) => [
        row.id,
        row.level,
        row.startedAt.toISOString(),
        row.endedAt ? row.endedAt.toISOString() : null,
        seconds(row.durationMs),
        row.answered,
        row.correct,
        row.accuracy,
        row.bestStreak,
        seconds(row.totalMs),
        seconds(row.pace),
        row.xpAwarded,
      ])
  );
}
