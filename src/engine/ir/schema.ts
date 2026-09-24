import { z } from 'zod';
import { exprIRSchema, textSchema } from '@/engine/expr';

export const MAX_CURVE_STEPS = 2000;

// expr = a number, an expression AST, or (v1, being phased out) a string.
// the string form dies with the runtime cutover — new compiles emit trees.
const expr = z.union([z.string(), z.number(), exprIRSchema]);

// text that can carry live ${} values: v1 plain string or v2 {parts}
const liveText = z.union([z.string(), textSchema]);

// state = named typed params. ditched the old single interactiveValue
const numberVar = z.object({
  type: z.literal('number'),
  init: z.number(),
  min: z.number().optional(),
  max: z.number().optional(),
  step: z.number().optional(),
  keep: z.boolean().optional(),
});
const booleanVar = z.object({ type: z.literal('boolean'), init: z.boolean() });
const enumVar = z.object({
  type: z.literal('enum'),
  init: z.string(),
  options: z.array(z.string()).min(1),
});
const stateVar = z.discriminatedUnion('type', [numberVar, booleanVar, enumVar]);

// space = the coord system the scene lives in
// yDomain is required for everything except numberline (which is 1D)
const space = z
  .object({
    type: z.enum(['plane', 'numberline', 'geometry', 'free', 'space3']),
    xDomain: z.tuple([z.number(), z.number()]),
    yDomain: z.tuple([z.number(), z.number()]).optional(),
    zDomain: z.tuple([z.number(), z.number()]).optional(),
    // azimuth and elevation in degrees. exprs, so a slider can spin the scene.
    camera: z.tuple([expr, expr]).optional(),
    xView: z.tuple([expr, expr]).optional(),
    yView: z.tuple([expr, expr]).optional(),
    grid: z.boolean().optional(),
    axes: z.boolean().optional(),
    aspect: z.literal('equal').optional(),
  })
  .refine((s) => s.type === 'numberline' || s.yDomain !== undefined, {
    message: 'yDomain is required unless type is "numberline"',
    path: ['yDomain'],
  })
  .refine((s) => s.type !== 'space3' || s.zDomain !== undefined, {
    message: 'zDomain is required when type is "space3"',
    path: ['zDomain'],
  });

// objects = the visual stuff, props are exprs over state
const objBase = {
  id: z.string(),
  color: z.string().optional(),
  role: z.string().optional(),
  alpha: expr.optional(),
  draw: expr.optional(),
  strokeWidth: z.number().optional(),
  style: z.enum(['solid', 'dashed', 'dotted']).optional(),
  visibleIf: z.union([z.string(), exprIRSchema]).optional(),

  phase: z.enum(['reveal']).optional(),
};

// a curve is either y = f(x) (expr) or parametric (xExpr/yExpr over t in tDomain).
// the emitter guarantees exactly one form is present.
const curveObj = z.object({
  type: z.literal('curve'),
  expr: expr.optional(),
  xExpr: expr.optional(),
  yExpr: expr.optional(),
  tDomain: z.tuple([z.number(), z.number()]).optional(),
  tSteps: z.number().optional(),
  // a boolean predicate in x — the curve is drawn only where it holds (piecewise)
  where: z.union([z.string(), exprIRSchema]).optional(),
  ...objBase,
});

// a shaded region between y = expr (upper) and y = lower (default 0), bounded to
// x in [from, to] (default the scene's xDomain). from/to/lower may bind to state.
const areaObj = z.object({
  type: z.literal('area'),
  expr,
  lower: expr.optional(),
  from: expr.optional(),
  to: expr.optional(),
  opacity: z.number().optional(),
  ...objBase,
});
const pointObj = z.object({
  type: z.literal('point'),
  x: expr,
  y: expr,
  r: z.number().optional(),
  // hollow (unfilled) marker — open circles for limit holes / one-sided endpoints
  open: z.boolean().optional(),
  label: liveText.optional(),
  // bind = x-axis state key; bindY = y-axis state key (for axis 'xy' free drag)
  // along = constrain the drag to a circle/segment, writing an angle/t param to bind instead
  draggable: z
    .object({
      axis: z.enum(['x', 'y', 'xy']).optional(),
      bind: z.string(),
      bindY: z.string().optional(),
      snap: z.union([z.number(), z.tuple([z.number(), z.number()]), z.literal('grid')]).optional(),
      along: z.object({ ref: z.string() }).optional(),
    })
    .optional(),
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
  text: liveText, // you can drop ${expr} in here
  fontSize: z.number().optional(),
  anchor: z.enum(['start', 'middle', 'end']).optional(),
  tex: z.boolean().optional(), // render text as LaTeX (KaTeX) instead of plain
  ...objBase,
});

// (x, y) is the bottom-left corner in scene coords; w/h in scene units
// rotate is degrees counter-clockwise about (x, y), the placement anchor
const rectObj = z.object({
  type: z.literal('rect'),
  x: expr,
  y: expr,
  w: expr,
  h: expr,
  rotate: expr.optional(),
  opacity: z.number().optional(),
  ...objBase,
});

// (x, y) is the center; r is the radius in scene units
const circleObj = z.object({
  type: z.literal('circle'),
  x: expr,
  y: expr,
  r: expr,
  opacity: z.number().optional(),
  ...objBase,
});

// rotate is degrees counter-clockwise about the first vertex
const polygonObj = z.object({
  type: z.literal('polygon'),
  points: z.array(z.tuple([expr, expr])).min(2),
  rotate: expr.optional(),
  opacity: z.number().optional(),
  ...objBase,
});

