import { describe, it, expect } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  getLessonProgress,
  upsertLessonProgress,
  recordPracticeAttempt,
  resetLessonProgress,
  replayMastery,
  MAX_ANSWER_CHARS,
} from '@/lib/db/progressService';
import { XP_ATTEMPT, XP_CORRECT, XP_LESSON_COMPLETE, lessonXpCap } from '@/lib/xp';
import { makeCourse, makePublishedLesson, makeUser, NUMERIC_LESSON } from '../helpers/factories';

const attempt = (overrides: Record<string, unknown> = {}) => ({
  title: 'Power rule',
  question: 'What is the derivative of $3x^2$ at $x = 2$?',
  slideId: 'power',
  kind: 'numeric',
  correct: false,
  answer: '12',
  ...overrides,
});

describe('the answer forgery boundary', () => {
  it('records a wrong answer as wrong no matter what the client claims', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ correct: true, answer: '999' })],
    });

    const rows = await prisma.lessonAttempt.findMany({ where: { userId: user.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0].correct).toBe(false);
  });

  it('records a right answer as right even if the client says it was wrong', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ correct: false, answer: '12' })],
    });

    const [row] = await prisma.lessonAttempt.findMany({ where: { userId: user.id } });
    expect(row.correct).toBe(true);
  });

  it('pays XP for what really happened, not what was claimed', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    const result = await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ correct: true, answer: 'nonsense' })],
    });

    expect(result!.xp).toBe(XP_ATTEMPT);
  });

  it('does not let a forged answer inflate mastery', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ correct: true, answer: '0' })],
    });

    const mastery = await prisma.userSkillMastery.findFirst({ where: { userId: user.id } });
    expect(mastery!.skill).toBe('power-rule');
    expect(mastery!.correct).toBe(0);
    expect(mastery!.score).toBe(0);
  });

});

describe('answers kept for going Back', () => {
  it('stores the answer and variant, so a reload can show them again', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: false,
      quizHistory: [
        attempt({ answer: '12', variant: 'v.token' }),
        attempt({ slideId: 'pick', kind: 'quiz', answer: 1 }),
      ],
    });

    const { quizHistory } = await getLessonProgress(user.id, lesson.lessonKey);
    const [power, pick] = quizHistory as { answer?: unknown; variant?: string }[];
    expect(power.answer).toBe('12');
    expect(power.variant).toBe('v.token');
    expect(pick.answer).toBe(1);
    expect(pick.variant).toBeUndefined();
  });

  it('drops an answer too big to keep but still records the attempt', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ answer: '1'.repeat(MAX_ANSWER_CHARS + 1) })],
    });

    const { quizHistory } = await getLessonProgress(user.id, lesson.lessonKey);
    const [entry] = quizHistory as { answer?: unknown; slideId: string }[];
    expect(entry.slideId).toBe('power');
    expect(entry).not.toHaveProperty('answer');
    expect(await prisma.lessonAttempt.count({ where: { userId: user.id } })).toBe(1);
  });

  it('keeps one answer per real exercise, however many entries arrive', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [
        attempt({ answer: '12' }),
        attempt({ answer: '13' }),
        attempt({ slideId: 'made-up', answer: '14' }),
      ],
    });

    const { quizHistory } = await getLessonProgress(user.id, lesson.lessonKey);
    const answers = (quizHistory as { answer?: unknown }[]).map((e) => e.answer);
    expect(answers).toEqual(['12', undefined, undefined]);
  });
});

