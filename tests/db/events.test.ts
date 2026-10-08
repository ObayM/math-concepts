import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { pruneLessonEvents, recordLessonEvents } from '@/lib/db/eventService';
import { RETENTION_DAYS } from '@/lib/tracker-core';
import { makePublishedLesson, makeUser, NUMERIC_LESSON } from '../helpers/factories';

describe('lesson events', () => {
  it('writes one row per event against the lesson id', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    const t = Date.now() - 5000;

    const count = await recordLessonEvents(user.id, lesson.lessonKey, 'sess-1', [
      { type: 'slide_enter', slideId: 'power', t },
      {
        type: 'slide_leave',
        slideId: 'power',
        t: t + 4000,
        data: { activeMs: 4000, wallMs: 4000 },
      },
    ]);

    expect(count).toBe(2);
    const rows = await prisma.lessonEvent.findMany({ orderBy: { clientAt: 'asc' } });
    expect(rows.map((r) => r.type)).toEqual(['slide_enter', 'slide_leave']);
    expect(rows[0]).toMatchObject({ lessonId: lesson.id, sessionId: 'sess-1', slideId: 'power' });
    expect(rows[0].clientAt.getTime()).toBe(t);
    expect(rows[1].payload).toEqual({ activeMs: 4000, wallMs: 4000 });
  });

  it('returns null for a lesson that does not exist', async () => {
    const user = await makeUser();
    const count = await recordLessonEvents(user.id, 'no-such-lesson', 's', [
      { type: 'lesson_open', t: Date.now() },
    ]);
    expect(count).toBeNull();
    expect(await prisma.lessonEvent.count()).toBe(0);
  });

  it('clamps a client clock that is wildly off', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    await recordLessonEvents(user.id, lesson.lessonKey, 's', [{ type: 'lesson_open', t: 0 }]);
    const row = await prisma.lessonEvent.findFirstOrThrow();
    expect(Date.now() - row.clientAt.getTime()).toBeLessThanOrEqual(86_400_000 + 5000);
  });

  it('goes away with the account', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    await recordLessonEvents(user.id, lesson.lessonKey, 's', [
      { type: 'lesson_open', t: Date.now() },
    ]);
    await prisma.user.delete({ where: { id: user.id } });
    expect(await prisma.lessonEvent.count()).toBe(0);
  });

  it('prunes only what is past the retention window', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    await recordLessonEvents(user.id, lesson.lessonKey, 's', [
      { type: 'lesson_open', t: Date.now() },
      { type: 'lesson_close', t: Date.now() },
    ]);
    const old = new Date(Date.now() - (RETENTION_DAYS + 1) * 86_400_000);
    await prisma.lessonEvent.updateMany({
      where: { type: 'lesson_open' },
      data: { createdAt: old },
    });

    expect(await pruneLessonEvents()).toBe(1);
    const left = await prisma.lessonEvent.findMany();
    expect(left.map((r) => r.type)).toEqual(['lesson_close']);
  });
});
