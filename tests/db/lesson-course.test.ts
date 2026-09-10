import { describe, it, expect } from 'vitest';
import { getLessonByKey } from '@/lib/db/lessonService';
import { courseUrlSlug } from '@/lib/db/courseService';
import { makeCourse, makePublishedLesson, NUMERIC_LESSON } from '../helpers/factories';

describe('a lesson knows which course url is its own', () => {
  it('hands back the slug the route needs to build a canonical path', async () => {
    const course = await makeCourse({ lang: 'en' });
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });

    const row = await getLessonByKey(lesson.lessonKey, 'en');

    expect(row!.course.slug).toBe(course.slug);
    expect(courseUrlSlug(row!.course)).toBe(course.slug);
  });

  it('falls back to the name for a course that predates the slug column', async () => {
    const course = await makeCourse({ lang: 'en', slug: null });
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });

    const row = await getLessonByKey(lesson.lessonKey, 'en');

    expect(courseUrlSlug(row!.course)).toBe(course.name.toLowerCase());
  });

  it('names a different course than a foreign slug would suggest', async () => {
    const mechanics = await makeCourse({ lang: 'en' });
    const calculus = await makeCourse({ lang: 'en' });
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: calculus.id });

    const row = await getLessonByKey(lesson.lessonKey, 'en');

    expect(courseUrlSlug(row!.course)).toBe(calculus.slug);
    expect(courseUrlSlug(row!.course)).not.toBe(mechanics.slug);
  });
});
