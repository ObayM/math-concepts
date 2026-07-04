import { z } from 'zod';
import { sceneSchema } from './schema';
import { exprIRSchema } from '@/engine/expr';

// Lesson IR v2 — the whole lesson compiles to this from one Prism source.
// a slide is a COMPOSITION (prose? + scene? + exercise? + goals?), not a type,
// so a new interaction is a new exercise kind, never a new slide type.

// every exercise shares these; `kind` discriminates the rest
const exerciseBase = {
  prompt: z.string(),
  hints: z.array(z.string()).default([]),
  explanation: z.string().optional(),
  skill: z.string().optional(),
};

const quizExercise = z.object({
  kind: z.literal('quiz'),
  options: z.array(z.object({ text: z.string(), why: z.string().optional() })).min(2),
  correct: z.number().int().nonnegative(),
  ...exerciseBase,
});

const numericExercise = z.object({
  kind: z.literal('numeric'),
  answers: z.array(z.number()).min(1), // any listed value within tolerance is correct
  tolerance: z.number().nonnegative(),
  unit: z.string().optional(),
  ...exerciseBase,
});

const buildToken = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['operand', 'operator']).optional(),
});

const buildExercise = z.object({
  kind: z.literal('build'),
  bank: z.array(buildToken).min(1),
  answers: z.array(z.array(z.string())).min(1), // any listed sequence is accepted
  slots: z.number().int().positive(),
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
  tableExercise,
]);

export const goal = z.object({
  prompt: z.string(),
  when: exprIRSchema,
  hint: z.string().optional(),
});

const slide = z.object({
  id: z.string(),
  title: z.string().optional(),
  category: z.string().optional(),
  skill: z.string().optional(),
  prose: z.string().optional(),
  scene: sceneSchema.optional(),
  exercise: exercise.optional(),
  goals: z.array(goal).optional(),
});

export const lessonSchema = z.object({
  version: z.literal(2),
  title: z.string(),
  course: z.string().optional(),
  skills: z.array(z.string()).optional(),
  slides: z.array(slide).min(1),
});

export type LessonIR = z.infer<typeof lessonSchema>;
export type SlideIR = z.infer<typeof slide>;
export type ExerciseIR = z.infer<typeof exercise>;
export type GoalIR = z.infer<typeof goal>;
