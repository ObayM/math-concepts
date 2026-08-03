import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  startWarmupSession,
  recordWarmupAnswers,
  endWarmupSession,
  getWarmupOverview,
  listWarmupSessions,
  getWarmupTotals,
  getWarmupWeakSpots,
  getWarmupSpeedTrend,
  exportWarmupCsv,
  MAX_ELAPSED_MS,
  MAX_SESSION_ANSWERS,
} from '@/lib/db/warmupService';
import { questionAt } from '@/lib/warmup/questions';
import { WARMUP_DAILY_XP_CAP } from '@/lib/xp';
import { makeUser } from '../helpers/factories';

const TZ = 'UTC';

async function startedSession(level = 3) {
  const user = await makeUser();
  const session = await startWarmupSession(user.id, level, TZ);
  if (!session) throw new Error('session did not start');
  return { user, session };
}

const rightAnswers = (session: { level: number; seed: string }, count: number, from = 0) =>
  Array.from({ length: count }, (_, i) => ({
    idx: from + i,
    given: questionAt(session.level, session.seed, from + i)!.answer,
    elapsedMs: 1500,
  }));

const wrongAnswers = (session: { level: number; seed: string }, count: number, from = 0) =>
  Array.from({ length: count }, (_, i) => ({
    idx: from + i,
    given: String(Number(questionAt(session.level, session.seed, from + i)!.answer) + 1),
    elapsedMs: 4000,
  }));

describe('starting a warm up session', () => {
  it('issues a seed the client never chose and marks the day active', async () => {
    const { user, session } = await startedSession();
    expect(session.seed).toMatch(/^[0-9a-f]{16}$/);
    expect(session.level).toBe(3);

    const activity = await prisma.userDailyActivity.findFirst({ where: { userId: user.id } });
    expect(activity).toBeTruthy();
    expect(activity!.xp).toBe(0);
  });

  it('gives every session its own seed', async () => {
    const user = await makeUser();
    const seeds = new Set<string>();
    for (let i = 0; i < 10; i++) {
      seeds.add((await startWarmupSession(user.id, 1, TZ))!.seed);
    }
    expect(seeds.size).toBe(10);
  });

  it('refuses a level outside the ladder', async () => {
    const user = await makeUser();
    for (const level of [0, 11, -1, 2.5, NaN]) {
      expect(await startWarmupSession(user.id, level, TZ)).toBeNull();
    }
    expect(await prisma.warmupSession.count()).toBe(0);
  });
});

describe('the answer forgery boundary', () => {
  it('grades against the seed, so a forged answer is recorded as wrong and pays nothing', async () => {
    const { user, session } = await startedSession();
    const truth = questionAt(session.level, session.seed, 0)!;

    const result = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [{ idx: 0, given: String(Number(truth.answer) + 7), elapsedMs: 900 }],
      TZ
    );

    expect(result!.correct).toBe(0);
    expect(result!.xp).toBe(0);
    const [row] = await prisma.warmupAnswer.findMany({ where: { userId: user.id } });
    expect(row.correct).toBe(false);
    expect(row.answer).toBe(truth.answer);
    expect(row.prompt).toBe(truth.prompt);
  });

  it('stores the question the server derived, not anything the client sent', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [
        {
          idx: 0,
          given: '1',
          elapsedMs: 100,
          prompt: '1 + 1',
          answer: '1',
          correct: true,
        } as never,
      ],
      TZ
    );
    const [row] = await prisma.warmupAnswer.findMany({ where: { userId: user.id } });
    expect(row.prompt).toBe(questionAt(session.level, session.seed, 0)!.prompt);
    expect(row.correct).toBe(false);
  });

  it('refuses to write into a session belonging to someone else', async () => {
    const { session } = await startedSession();
    const intruder = await makeUser();
    expect(
      await recordWarmupAnswers(intruder.id, session.sessionId, rightAnswers(session, 3), TZ)
    ).toBeNull();
    expect(await prisma.warmupAnswer.count()).toBe(0);
  });

  it('returns null for a session that does not exist', async () => {
    const user = await makeUser();
    expect(await recordWarmupAnswers(user.id, 'nope', [], TZ)).toBeNull();
  });
});

