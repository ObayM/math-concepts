import { z } from 'zod';

// expr = a number, or a string i eval against scene state
const expr = z.union([z.string(), z.number()]);

// state = named typed params. ditched the old single interactiveValue
const numberVar = z.object({
  type: z.literal('number'),
  init: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});
const booleanVar = z.object({ type: z.literal('boolean'), init: z.boolean() });
const enumVar = z.object({
  type: z.literal('enum'),
  init: z.string(),
  options: z.array(z.string()).min(1),
});
const stateVar = z.discriminatedUnion('type', [numberVar, booleanVar, enumVar]);

// space = the coord system the scene lives in
const space = z.object({
  type: z.enum(['plane', 'numberline', 'geometry', 'free']),
  xDomain: z.tuple([z.number(), z.number()]),
  yDomain: z.tuple([z.number(), z.number()]),
  grid: z.boolean().optional(),
  axes: z.boolean().optional(),
  render: z.enum(['svg']).optional(),
});

// objects = the visual stuff, props are exprs over state
const objBase = {
  id: z.string(),
  color: z.string().optional(),
  strokeWidth: z.number().optional(),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  visibleIf: z.string().optional(),
};

const curveObj = z.object({ type: z.literal('curve'), expr: z.string(), ...objBase });
const pointObj = z.object({
  type: z.literal('point'),
  x: expr,
  y: expr,
  r: z.number().optional(),
  label: z.string().optional(),
  draggable: z.object({ axis: z.enum(['x', 'y', 'xy']), bind: z.string() }).optional(),
  ...objBase,
});
const lineObj = z.object({
  type: z.literal('line'),
  through: z.string().optional(), // pin it to a point's id
  slope: expr.optional(),
  x1: expr.optional(),
  y1: expr.optional(),
  x2: expr.optional(),
  y2: expr.optional(),
  ...objBase,
});
const labelObj = z.object({
  type: z.literal('label'),
  x: expr,
  y: expr,
  text: z.string(), // you can drop ${expr} in here
  fontSize: z.number().optional(),
  ...objBase,
});

const sceneObject = z.discriminatedUnion('type', [curveObj, pointObj, lineObj, labelObj]);

// controls = the widgets, wired both ways to state
const sliderControl = z.object({
  as: z.literal('slider'),
  bind: z.string(),
  label: z.string().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
});
const toggleControl = z.object({
  as: z.literal('toggle'),
  bind: z.string(),
  label: z.string().optional(),
});
const control = z.discriminatedUnion('as', [sliderControl, toggleControl]);

export const sceneSchema = z.object({
  state: z.record(z.string(), stateVar),
  space,
  objects: z.array(sceneObject),
  controls: z.array(control).optional(),
});
