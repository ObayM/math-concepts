import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import { getLessonNotes, upsertSlideNote } from '@/lib/db/noteService';
import { makePublishedLesson, makeUser, NUMERIC_LESSON } from '../helpers/factories';

const stroke = (points: number[][]) => ({ points });

describe('scratchpad notes', () => {
  it('round-trips text and strokes for a slide', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(user.id, lesson.lessonKey, 'power', {
      notes: 'bring the $2$ down',
      strokes: [
        stroke([
          [0, 0],
          [10, 20],
        ]),
      ],
    });

    const notes = await getLessonNotes(user.id, lesson.lessonKey);
    expect(notes).toEqual({
      power: {
        notes: 'bring the $2$ down',
        strokes: [
          {
            points: [
              [0, 0],
              [10, 20],
            ],
          },
        ],
      },
    });
  });

  it('keeps each slide separate', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(user.id, lesson.lessonKey, 'power', { notes: 'first', strokes: null });
    await upsertSlideNote(user.id, lesson.lessonKey, 'pick', { notes: 'second', strokes: null });

    const notes = await getLessonNotes(user.id, lesson.lessonKey);
    expect(notes?.power.notes).toBe('first');
    expect(notes?.pick.notes).toBe('second');
  });

  it('keeps each learner separate', async () => {
    const [a, b] = await Promise.all([makeUser(), makeUser()]);
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(a.id, lesson.lessonKey, 'power', { notes: 'mine', strokes: null });

    expect(await getLessonNotes(b.id, lesson.lessonKey)).toEqual({});
  });

  it('overwrites rather than piling up rows', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(user.id, lesson.lessonKey, 'power', { notes: 'draft', strokes: null });
    await upsertSlideNote(user.id, lesson.lessonKey, 'power', { notes: 'final', strokes: null });

    const rows = await prisma.userSlideNote.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].notes).toBe('final');
  });

  it('deletes the row once a slide is cleared back to empty', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(user.id, lesson.lessonKey, 'power', {
      notes: 'something',
      strokes: [stroke([[1, 1]])],
    });
    await upsertSlideNote(user.id, lesson.lessonKey, 'power', { notes: '   ', strokes: [] });

    expect(await prisma.userSlideNote.count({ where: { userId: user.id } })).toBe(0);
  });

  it('returns null for a lesson that does not exist', async () => {
    const user = await makeUser();

    expect(await getLessonNotes(user.id, 'no-such-lesson')).toBeNull();
    expect(
      await upsertSlideNote(user.id, 'no-such-lesson', 'power', { notes: 'hi', strokes: null })
    ).toBeNull();
  });

  it('goes away with the lesson', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(user.id, lesson.lessonKey, 'power', { notes: 'hi', strokes: null });
    await prisma.lesson.delete({ where: { id: lesson.id } });

    expect(await prisma.userSlideNote.count({ where: { userId: user.id } })).toBe(0);
  });

  it('goes away with the learner', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertSlideNote(user.id, lesson.lessonKey, 'power', { notes: 'hi', strokes: null });
    await prisma.user.delete({ where: { id: user.id } });

    expect(await prisma.userSlideNote.count({ where: { lessonId: lesson.id } })).toBe(0);
  });
});