describe('recording answers', () => {
  it('rolls up the session from the rows it stored', async () => {
    const { user, session } = await startedSession();
    const result = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [...rightAnswers(session, 6), ...wrongAnswers(session, 2, 6)],
      TZ
    );

    expect(result!.answered).toBe(8);
    expect(result!.correct).toBe(6);
    expect(result!.bestStreak).toBe(6);
    expect(result!.accuracy).toBe(75);
    expect(result!.totalMs).toBe(6 * 1500 + 2 * 4000);
    expect(result!.pace).toBe(Math.round((6 * 1500 + 2 * 4000) / 8));
  });

  it('tracks the longest run of correct answers, not the last one', async () => {
    const { user, session } = await startedSession();
    const mixed = [
      ...rightAnswers(session, 2, 0),
      ...wrongAnswers(session, 1, 2),
      ...rightAnswers(session, 5, 3),
      ...wrongAnswers(session, 1, 8),
      ...rightAnswers(session, 1, 9),
    ];
    const result = await recordWarmupAnswers(user.id, session.sessionId, mixed, TZ);
    expect(result!.bestStreak).toBe(5);
  });

  it('accumulates across several flushes', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 10, 0), TZ);
    const second = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      rightAnswers(session, 10, 10),
      TZ
    );
    expect(second!.answered).toBe(20);
    expect(second!.correct).toBe(20);
    expect(second!.bestStreak).toBe(20);
  });

  it('rolls endedAt forward, so an abandoned session still reads honestly', async () => {
    const { user, session } = await startedSession();
    const first = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      rightAnswers(session, 2),
      TZ
    );
    expect(first!.endedAt).toBeTruthy();
    expect(first!.durationMs).toBeGreaterThanOrEqual(0);
  });

  it('is idempotent: replaying a flush adds no rows and no xp', async () => {
    const { user, session } = await startedSession();
    const batch = rightAnswers(session, 5);

    const first = await recordWarmupAnswers(user.id, session.sessionId, batch, TZ);
    const replay = await recordWarmupAnswers(user.id, session.sessionId, batch, TZ);

    expect(first!.xp).toBe(5);
    expect(replay!.xp).toBe(0);
    expect(replay!.answered).toBe(5);
    expect(replay!.correct).toBe(5);
    expect(await prisma.warmupAnswer.count({ where: { userId: user.id } })).toBe(5);

    const activity = await prisma.userDailyActivity.findFirst({ where: { userId: user.id } });
    expect(activity!.xp).toBe(5);
    expect(activity!.warmupXp).toBe(5);
  });

  it('cannot be replayed with a different answer to flip a verdict', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, wrongAnswers(session, 1), TZ);
    const retry = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      rightAnswers(session, 1),
      TZ
    );

    expect(retry!.correct).toBe(0);
    expect(retry!.xp).toBe(0);
    const [row] = await prisma.warmupAnswer.findMany({ where: { userId: user.id } });
    expect(row.correct).toBe(false);
  });

  it('deduplicates repeated indexes inside one flush', async () => {
    const { user, session } = await startedSession();
    const one = rightAnswers(session, 1);
    const result = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [...one, ...one, ...one],
      TZ
    );
    expect(result!.answered).toBe(1);
    expect(result!.xp).toBe(1);
  });

  it('clamps a client supplied time instead of trusting it', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [
        { idx: 0, given: questionAt(3, session.seed, 0)!.answer, elapsedMs: -5000 },
        { idx: 1, given: questionAt(3, session.seed, 1)!.answer, elapsedMs: 99_999_999 },
        { idx: 2, given: questionAt(3, session.seed, 2)!.answer, elapsedMs: 'abc' as never },
        { idx: 3, given: questionAt(3, session.seed, 3)!.answer, elapsedMs: undefined as never },
      ],
      TZ
    );
    const rows = await prisma.warmupAnswer.findMany({
      where: { userId: user.id },
      orderBy: { idx: 'asc' },
    });
    expect(rows.map((r) => r.elapsedMs)).toEqual([0, MAX_ELAPSED_MS, 0, 0]);
  });

  it('drops indexes outside the session cap rather than growing without bound', async () => {
    const { user, session } = await startedSession();
    const result = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [
        { idx: -1, given: '1', elapsedMs: 100 },
        { idx: MAX_SESSION_ANSWERS, given: '1', elapsedMs: 100 },
        { idx: 1.5 as never, given: '1', elapsedMs: 100 },
        ...rightAnswers(session, 1),
      ],
      TZ
    );
    expect(result!.answered).toBe(1);
  });

  it('truncates an absurdly long typed answer', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [{ idx: 0, given: '9'.repeat(5000), elapsedMs: 100 }],
      TZ
    );
    const [row] = await prisma.warmupAnswer.findMany({ where: { userId: user.id } });
    expect(row.given!.length).toBeLessThanOrEqual(32);
    expect(row.correct).toBe(false);
  });

  it('accepts an empty flush without touching anything', async () => {
    const { user, session } = await startedSession();
    const result = await recordWarmupAnswers(user.id, session.sessionId, [], TZ);
    expect(result!.answered).toBe(0);
    expect(result!.xp).toBe(0);
  });
});

