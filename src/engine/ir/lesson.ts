import { z } from 'zod';
import { sceneSchema } from './schema';
import { exprIRSchema } from '@/engine/expr';
import { LESSON_DIFFICULTIES, LESSON_ICONS, SLIDE_BEATS } from '@/engine/lang/icons';

// the stored IR is a cache of the compiled source, never the record. anything
// older than this gets recompiled on read rather than migrated. see issue #7.
export const LESSON_IR_VERSION = 2;

export function irNeedsRecompile(ir: unknown): boolean {
  if (!ir || typeof ir !== 'object') return false;
  return (ir as { version?: unknown }).version !== LESSON_IR_VERSION;
}

const branch = z.object({ slide: z.string(), retry: z.boolean().optional() });

const exerciseBase = {
  prompt: z.string(),
  hints: z.array(z.string()).default([]),
  explanation: z.string().optional(),
  skill: z.string().optional(),
  onwrong: branch.optional(),
  after: z.union([z.literal('goals'), z.number().int().positive()]).optional(),
};

const quizExercise = z.object({
  kind: z.literal('quiz'),
  options: z
    .array(z.object({ text: z.string(), why: z.string().optional(), onwrong: branch.optional() }))
    .min(2),
  correct: z.number().int().nonnegative(),
  ...exerciseBase,
});

const numericExercise = z.object({
  kind: z.literal('numeric'),
  answers: z.array(z.number()).min(1), // any listed value within tolerance is correct
  tolerance: z.number().nonnegative(),
  unit: z.string().optional(),
  wrong: z
    .array(z.object({ value: z.number(), why: z.string().optional(), onwrong: branch.optional() }))
    .optional(),
  ...exerciseBase,
});

const buildToken = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['operand', 'operator']).optional(),
});

const templateSeg = z.union([z.object({ text: z.string() }), z.object({ slot: z.literal(true) })]);

const buildExercise = z.object({
  kind: z.literal('build'),
  bank: z.array(buildToken).min(1),
  answers: z.array(z.array(z.string())).min(1), // any listed sequence is accepted
  slots: z.number().int().positive(),
  template: z.array(templateSeg).optional(),
  reusable: z.boolean().optional(),
  ...exerciseBase,
});

const hotspotTarget = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('rect'), x: z.number(), y: z.number(), w: z.number(), h: z.number() }),
  z.object({ kind: z.literal('circle'), x: z.number(), y: z.number(), r: z.number() }),
]);

const hotspotExercise = z.object({
  kind: z.literal('hotspot'),
  target: hotspotTarget,
  miss: z.string().optional(),
  ...exerciseBase,
});

const sketchExercise = z.object({
  kind: z.literal('sketch'),
  mode: z.enum(['curve', 'points', 'line']),
  targets: z.array(z.tuple([z.number(), z.number()])).optional(),
  through: z.tuple([z.number(), z.number()]).optional(),
  slope: z.number().optional(),
  slopeTol: z.number().nonnegative().optional(),
  follows: exprIRSchema.optional(),
  over: z.tuple([z.number(), z.number()]).optional(),
  tol: z.number().nonnegative(),
  ...exerciseBase,
});

const matchExercise = z.object({
  kind: z.literal('match'),
  pairs: z.array(z.object({ left: z.string(), right: z.string() })).min(2),
  decoys: z.array(z.string()).optional(),
  ...exerciseBase,
});

const orderExercise = z.object({
  kind: z.literal('order'),
  items: z.array(z.string()).min(2), // the correct sequence, in the declared order
  decoys: z.array(z.string()).optional(),
  ...exerciseBase,
});

const sortExercise = z.object({
  kind: z.literal('sort'),
  bins: z.array(z.object({ label: z.string(), items: z.array(z.string()).min(1) })).min(2),
  ...exerciseBase,
});

const tableCell = z.union([
  z.object({ value: z.number() }),
  z.object({ blank: z.literal(true), answer: z.number() }),
]);

const tableExercise = z.object({
  kind: z.literal('table'),
  header: z.array(z.string()).optional(),
  rows: z.array(z.array(tableCell)).min(1),
  tolerance: z.number().nonnegative(),
  ...exerciseBase,
});

export const exercise = z.discriminatedUnion('kind', [
  quizExercise,
  numericExercise,
  buildExercise,
  hotspotExercise,
  sketchExercise,
  matchExercise,
  orderExercise,
  sortExercise,
  tableExercise,
]);

export const goal = z.object({
  prompt: z.string(),
  when: exprIRSchema,
  hint: z.string().optional(),
  hints: z.array(z.string()).optional(),
  showme: z
    .object({
      set: z.record(z.string(), z.union([z.number(), z.boolean()])),
      duration: z.number().nonnegative().optional(),
    })
    .optional(),
});

const slide = z.object({
  id: z.string(),
  title: z.string().optional(),
  beat: z.enum(SLIDE_BEATS).optional(),
  category: z.string().optional(),
  skill: z.string().optional(),
  hidden: z.boolean().optional(),
  then: z.string().optional(),
  prose: z.string().optional(),
  scene: sceneSchema.optional(),
  exercise: exercise.optional(),
  goals: z.array(goal).optional(),
});

export const lessonSchema = z.object({
  version: z.literal(LESSON_IR_VERSION),
  title: z.string(),
  course: z.string().optional(),
  skills: z.array(z.string()).optional(),
  unit: z.string().optional(),
  difficulty: z.enum(LESSON_DIFFICULTIES).optional(),
  icon: z.enum(LESSON_ICONS).optional(),
  summary: z.string().optional(),
  slides: z.array(slide).min(1),
});

export type LessonIR = z.infer<typeof lessonSchema>;
export type SlideIR = z.infer<typeof slide>;
export type ExerciseIR = z.infer<typeof exercise>;
export type GoalIR = z.infer<typeof goal>;
