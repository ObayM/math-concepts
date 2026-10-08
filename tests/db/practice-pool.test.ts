import { describe, it, expect } from 'vitest';
import { getExercisePoolByCourse, getNextLessonKey } from '@/lib/db/lessonService';
import { publishLesson, updateLessonSource } from '@/lib/db/contentService';
import { prisma } from '@/lib/prisma';
import {
  getTakenLessonIds,
  getMySkillTimes,
  recordPracticeAttempt,
  upsertLessonProgress,
} from '@/lib/db/progressService';
import {
  bankLesson,
  makeCourse,
  makePublishedLesson,
  makeUser,
  NUMERIC_LESSON,
} from '../helpers/factories';

describe('practice only draws from lessons the student has taken', () => {
  it('starts empty and grows as lessons are taken', async () => {
    const user = await makeUser();
    const course = await makeCourse();
    const taken = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });
    await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });

    expect(await getTakenLessonIds(user.id)).toEqual([]);
    expect(await getExercisePoolByCourse(course.id, { lessonIds: [] })).toEqual([]);

    await upsertLessonProgress(user.id, taken.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: undefined,
    });
    const ids = await getTakenLessonIds(user.id);
    expect(ids).toEqual([taken.id]);

    const pool = await getExercisePoolByCourse(course.id, { lessonIds: ids });
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((s) => s.lessonKey === taken.lessonKey)).toBe(true);
    expect((await getExercisePoolByCourse(course.id)).length).toBe(pool.length * 2);
  });

  it('knows when each skill was last practised', async () => {
    const user = await makeUser();
    const course = await makeCourse();
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });
    const before = Date.now();
    await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', 2);
    const times = await getMySkillTimes(user.id);
    const [skill] = Object.keys(times);
    expect(skill).toBeTruthy();
    expect(times[skill]).toBeGreaterThanOrEqual(before - 1000);
    expect(await getTakenLessonIds(user.id)).toEqual([lesson.id]);
  });
});

describe('banks stay out of the lesson path and out of practice', () => {
  it('leaves bank questions out of the practice pool', async () => {
    const course = await makeCourse();
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });
    await makePublishedLesson(bankLesson(3), { courseId: course.id });

    const pool = await getExercisePoolByCourse(course.id);
    expect(pool.length).toBeGreaterThan(0);
    expect(pool.every((s) => s.lessonKey === lesson.lessonKey)).toBe(true);
  });

  it('refuses a practice answer aimed at a bank question', async () => {
    const user = await makeUser();
    const bank = await makePublishedLesson(bankLesson(3));
    expect(await recordPracticeAttempt(user.id, bank.lessonKey, 'q1', '1')).toBeNull();
  });

  it('skips a bank when picking the next lesson', async () => {
    const course = await makeCourse();
    await makePublishedLesson(bankLesson(3), { courseId: course.id, sortOrder: 2 });
    const after = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id, sortOrder: 3 });
    expect(await getNextLessonKey(course.id, 1)).toBe(after.lessonKey);
  });

  it('never sends a student on to a draft', async () => {
    const course = await makeCourse();
    await makePublishedLesson(NUMERIC_LESSON, {
      courseId: course.id,
      sortOrder: 2,
      status: 'draft',
    });
    const after = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id, sortOrder: 3 });
    expect(await getNextLessonKey(course.id, 1)).toBe(after.lessonKey);
  });

  it('only turns a lesson into a bank in the catalog once that is published', async () => {
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    const { error } = await updateLessonSource(lesson.id, bankLesson(2));
    expect(error).toBeNull();
    expect((await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).kind).toBeNull();

    await publishLesson(lesson.id);
    expect((await prisma.lesson.findUniqueOrThrow({ where: { id: lesson.id } })).kind).toBe('bank');
  });
});