describe('the daily xp cap', () => {
  it('pays one xp per correct answer up to the cap', async () => {
    const { user, session } = await startedSession(1);
    const result = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      rightAnswers(session, 10),
      TZ
    );
    expect(result!.xp).toBe(10);
  });

  it('stops paying once the day is capped, however long they keep drilling', async () => {
    const { user, session } = await startedSession(1);
    let paid = 0;
    for (let batch = 0; batch < 6; batch++) {
      const result = await recordWarmupAnswers(
        user.id,
        session.sessionId,
        rightAnswers(session, 10, batch * 10),
        TZ
      );
      paid += result!.xp;
    }
    expect(paid).toBe(WARMUP_DAILY_XP_CAP);

    const activity = await prisma.userDailyActivity.findFirst({ where: { userId: user.id } });
    expect(activity!.warmupXp).toBe(WARMUP_DAILY_XP_CAP);
    expect(activity!.xp).toBe(WARMUP_DAILY_XP_CAP);
    expect(await prisma.warmupAnswer.count({ where: { userId: user.id } })).toBe(60);
  });

  it('holds the cap across separate sessions in the same day', async () => {
    const user = await makeUser();
    let paid = 0;
    for (let i = 0; i < 4; i++) {
      const session = (await startWarmupSession(user.id, 1, TZ))!;
      const result = await recordWarmupAnswers(
        user.id,
        session.sessionId,
        rightAnswers(session, 10),
        TZ
      );
      paid += result!.xp;
    }
    expect(paid).toBe(WARMUP_DAILY_XP_CAP);
  });

  it('cannot be dodged by starting a session before midnight, because xp is dated on award', async () => {
    const { user, session } = await startedSession(1);
    await prisma.warmupSession.update({
      where: { id: session.sessionId },
      data: { startedAt: new Date('2020-01-01T23:59:00.000Z') },
    });
    let paid = 0;
    for (let batch = 0; batch < 5; batch++) {
      paid += (await recordWarmupAnswers(
        user.id,
        session.sessionId,
        rightAnswers(session, 10, batch * 10),
        TZ
      ))!.xp;
    }
    expect(paid).toBe(WARMUP_DAILY_XP_CAP);
  });

  it('leaves lesson xp on the day alone and adds to it', async () => {
    const { user, session } = await startedSession(1);
    const today = new Date(new Date().toISOString().slice(0, 10));
    await prisma.userDailyActivity.update({
      where: { userId_activityDate: { userId: user.id, activityDate: today } },
      data: { xp: 35 },
    });

    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 10), TZ);

    const activity = await prisma.userDailyActivity.findFirst({ where: { userId: user.id } });
    expect(activity!.xp).toBe(45);
    expect(activity!.warmupXp).toBe(10);
  });

  it('pays nothing for a session of nothing but wrong answers', async () => {
    const { user, session } = await startedSession();
    const result = await recordWarmupAnswers(
      user.id,
      session.sessionId,
      wrongAnswers(session, 10),
      TZ
    );
    expect(result!.xp).toBe(0);
    expect(result!.answered).toBe(10);
  });
});

describe('ending a session', () => {
  it('stamps endedAt and hands back the summary', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 4), TZ);
    const summary = await endWarmupSession(user.id, session.sessionId);

    expect(summary!.answered).toBe(4);
    expect(summary!.correct).toBe(4);
    expect(summary!.accuracy).toBe(100);
    expect(summary!.endedAt).toBeTruthy();
    expect(summary).not.toHaveProperty('userId');
  });

  it('ends a session nobody answered anything in', async () => {
    const { user, session } = await startedSession();
    const summary = await endWarmupSession(user.id, session.sessionId);
    expect(summary!.answered).toBe(0);
    expect(summary!.accuracy).toBe(0);
    expect(summary!.pace).toBe(0);
  });

  it('refuses somebody else’s session', async () => {
    const { session } = await startedSession();
    const intruder = await makeUser();
    expect(await endWarmupSession(intruder.id, session.sessionId)).toBeNull();
  });
});

