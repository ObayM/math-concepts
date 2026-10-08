import { prisma } from '@/lib/prisma';
import { clampClientTime, RETENTION_DAYS } from '@/lib/tracker-core';

export async function recordLessonEvents(userId, lessonKey, sessionId, events) {
  const lesson = await prisma.lesson.findUnique({ where: { lessonKey }, select: { id: true } });
  if (!lesson) return null;

  const now = Date.now();
  const { count } = await prisma.lessonEvent.createMany({
    data: events.map((e) => ({
      userId,
      lessonId: lesson.id,
      sessionId,
      slideId: e.slideId ?? null,
      type: e.type,
      clientAt: new Date(clampClientTime(e.t, now)),
      ...(e.data && { payload: e.data }),
    })),
  });
  return count;
}

export async function pruneLessonEvents(now = new Date()) {
  const before = new Date(now.getTime() - RETENTION_DAYS * 86_400_000);
  const { count } = await prisma.lessonEvent.deleteMany({ where: { createdAt: { lt: before } } });
  return count;
}
