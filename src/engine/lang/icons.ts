export const LESSON_ICONS = [
  'Check',
  'ChevronRight',
  'Circle',
  'Dumbbell',
  'FunctionSquare',
  'LineChart',
  'Link',
  'Lock',
  'MapPin',
  'Move',
  'Play',
  'Ruler',
  'Sigma',
  'Star',
  'TrendingUp',
  'Triangle',
  'Undo2',
  'Waves',
  'X',
] as const;

export type LessonIcon = (typeof LESSON_ICONS)[number];

export const LESSON_DIFFICULTIES = ['Beginner', 'Intermediate', 'Advanced'] as const;

export type LessonDifficulty = (typeof LESSON_DIFFICULTIES)[number];

export const LESSON_KINDS = ['bank'] as const;

export const SLIDE_BEATS = [
  'check',
  'bridge',
  'hook',
  'explore',
  'reveal',
  'trap',
  'name',
  'breaker',
  'example',
  'transfer',
  'detour',
] as const;

export type SlideBeat = (typeof SLIDE_BEATS)[number];
