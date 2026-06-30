import { generateText, Output } from 'ai';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume } from '@/lib/rate-limit';
import { SCENE_GEN_MODEL } from '@/lib/ai';
import { sceneSchema } from '@/engine/ir/schema';

const SCENE_INSTRUCTIONS = `You generate interactive math scenes as structured JSON.

A scene has five parts:

1. state - named parameters the scene reacts to. Each value is one of:
   { "type": "number", "init": 0.5, "min": -3, "max": 3 }
   { "type": "boolean", "init": false }
   { "type": "enum", "init": "sin", "options": ["sin", "cos"] }

2. space - the coordinate system:
   { "type": "plane", "xDomain": [-5, 5], "yDomain": [-5, 5], "grid": true, "axes": true }

3. objects - visual elements whose properties are expressions over state:
   curve:   { "id": "f", "type": "curve", "expr": "x^2", "color": "primary" }
   point:   { "id": "p", "type": "point", "x": "t", "y": "t^2", "draggable": { "axis": "x", "bind": "t" } }
   line:    { "id": "tan", "type": "line", "through": "p", "slope": "2*t", "visibleIf": "show", "style": "dashed" }
   label:   { "id": "lbl", "type": "label", "x": "t", "y": "t^2+0.5", "text": "slope = \${2*t}" }
   rect:    { "id": "r", "type": "rect", "x": "0", "y": "0", "w": "a", "h": "b", "color": "accent", "opacity": 0.3 }
   circle:  { "id": "c", "type": "circle", "x": "0", "y": "0", "r": "1", "color": "primary" }
   vector:  { "id": "v", "type": "vector", "x1": "0", "y1": "0", "x2": "vx", "y2": "vy" }

4. controls - widgets the learner interacts with:
   { "as": "slider", "bind": "t", "label": "Move the point", "min": -3, "max": 3 }
   { "as": "toggle", "bind": "show", "label": "Show tangent" }
   { "as": "stepper", "bind": "n", "label": "Rectangles", "step": 1 }
   { "as": "button", "label": "Reset", "set": { "t": 0 } }

5. timeline (optional) - animation steps the learner plays through:
   { "narrate": "Watch the slope change as t increases", "animate": { "t": 3 }, "duration": 2000, "ease": "easeInOut" }
   { "narrate": "The tangent line touches the curve at exactly one point", "set": { "show": true } }

Rules:
- Expression strings may use: +, -, *, /, ^, sin, cos, tan, abs, sqrt, pi, e, and any state key.
- Use \${expr} inside label text to interpolate live values.
- The "through" field on a line takes an object id (string), not coordinates.
- draggable.bind is the state key updated by x-drag; draggable.bindY is for y-drag (axis: "xy").
- Colors: "primary", "secondary", "accent", "neutral", or any valid CSS color.
- Make the interaction create an insight - dragging something, watching something react, building intuition.`;

// System instructions are nice but a better approach is us proving the documinuation for our language

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!consume(user.id, 'generate'))
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { concept, difficulty = 'intermediate', context = '' } = await req.json();

  const { output: scene } = await generateText({
    model: SCENE_GEN_MODEL,
    output: Output.object({ schema: sceneSchema }),
    instructions: SCENE_INSTRUCTIONS,
    prompt: `Generate an interactive scene that helps a learner understand: "${concept}".
Difficulty: ${difficulty}.${context ? `\nLesson context: ${context}` : ''}

Make it genuinely interactive - the learner should be able to manipulate something and see math respond.`,
  });

  return NextResponse.json({ scene });
}