describe('replays and repeat submissions', () => {
  it('does not double count when the same history is posted twice', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    const history = [attempt({ answer: '12' })];

    const first = await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: history,
    });
    const second = await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: history,
    });

    expect(await prisma.lessonAttempt.count({ where: { userId: user.id } })).toBe(1);
    expect(first!.xp).toBe(XP_CORRECT);
    expect(second!.xp).toBe(0);
  });

  it('only records the newly appended answers', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ answer: '12' })],
    });
    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: false,
      quizHistory: [
        attempt({ answer: '12' }),
        attempt({ slideId: 'pick', kind: 'quiz', answer: 0 }),
      ],
    });

    expect(await prisma.lessonAttempt.count({ where: { userId: user.id } })).toBe(2);
  });

  it('keeps recording after a resume, when the client starts from the stored history', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ answer: '12' })],
    });
    const { quizHistory: stored } = await getLessonProgress(user.id, lesson.lessonKey);
    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: false,
      quizHistory: [...(stored as never[]), attempt({ slideId: 'pick', kind: 'quiz', answer: 0 })],
    });

    expect(await prisma.lessonAttempt.count({ where: { userId: user.id } })).toBe(2);
    const after = await getLessonProgress(user.id, lesson.lessonKey);
    expect((after.quizHistory as { slideId: string }[]).map((e) => e.slideId)).toEqual([
      'power',
      'pick',
    ]);
  });

  it('never lets a shorter history from a stale client wipe what is stored', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: false,
      quizHistory: [
        attempt({ answer: '12' }),
        attempt({ slideId: 'pick', kind: 'quiz', answer: 0 }),
      ],
    });
    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: false,
      quizHistory: [attempt({ answer: '12' })],
    });

    const after = await getLessonProgress(user.id, lesson.lessonKey);
    expect(after.quizHistory).toHaveLength(2);
  });

  it('builds history from its own copy, not from what the client says happened earlier', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt({ answer: '5' })],
    });
    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: false,
      quizHistory: [
        attempt({ answer: '5', correct: true }),
        attempt({ slideId: 'pick', kind: 'quiz', answer: 0 }),
      ],
    });

    const after = await getLessonProgress(user.id, lesson.lessonKey);
    expect((after.quizHistory as { correct: boolean }[])[0].correct).toBe(false);
  });

  it('pays the completion bonus once', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    const first = await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: true,
      quizHistory: [],
    });
    const second = await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 2,
      isCompleted: true,
      quizHistory: [],
    });

    expect(first!.xp).toBe(XP_LESSON_COMPLETE);
    expect(second!.xp).toBe(0);
  });

  it('returns null for a lesson that does not exist, and writes nothing', async () => {
    const user = await makeUser();
    const result = await upsertLessonProgress(user.id, 'nope', {
      currentStep: 1,
      isCompleted: false,
      quizHistory: [attempt()],
    });
    expect(result).toBeNull();
    expect(await prisma.lessonAttempt.count()).toBe(0);
  });
});

describe('practice attempts', () => {
  it('re-derives correctness and awards XP for it', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    const right = await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', '12');
    expect(right).toEqual({ correct: true, xp: XP_CORRECT });

    const wrong = await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', '5');
    expect(wrong).toEqual({ correct: false, xp: XP_ATTEMPT });

    const mastery = await prisma.userSkillMastery.findFirst({ where: { userId: user.id } });
    expect(mastery!.attempts).toBe(2);
    expect(mastery!.correct).toBe(1);
  });

  it('refuses a draft lesson and writes nothing', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON, { status: 'draft' });

    expect(await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', '12')).toBeNull();
    expect(await prisma.lessonAttempt.count()).toBe(0);
  });

  it('refuses a slide that has no exercise', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    expect(await recordPracticeAttempt(user.id, lesson.lessonKey, 'nope', '12')).toBeNull();
  });
});

describe('mastery under concurrency', () => {
  it('loses no updates when answers land at the same time', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await Promise.all(
      Array.from({ length: 20 }, (_, i) =>
        recordPracticeAttempt(user.id, lesson.lessonKey, 'power', i % 2 === 0 ? '12' : '5')
      )
    );

    const mastery = await prisma.userSkillMastery.findFirst({ where: { userId: user.id } });
    expect(mastery!.attempts).toBe(20);
    expect(mastery!.correct).toBe(10);
    expect(await prisma.lessonAttempt.count({ where: { userId: user.id } })).toBe(20);
  });
});

