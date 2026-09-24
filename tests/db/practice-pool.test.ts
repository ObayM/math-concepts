import { describe, it, expect } from 'vitest';
import { getExercisePoolByCourse } from '@/lib/db/lessonService';
import {
  getTakenLessonIds,
  getMySkillTimes,
  recordPracticeAttempt,
  upsertLessonProgress,
} from '@/lib/db/progressService';
import { makeCourse, makePublishedLesson, makeUser, NUMERIC_LESSON } from '../helpers/factories';

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