// an arrow from (x1,y1) to (x2,y2)
const vectorObj = z.object({
  type: z.literal('vector'),
  x1: expr,
  y1: expr,
  x2: expr,
  y2: expr,
  ...objBase,
});

// arc/angle marker: center (x,y), radius r, from `start`° to `end`° (CCW)
const arcObj = z.object({
  type: z.literal('arc'),
  x: expr,
  y: expr,
  r: expr,
  start: expr,
  end: expr,
  ...objBase,
});

// (x, y) is the bottom-left corner in scene coords; w/h in scene units.
// src is a URL, data:image/ URI, or root-relative path (checked at compile time);
// alt is required — it's the scene's accessibility description for this image.
const imageObj = z.object({
  type: z.literal('image'),
  x: expr,
  y: expr,
  w: expr,
  h: expr,
  src: z.string(),
  alt: z.string().min(1),
  opacity: z.number().optional(),
  ...objBase,
});

// count is a NumExpr so it can bind to state (e.g. a slider); the renderer
// expands this into `count` copies of body at render time — see runtime/expand.ts.
// body items are plain scene objects, keyed `${id}#${i}` once expanded. shares
// objBase (id/visibleIf/...) so it needs no special-casing where other objects go.
const repeatObj = z.object({
  type: z.literal('repeat'),
  var: z.string(),
  count: expr,
  body: z.array(z.lazy((): z.ZodTypeAny => sceneObject)),
  ...objBase,
});

// --- three dimensions -------------------------------------------------------
// every 3d object carries world coordinates; the renderer projects and depth
// sorts them. they are only legal inside a space3 scene.
const point3Obj = z.object({
  type: z.literal('point3'),
  x: expr,
  y: expr,
  z: expr,
  r: z.number().optional(),
  open: z.boolean().optional(),
  label: liveText.optional(),
  // drop dashed rails down to the coordinate planes, the standard way a textbook
  // shows where a point sits
  guides: z.boolean().optional(),
  ...objBase,
});
const segment3Obj = z.object({
  type: z.literal('segment3'),
  x1: expr,
  y1: expr,
  z1: expr,
  x2: expr,
  y2: expr,
  z2: expr,
  arrow: z.boolean().optional(),
  label: liveText.optional(),
  ...objBase,
});
const polygon3Obj = z.object({
  type: z.literal('polygon3'),
  points: z.array(z.tuple([expr, expr, expr])).min(3),
  fill: z.string().optional(),
  opacity: z.number().optional(),
  ...objBase,
});
// a plane drawn as a bounded patch around `through`, spanned by two directions
// the emitter derives from the normal
const plane3Obj = z.object({
  type: z.literal('plane3'),
  nx: expr,
  ny: expr,
  nz: expr,
  through: z.tuple([expr, expr, expr]),
  size: z.number().optional(),
  fill: z.string().optional(),
  opacity: z.number().optional(),
  label: liveText.optional(),
  ...objBase,
});
const label3Obj = z.object({
  type: z.literal('label3'),
  x: expr,
  y: expr,
  z: expr,
  text: liveText,
  fontSize: z.number().optional(),
  tex: z.boolean().optional(),
  ...objBase,
});

const sceneObject = z.discriminatedUnion('type', [
  curveObj,
  areaObj,
  pointObj,
  lineObj,
  labelObj,
  rectObj,
  circleObj,
  polygonObj,
  vectorObj,
  arcObj,
  imageObj,
  point3Obj,
  segment3Obj,
  polygon3Obj,
  plane3Obj,
  label3Obj,
  repeatObj,
]);

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
const stepperControl = z.object({
  as: z.literal('stepper'),
  bind: z.string(),
  label: z.string().optional(),
  step: z.number().optional(),
});
// bind must point at an enum state var; buttons render its options
const pickerControl = z.object({
  as: z.literal('picker'),
  bind: z.string(),
  label: z.string().optional(),
});
// a button fires one or more actions on click
const buttonControl = z.object({
  as: z.literal('button'),
  label: z.string(),
  set: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
  step: z.record(z.string(), z.number()).optional(),
  toggle: z.string().optional(),
  animate: z.record(z.string(), z.number()).optional(),
  duration: z.number().optional(),
  ease: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional(),
});
const control = z.discriminatedUnion('as', [
  sliderControl,
  toggleControl,
  stepperControl,
  pickerControl,
  buttonControl,
]);

// timeline = ordered steps you play thru. set = instant, animate = tween (numbers only)
const timelineStep = z.object({
  label: z.string().optional(),
  set: z.record(z.string(), z.union([z.number(), z.boolean()])).optional(),
  animate: z.record(z.string(), z.number()).optional(),
  duration: z.number().optional(),
  ease: z.enum(['linear', 'easeIn', 'easeOut', 'easeInOut']).optional(),
  narrate: z.string().optional(),
  hint: z.string().optional(),
  wait: exprIRSchema.optional(),
  indicate: z.array(z.string()).optional(),
  focus: z.array(z.string()).optional(),
  surround: z.array(z.string()).optional(),
});

export const sceneSchema = z.object({
  // v2 = expression trees instead of strings. optional while v1 data is still
  // seeded; the loader starts requiring it once everything is reseeded.
  version: z.literal(2).optional(),
  state: z.record(z.string(), stateVar),
  space,
  objects: z.array(sceneObject),
  controls: z.array(control).optional(),
  timeline: z.array(timelineStep).optional(),
});