describe('resetting a lesson', () => {
  it('clears its attempts and rebuilds mastery from what survives', async () => {
    const user = await makeUser();
    const course = await makeCourse();
    const a = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });
    const b = await makePublishedLesson(NUMERIC_LESSON, { courseId: course.id });

    await recordPracticeAttempt(user.id, a.lessonKey, 'power', '5');
    await recordPracticeAttempt(user.id, a.lessonKey, 'power', '5');
    for (let i = 0; i < 3; i++) await recordPracticeAttempt(user.id, b.lessonKey, 'power', '12');

    await resetLessonProgress(user.id, a.lessonKey);

    expect(await prisma.lessonAttempt.count({ where: { userId: user.id, lessonId: a.id } })).toBe(
      0
    );
    expect(await prisma.lessonAttempt.count({ where: { userId: user.id, lessonId: b.id } })).toBe(
      3
    );

    const mastery = await prisma.userSkillMastery.findFirstOrThrow({ where: { userId: user.id } });
    const expected = replayMastery([{ correct: true }, { correct: true }, { correct: true }]);
    expect(mastery.attempts).toBe(expected.attempts);
    expect(mastery.correct).toBe(expected.correct);
    expect(mastery.score).toBeCloseTo(expected.score, 9);
  });

  it('caps a lesson at one perfect run no matter how often you restart it', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    // NUMERIC_LESSON has two exercises, so a perfect run is worth this much
    const cap = lessonXpCap(2);

    const play = () =>
      upsertLessonProgress(user.id, lesson.lessonKey, {
        currentStep: 1,
        isCompleted: true,
        quizHistory: [attempt({ correct: true, answer: '12' })],
      });

    const first = await play();
    expect(first!.xp).toBe(XP_CORRECT + XP_LESSON_COMPLETE);

    // a replay can still top up the exercise that was never answered, but only
    // up to the cap, and never a third time
    await resetLessonProgress(user.id, lesson.lessonKey);
    const second = await play();
    expect(second!.xp).toBe(cap - (XP_CORRECT + XP_LESSON_COMPLETE));

    for (let i = 0; i < 3; i++) {
      await resetLessonProgress(user.id, lesson.lessonKey);
      expect((await play())!.xp).toBe(0);
    }

    const row = await prisma.userLessonProgress.findFirstOrThrow({
      where: { userId: user.id, lessonId: lesson.id },
    });
    expect(row.xpAwarded).toBe(cap);
  });

  it('keeps the xp ledger but clears the progress on reset', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);

    await upsertLessonProgress(user.id, lesson.lessonKey, {
      currentStep: 1,
      isCompleted: true,
      quizHistory: [attempt({ correct: true, answer: '12' })],
    });
    await resetLessonProgress(user.id, lesson.lessonKey);

    const row = await prisma.userLessonProgress.findFirstOrThrow({
      where: { userId: user.id, lessonId: lesson.id },
    });
    expect(row.completed).toBe(false);
    expect(row.completedAt).toBeNull();
    expect(row.currentStep).toBe(0);
    expect(row.xpAwarded).toBeGreaterThan(0);
  });

  it('drops the mastery row entirely when nothing survives', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', '12');

    await resetLessonProgress(user.id, lesson.lessonKey);
    expect(await prisma.userSkillMastery.count({ where: { userId: user.id } })).toBe(0);
  });

  it('keeps XP, because that is a record of effort already spent', async () => {
    const user = await makeUser();
    const lesson = await makePublishedLesson(NUMERIC_LESSON);
    await recordPracticeAttempt(user.id, lesson.lessonKey, 'power', '12');

    const before = await prisma.userDailyActivity.aggregate({
      where: { userId: user.id },
      _sum: { xp: true },
    });
    await resetLessonProgress(user.id, lesson.lessonKey);
    const after = await prisma.userDailyActivity.aggregate({
      where: { userId: user.id },
      _sum: { xp: true },
    });

    expect(after._sum.xp).toBe(before._sum.xp);
    expect(after._sum.xp).toBe(XP_CORRECT);
  });
});