describe('the level picker overview', () => {
  it('reports every level even before anything is answered', async () => {
    const user = await makeUser();
    const overview = await getWarmupOverview(user.id);
    expect(overview.levels).toHaveLength(10);
    expect(overview.lastLevel).toBeNull();
    for (const level of overview.levels) {
      expect(level.answered).toBe(0);
      expect(level.bestPace).toBe(0);
      expect(level.name.length).toBeGreaterThan(0);
      expect(level.example.length).toBeGreaterThan(0);
    }
  });

  it('totals answers per level and remembers the last level played', async () => {
    const user = await makeUser();
    const three = (await startWarmupSession(user.id, 3, TZ))!;
    await recordWarmupAnswers(user.id, three.sessionId, rightAnswers(three, 5), TZ);
    const seven = (await startWarmupSession(user.id, 7, TZ))!;
    await recordWarmupAnswers(user.id, seven.sessionId, wrongAnswers(seven, 4), TZ);

    const overview = await getWarmupOverview(user.id);
    expect(overview.lastLevel).toBe(7);
    expect(overview.levels[2]).toMatchObject({ id: 3, answered: 5, correct: 5, accuracy: 100 });
    expect(overview.levels[6]).toMatchObject({ id: 7, answered: 4, correct: 0, accuracy: 0 });
  });

  it('only counts a best pace once there are enough answers to mean anything', async () => {
    const user = await makeUser();
    const short = (await startWarmupSession(user.id, 3, TZ))!;
    await recordWarmupAnswers(user.id, short.sessionId, rightAnswers(short, 5), TZ);
    expect((await getWarmupOverview(user.id)).levels[2].bestPace).toBe(0);

    const long = (await startWarmupSession(user.id, 3, TZ))!;
    await recordWarmupAnswers(user.id, long.sessionId, rightAnswers(long, 25), TZ);
    expect((await getWarmupOverview(user.id)).levels[2].bestPace).toBe(1500);
  });

  it('keeps the fastest pace, not the latest', async () => {
    const user = await makeUser();
    const fast = (await startWarmupSession(user.id, 4, TZ))!;
    await recordWarmupAnswers(
      user.id,
      fast.sessionId,
      rightAnswers(fast, 25).map((a) => ({ ...a, elapsedMs: 800 })),
      TZ
    );
    const slow = (await startWarmupSession(user.id, 4, TZ))!;
    await recordWarmupAnswers(
      user.id,
      slow.sessionId,
      rightAnswers(slow, 25).map((a) => ({ ...a, elapsedMs: 5000 })),
      TZ
    );
    expect((await getWarmupOverview(user.id)).levels[3].bestPace).toBe(800);
  });

  it('never leaks another student’s numbers', async () => {
    const mine = await makeUser();
    const theirs = await makeUser();
    const session = (await startWarmupSession(theirs.id, 3, TZ))!;
    await recordWarmupAnswers(theirs.id, session.sessionId, rightAnswers(session, 20), TZ);

    const overview = await getWarmupOverview(mine.id);
    expect(overview.levels.every((l) => l.answered === 0)).toBe(true);
  });
});

describe('session history', () => {
  it('lists newest first and hides sessions with nothing in them', async () => {
    const user = await makeUser();
    const empty = (await startWarmupSession(user.id, 1, TZ))!;
    const played = (await startWarmupSession(user.id, 2, TZ))!;
    await recordWarmupAnswers(user.id, played.sessionId, rightAnswers(played, 3), TZ);

    const { sessions, nextCursor } = await listWarmupSessions(user.id);
    expect(sessions).toHaveLength(1);
    expect(sessions[0].id).toBe(played.sessionId);
    expect(sessions[0].id).not.toBe(empty.sessionId);
    expect(nextCursor).toBeNull();
  });

  it('pages with a cursor without repeating or dropping a row', async () => {
    const user = await makeUser();
    const ids: string[] = [];
    for (let i = 0; i < 7; i++) {
      const session = (await startWarmupSession(user.id, 1, TZ))!;
      await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 2), TZ);
      ids.push(session.sessionId);
    }

    const first = await listWarmupSessions(user.id, { limit: 3 });
    expect(first.sessions).toHaveLength(3);
    expect(first.nextCursor).toBeTruthy();

    const second = await listWarmupSessions(user.id, { limit: 3, cursor: first.nextCursor! });
    const third = await listWarmupSessions(user.id, { limit: 3, cursor: second.nextCursor! });

    const seen = [...first.sessions, ...second.sessions, ...third.sessions].map((s) => s.id);
    expect(new Set(seen).size).toBe(7);
    expect(third.nextCursor).toBeNull();
  });

  it('filters to one level when asked', async () => {
    const user = await makeUser();
    for (const level of [1, 5, 5]) {
      const session = (await startWarmupSession(user.id, level, TZ))!;
      await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 2), TZ);
    }
    const { sessions } = await listWarmupSessions(user.id, { level: 5 });
    expect(sessions).toHaveLength(2);
    expect(sessions.every((s) => s.level === 5)).toBe(true);
  });

  it('reports both wall clock time and time spent answering', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 4), TZ);
    const [row] = (await listWarmupSessions(user.id)).sessions;
    expect(row.totalMs).toBe(6000);
    expect(row.durationMs).toBeGreaterThanOrEqual(0);
    expect(row.pace).toBe(1500);
  });

  it('shows nothing for a student who has never drilled', async () => {
    const user = await makeUser();
    expect(await listWarmupSessions(user.id)).toEqual({ sessions: [], nextCursor: null });
  });
});

