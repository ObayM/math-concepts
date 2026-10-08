export type LessonStatus = 'locked' | 'unlocked' | 'completed';

interface LessonRow {
  lessonKey: string;
  kind?: string | null;
}

interface Progress {
  completed?: boolean;
  currentStep?: number;
}

export const isBank = (lesson: { kind?: string | null }) => lesson.kind === 'bank';

// a bank is optional: it opens with the lesson before it but never holds up the one after
export function lessonStatuses(
  lessons: LessonRow[],
  progressOf: (lessonKey: string) => Progress | undefined,
  unlockAll = false
): LessonStatus[] {
  let previousDone = true;
  return lessons.map((lesson) => {
    const progress = progressOf(lesson.lessonKey);
    const started = (progress?.currentStep ?? 0) > 0;
    const status: LessonStatus = progress?.completed
      ? 'completed'
      : previousDone || started || unlockAll
        ? 'unlocked'
        : 'locked';
    if (!isBank(lesson)) previousDone = Boolean(progress?.completed);
    return status;
  });
}
