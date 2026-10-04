import { describe, it, expect } from 'vitest';
import { getLessonByKey, listTopics } from '@/lib/db/lessonService';
import { createTopic, moveLessonToCourse, publishLesson } from '@/lib/db/contentService';
import { makeCourse, makePublishedLesson, NUMERIC_LESSON } from '../helpers/factories';

const topicSource = (title: string, unit: string) => `lesson "${title}" {
  unit: "${unit}"
  slide "Power rule" {
    id: "power"
    numeric {
      ask "What is the derivative of $3x^2$ at $x = 2$?"
      answer: 12
    }
  }
}`;

describe('a topic carries its own language', () => {
  it('is served on its own host and refused on the other', async () => {
    const topic = await makePublishedLesson(NUMERIC_LESSON, { courseId: null, lang: 'ar' });

    expect(await getLessonByKey(topic.lessonKey, 'ar')).not.toBeNull();
    expect(await getLessonByKey(topic.lessonKey, 'en')).toBeNull();
    expect(await getLessonByKey(topic.lessonKey)).not.toBeNull();
  });

  it('drops its language when it moves into a course', async () => {
    const { lesson } = await createTopic({
      source: topicSource('Moved', 'Calculus'),
      lang: 'en',
      authorId: null,
    });
    const course = await makeCourse({ lang: 'en' });

    const moved = await moveLessonToCourse(lesson!.id, course.id);
    expect(moved.lang).toBeNull();
  });
});

describe('createTopic', () => {
  it('saves a courseless draft with a recognisable key', async () => {
    const { lesson, error } = await createTopic({
      source: topicSource('Chain rule', 'Calculus'),
      lang: 'en',
      authorId: null,
    });

    expect(error).toBeNull();
    expect(lesson!.courseId).toBeNull();
    expect(lesson!.lang).toBe('en');
    expect(lesson!.status).toBe('draft');
    expect(lesson!.unit).toBe('Calculus');
    expect(lesson!.lessonKey).toMatch(/^topic-chain-rule-/);
  });

  it('prefixes arabic keys the way the rest of the arabic content is', async () => {
    const { lesson } = await createTopic({
      source: topicSource('Chain rule', 'Calculus'),
      lang: 'ar',
      authorId: null,
    });
    expect(lesson!.lessonKey).toMatch(/^ar-topic-/);
  });

  it('hands back the compile error instead of saving', async () => {
    const result = await createTopic({ source: 'lesson {', lang: 'en', authorId: null });
    expect(result.lesson).toBeNull();
    expect(result.error).toBeTruthy();
  });
});

describe('listTopics', () => {
  it('groups published topics of one language by subject, and nothing else', async () => {
    const unit = `Unit-${Date.now()}`;
    const a = await createTopic({ source: topicSource('Alpha', unit), lang: 'en', authorId: null });
    const b = await createTopic({ source: topicSource('Beta', unit), lang: 'en', authorId: null });
    await createTopic({ source: topicSource('Draft only', unit), lang: 'en', authorId: null });
    await publishLesson(a.lesson!.id);
    await publishLesson(b.lesson!.id);
    const arabic = await createTopic({
      source: topicSource('Arabic', unit),
      lang: 'ar',
      authorId: null,
    });
    await publishLesson(arabic.lesson!.id);
    await makePublishedLesson(topicSource('In a course', unit));

    const group = (await listTopics('en')).find((g) => g.unit === unit);
    expect(group!.lessons.map((l: { title: string }) => l.title)).toEqual(['Alpha', 'Beta']);
  });
});