describe('lifetime totals', () => {
  it('adds up every session', async () => {
    const user = await makeUser();
    for (const level of [1, 3]) {
      const session = (await startWarmupSession(user.id, level, TZ))!;
      await recordWarmupAnswers(
        user.id,
        session.sessionId,
        [...rightAnswers(session, 8), ...wrongAnswers(session, 2, 8)],
        TZ
      );
    }
    const totals = await getWarmupTotals(user.id);
    expect(totals).toMatchObject({ sessions: 2, answered: 20, correct: 16, accuracy: 80 });
    expect(totals.facts).toBeGreaterThan(0);
    expect(totals.xp).toBe(16);
  });

  it('is all zeroes for a fresh account', async () => {
    const user = await makeUser();
    expect(await getWarmupTotals(user.id)).toMatchObject({
      sessions: 0,
      answered: 0,
      correct: 0,
      accuracy: 0,
      pace: 0,
      facts: 0,
    });
  });
});

describe('weak spots', () => {
  it('surfaces the fact that gets missed', async () => {
    const { user, session } = await startedSession(5);
    const target = questionAt(5, session.seed, 0)!.factKey;
    const answers = Array.from({ length: 60 }, (_, idx) => {
      const question = questionAt(5, session.seed, idx)!;
      const isTarget = question.factKey === target;
      return {
        idx,
        given: isTarget ? 'wrong' : question.answer,
        elapsedMs: isTarget ? 6000 : 1200,
      };
    });
    await recordWarmupAnswers(user.id, session.sessionId, answers, TZ);

    const weak = await getWarmupWeakSpots(user.id, { level: 5, days: 30 });
    expect(weak.length).toBeGreaterThan(0);
    expect(weak[0].factKey).toBe(target);
    expect(weak[0].misses).toBe(weak[0].attempts);
    expect(weak[0].avgMs).toBe(6000);
    expect(weak[0].prompt!.length).toBeGreaterThan(0);
  });

  it('surfaces a fact that is slow even when it is never missed', async () => {
    const { user, session } = await startedSession(5);
    const target = questionAt(5, session.seed, 0)!.factKey;
    const answers = Array.from({ length: 60 }, (_, idx) => {
      const question = questionAt(5, session.seed, idx)!;
      return {
        idx,
        given: question.answer,
        elapsedMs: question.factKey === target ? 7000 : 1000,
      };
    });
    await recordWarmupAnswers(user.id, session.sessionId, answers, TZ);

    const weak = await getWarmupWeakSpots(user.id, { level: 5, days: 30 });
    expect(weak[0].factKey).toBe(target);
    expect(weak[0].misses).toBe(0);
  });

  it('ignores facts with too few attempts to judge, so one stumble is not a weak spot', async () => {
    const { user, session } = await startedSession(5);
    await recordWarmupAnswers(user.id, session.sessionId, wrongAnswers(session, 2), TZ);
    expect(await getWarmupWeakSpots(user.id, { level: 5 })).toEqual([]);
  });

  it('ignores answers older than the window', async () => {
    const { user, session } = await startedSession(5);
    await recordWarmupAnswers(user.id, session.sessionId, wrongAnswers(session, 30), TZ);
    await prisma.warmupAnswer.updateMany({
      where: { userId: user.id },
      data: { createdAt: new Date('2020-01-01T00:00:00.000Z') },
    });
    expect(await getWarmupWeakSpots(user.id, { level: 3, days: 30 })).toEqual([]);
  });

  it('returns nothing for a student who has never drilled', async () => {
    const user = await makeUser();
    expect(await getWarmupWeakSpots(user.id)).toEqual([]);
  });
});

