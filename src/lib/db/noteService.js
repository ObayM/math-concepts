import { prisma } from '@/lib/prisma';

export async function getLessonNotes(userId, lessonKey) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) return null;

  const rows = await prisma.userSlideNote.findMany({
    where: { userId, lessonId: lesson.id },
    select: { slideId: true, notes: true, strokes: true },
  });

  return Object.fromEntries(
    rows.map((r) => [r.slideId, { notes: r.notes, strokes: r.strokes ?? null }])
  );
}

export async function upsertSlideNote(userId, lessonKey, slideId, { notes, strokes }) {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey },
    select: { id: true },
  });
  if (!lesson) return null;

  const empty = !notes.trim() && !strokes?.length;
  const key = { userId_lessonId_slideId: { userId, lessonId: lesson.id, slideId } };

  if (empty) {
    await prisma.userSlideNote.deleteMany({ where: { userId, lessonId: lesson.id, slideId } });
    return { ok: true };
  }

  await prisma.userSlideNote.upsert({
    where: key,
    update: { notes, strokes: strokes ?? null },
    create: { userId, lessonId: lesson.id, slideId, notes, strokes: strokes ?? null },
  });

  return { ok: true };
}
