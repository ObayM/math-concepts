import { z } from 'zod';

const vizElementBase = z.object({
  id: z.string(),
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  label: z.string().optional(),
});

const functionElement = vizElementBase.extend({
  type: z.literal('function'),
  expression: z.string(),
});

const parametricElement = vizElementBase.extend({
  type: z.literal('parametric'),
  xExpression: z.string(),
  yExpression: z.string(),
  tRange: z.tuple([z.number(), z.number()]).optional(),
  steps: z.number().optional(),
});

const pointElement = vizElementBase.extend({
  type: z.literal('point'),
  x: z.string(),
  y: z.string(),
  r: z.number().optional(),
});

const lineElement = vizElementBase.extend({
  type: z.literal('line'),
  x1: z.string(),
  y1: z.string(),
  x2: z.string(),
  y2: z.string(),
});

const vectorElement = vizElementBase.extend({
  type: z.literal('vector'),
  x1: z.string(),
  y1: z.string(),
  x2: z.string(),
  y2: z.string(),
});

const vLineElement = vizElementBase.extend({
  type: z.literal('v-line'),
  x: z.string(),
});

const hLineElement = vizElementBase.extend({
  type: z.literal('h-line'),
  y: z.string(),
});

const textElement = vizElementBase.extend({
  type: z.literal('text'),
  x: z.string(),
  y: z.string(),
  content: z.string(),
  fontSize: z.number().optional(),
});

const areaElement = vizElementBase.extend({
  type: z.literal('area'),
  expression: z.string().optional(),
  y1: z.string().optional(),
  y2: z.string().optional(),
  opacity: z.number().optional(),
});

export const vizElementSchema = z.discriminatedUnion('type', [
  functionElement,
  parametricElement,
  pointElement,
  lineElement,
  vectorElement,
  vLineElement,
  hLineElement,
  textElement,
  areaElement,
]);

export const vizSpecSchema = z.object({
  xDomain: z.tuple([z.number(), z.number()]).optional(),
  yDomain: z.tuple([z.number(), z.number()]).optional(),
  paramRange: z.tuple([z.number(), z.number()]).optional(),
  paramLabel: z.string().optional(),
  elements: z.array(vizElementSchema),
});

const blockBase = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  category: z.string().optional(),
});

const textBlock = blockBase.extend({
  type: z.literal('text'),
});

const graphBlock = blockBase.extend({
  type: z.literal('graph'),
  visualization: vizSpecSchema,
});

const quizBlock = blockBase.extend({
  type: z.literal('quiz'),
  quizOptions: z.array(z.string()).min(2),
  correctOption: z.number().int().min(0),
  explanation: z.string().optional(),
  skillId: z.string().optional(),
});

export const lessonBlockSchema = z.discriminatedUnion('type', [textBlock, graphBlock, quizBlock]);

export const lessonDataSchema = z.object({
  slides: z.array(lessonBlockSchema).min(1),
});

export type VizElement = z.infer<typeof vizElementSchema>;
export type VizSpec = z.infer<typeof vizSpecSchema>;
export type TextBlock = z.infer<typeof textBlock>;
export type GraphBlock = z.infer<typeof graphBlock>;
export type QuizBlock = z.infer<typeof quizBlock>;
export type LessonBlock = z.infer<typeof lessonBlockSchema>;
export type LessonData = z.infer<typeof lessonDataSchema>;
