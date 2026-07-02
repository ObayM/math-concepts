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

export const exercise = z.discriminatedUnion('kind', [quizExercise, buildExercise]);

// a goal gates the slide's Continue until `when` has been true (latches)
const goal = z.object({
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
