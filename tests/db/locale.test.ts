import { describe, it, expect } from 'vitest';
import { resolveCourseBySlug, getCourses } from '@/lib/db/courseService';
import { getLessonByKey } from '@/lib/db/lessonService';
import { recordPracticeAttempt } from '@/lib/db/progressService';
import { prisma } from '@/lib/prisma';
import { makeCourse, makePublishedLesson, makeUser, NUMERIC_LESSON } from '../helpers/factories';

describe('courses are scoped by language', () => {
  it('refuses a course from the other language', async () => {
    const arabic = await makeCourse({ lang: 'ar' });

    expect(await resolveCourseBySlug(arabic.slug!, 'ar')).not.toBeNull();
    expect(await resolveCourseBySlug(arabic.slug!, 'en')).toBeNull();
  });

  it('scopes the legacy name fallback too, not just the slug lookup', async () => {
    const arabic = await makeCourse({ lang: 'ar', slug: null });

    expect(await resolveCourseBySlug(arabic.name.toLowerCase(), 'ar')).not.toBeNull();
    expect(await resolveCourseBySlug(arabic.name.toLowerCase(), 'en')).toBeNull();
  });

  it('still resolves when no language is asked for', async () => {
    const arabic = await makeCourse({ lang: 'ar' });
    expect(await resolveCourseBySlug(arabic.slug!, undefined)).not.toBeNull();
  });

  it('filters the catalog', async () => {
    const arabic = await makeCourse({ lang: 'ar' });
    const ids = (await getCourses({ lang: 'ar' })).map((c) => c.id);
    expect(ids).toContain(arabic.id);

    const englishIds = (await getCourses({ lang: 'en' })).map((c) => c.id);
    expect(englishIds).not.toContain(arabic.id);
  });
});

describe('lessons are guarded by their course language', () => {
  it('will not serve an arabic lesson from an english host', async () => {
    const course = await makeCourse({ lang: 'ar' });
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });

    expect(await getLessonByKey(lesson.lessonKey, 'ar')).not.toBeNull();
    expect(await getLessonByKey(lesson.lessonKey, 'en')).toBeNull();
  });

  it('still resolves with no language, which is how admin preview reads it', async () => {
    const course = await makeCourse({ lang: 'ar' });
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });
    expect(await getLessonByKey(lesson.lessonKey)).not.toBeNull();
  });
});

describe('attempts record the language they were answered in', () => {
  it('stamps lang from the course', async () => {
    const user = await makeUser();
    const course = await makeCourse({ lang: 'ar' });
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });

    const result = await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', 2);
    expect(result).not.toBeNull();

    const attempt = await prisma.lessonAttempt.findFirst({
      where: { userId: user.id, lessonId: lesson.id },
      select: { lang: true },
    });
    expect(attempt?.lang).toBe('ar');
  });
});