describe('speed trend', () => {
  it('returns oldest first so a chart reads left to right', async () => {
    const user = await makeUser();
    const paces = [4000, 3000, 2000, 1000];
    for (const elapsedMs of paces) {
      const session = (await startWarmupSession(user.id, 1, TZ))!;
      await recordWarmupAnswers(
        user.id,
        session.sessionId,
        rightAnswers(session, 10).map((a) => ({ ...a, elapsedMs })),
        TZ
      );
    }
    const trend = await getWarmupSpeedTrend(user.id, { limit: 10 });
    expect(trend.map((t) => t.pace)).toEqual(paces);
  });

  it('skips sessions too short to say anything about pace', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 2), TZ);
    expect(await getWarmupSpeedTrend(user.id)).toEqual([]);
  });
});

describe('csv export', () => {
  it('exports one row per session with the full timing', async () => {
    const { user, session } = await startedSession(3);
    await recordWarmupAnswers(
      user.id,
      session.sessionId,
      [...rightAnswers(session, 6), ...wrongAnswers(session, 2, 6)],
      TZ
    );
    await endWarmupSession(user.id, session.sessionId);

    const csv = await exportWarmupCsv(user.id, 'sessions');
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toContain('session_seconds');
    expect(lines[0]).toContain('seconds_per_question');
    expect(lines).toHaveLength(2);

    const cells = lines[1].split(',');
    expect(cells[0]).toBe(session.sessionId);
    expect(cells[1]).toBe('3');
    expect(cells[5]).toBe('8');
    expect(cells[6]).toBe('6');
    expect(cells[7]).toBe('75');
  });

  it('exports one row per answer with the prompt and what they typed', async () => {
    const { user, session } = await startedSession(3);
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 3), TZ);

    const csv = await exportWarmupCsv(user.id, 'answers');
    const lines = csv.trimEnd().split('\r\n');
    expect(lines[0]).toBe(
      'session_id,level,question_number,prompt,answer,given,correct,seconds,answered_at'
    );
    expect(lines).toHaveLength(4);
    expect(lines.slice(1).every((l) => l.includes(',true,'))).toBe(true);
    expect(lines[1]).toContain('1.50');
  });

  it('quotes a prompt that contains a comma, so the columns stay aligned', async () => {
    const { user, session } = await startedSession(3);
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 1), TZ);
    await prisma.warmupAnswer.updateMany({
      where: { userId: user.id },
      data: { prompt: 'a, b', given: 'x"y' },
    });
    const csv = await exportWarmupCsv(user.id, 'answers');
    expect(csv).toContain('"a, b"');
    expect(csv).toContain('"x""y"');
    expect(csv.trimEnd().split('\r\n')[1].split(',')).toHaveLength(10);
  });

  it('exports headers only for a student with no history', async () => {
    const user = await makeUser();
    expect((await exportWarmupCsv(user.id, 'sessions')).trimEnd().split('\r\n')).toHaveLength(1);
    expect((await exportWarmupCsv(user.id, 'answers')).trimEnd().split('\r\n')).toHaveLength(1);
  });

  it('never includes another student’s rows', async () => {
    const mine = await makeUser();
    const theirs = await makeUser();
    const session = (await startWarmupSession(theirs.id, 3, TZ))!;
    await recordWarmupAnswers(theirs.id, session.sessionId, rightAnswers(session, 5), TZ);

    expect((await exportWarmupCsv(mine.id, 'answers')).trimEnd().split('\r\n')).toHaveLength(1);
    expect(await exportWarmupCsv(mine.id, 'sessions')).not.toContain(session.sessionId);
  });
});

describe('cascades', () => {
  it('takes both warm up tables with the user', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 5), TZ);

    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.warmupSession.count()).toBe(0);
    expect(await prisma.warmupAnswer.count()).toBe(0);
  });

  it('takes the answers with the session', async () => {
    const { user, session } = await startedSession();
    await recordWarmupAnswers(user.id, session.sessionId, rightAnswers(session, 5), TZ);

    await prisma.warmupSession.delete({ where: { id: session.sessionId } });

    expect(await prisma.warmupAnswer.count()).toBe(0);
    expect(await prisma.user.count({ where: { id: user.id } })).toBe(1);
  });
});
