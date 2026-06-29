'use client';
import { useState } from 'react';
import { Scene } from '@/engine';
import Button from '@/components/ui/Button';
import BuildBlock from '@/components/lesson/blocks/BuildBlock';
import { checkable } from '@/components/lesson/checkable';

// 1 — graphs: the parabola with a/b/c sliders + tracked vertex/axis
const parabola = {
  state: {
    a: { type: 'number', init: 1, min: -3, max: 3, step: 0.1 },
    b: { type: 'number', init: 0, min: -6, max: 6, step: 0.5 },
    c: { type: 'number', init: -2, min: -6, max: 6, step: 0.5 },
  },
  space: { type: 'plane', xDomain: [-5, 5], yDomain: [-8, 8], grid: true, axes: true },
  objects: [
    {
      id: 'axis',
      type: 'line',
      x1: '-b/(2*a)',
      y1: '-8',
      x2: '-b/(2*a)',
      y2: '8',
      color: 'neutral',
      style: 'dashed',
    },
    { id: 'f', type: 'curve', expr: 'a*x^2 + b*x + c', color: 'primary', strokeWidth: 3 },
    {
      id: 'v',
      type: 'point',
      x: '-b/(2*a)',
      y: 'c - b^2/(4*a)',
      color: 'accent',
      r: 7,
      label: 'vertex',
    },
  ],
  controls: [
    { as: 'slider', bind: 'a', label: 'a' },
    { as: 'slider', bind: 'b', label: 'b' },
    { as: 'slider', bind: 'c', label: 'c' },
  ],
};

// 2 — shapes gallery: circle, polygon, vector, arc (no graph in sight)
const shapes = {
  state: {},
  space: { type: 'plane', xDomain: [-6, 6], yDomain: [-3.5, 3.5] },
  objects: [
    { id: 'c', type: 'circle', x: '-4.2', y: '0.4', r: '1.3', color: 'primary' },
    { id: 'cl', type: 'label', x: '-5', y: '-1.8', text: 'circle', color: 'neutral' },
    {
      id: 'tri',
      type: 'polygon',
      points: [
        ['-1.6', '-1'],
        ['0.8', '-1'],
        ['-0.4', '1.4'],
      ],
      color: 'accent',
      opacity: 0.2,
    },
    { id: 'tl', type: 'label', x: '-1.4', y: '-1.8', text: 'polygon', color: 'neutral' },
    { id: 'vec', type: 'vector', x1: '2.4', y1: '-1', x2: '4.8', y2: '1.3', color: 'success' },
    { id: 'arc', type: 'arc', x: '2.4', y: '-1', r: '1', start: '0', end: '44', color: 'danger' },
    { id: 'vl', type: 'label', x: '2.6', y: '-1.8', text: 'vector + arc', color: 'neutral' },
  ],
};

// 3 — buttons & steppers: a circle whose radius is state, driven by buttons
const buttons = {
  state: {
    r: { type: 'number', init: 1.5, min: 0.3, max: 4, step: 0.3 },
    showArea: { type: 'boolean', init: true },
  },
  space: { type: 'plane', xDomain: [-5, 5], yDomain: [-4, 4], grid: true, axes: true },
  objects: [
    { id: 'c', type: 'circle', x: '0', y: '0', r: 'r', color: 'primary', opacity: 0.15 },
    { id: 'rad', type: 'vector', x1: '0', y1: '0', x2: 'r', y2: '0', color: 'accent' },
    { id: 'o', type: 'point', x: '0', y: '0', color: 'danger', r: 5 },
    {
      id: 'lbl',
      type: 'label',
      x: '-4.6',
      y: '3.4',
      text: 'r = ${r}',
      color: 'primary',
      fontSize: 16,
    },
    {
      id: 'area',
      type: 'label',
      x: '-4.6',
      y: '2.6',
      text: 'area = ${3.14159*r*r}',
      color: 'accent',
      fontSize: 16,
      visibleIf: 'showArea',
    },
  ],
  controls: [
    { as: 'button', label: 'grow', step: { r: 0.5 } },
    { as: 'button', label: 'shrink', step: { r: -0.5 } },
    { as: 'button', label: 'pop!', animate: { r: 4 }, duration: 500, ease: 'easeOut' },
    { as: 'button', label: 'reset', set: { r: 1.5 } },
    { as: 'stepper', bind: 'r', label: 'radius' },
    { as: 'toggle', bind: 'showArea', label: 'show area' },
  ],
};

// 4 — drag a shape: a triangle whose apex you drag in 2D
const dragTri = {
  state: {
    ax: { type: 'number', init: 0.6, min: -3, max: 3, step: 0.1 },
    ay: { type: 'number', init: 2, min: -1, max: 3.5, step: 0.1 },
  },
  space: { type: 'plane', xDomain: [-5, 5], yDomain: [-3, 4], grid: true, axes: true },
  objects: [
    {
      id: 'tri',
      type: 'polygon',
      points: [
        ['-2', '-1'],
        ['2', '-1'],
        ['ax', 'ay'],
      ],
      color: 'accent',
      opacity: 0.2,
    },
    { id: 'a', type: 'point', x: '-2', y: '-1', color: 'neutral', r: 4 },
    { id: 'b', type: 'point', x: '2', y: '-1', color: 'neutral', r: 4 },
    {
      id: 'apex',
      type: 'point',
      x: 'ax',
      y: 'ay',
      color: 'accent',
      r: 7,
      draggable: { axis: 'xy', bind: 'ax', bindY: 'ay' },
      label: '(${ax}, ${ay})',
    },
  ],
};

// 5 — build block (tiles)
const areaBuild = {
  id: 'q-area',
  type: 'build',
  title: 'Area model',
  content: 'A rectangle is x tall and (x + 3) wide. Build the expression for its total area.',
  slots: 3,
  bank: [
    { id: 'x2', label: 'x²', kind: 'operand' },
    { id: '3x', label: '3x', kind: 'operand' },
    { id: '3', label: '3', kind: 'operand' },
    { id: 'x', label: 'x', kind: 'operand' },
    { id: 'plus', label: '+', kind: 'operator' },
    { id: 'dot', label: '·', kind: 'operator' },
  ],
  answer: [['x2', 'plus', '3x']],
  explanation: 'The x·x square is x², the 3·x strip is 3x, so the area is x² + 3x.',
};

function BuildDemo({ slide }) {
  const [value, setValue] = useState([]);
  const [checked, setChecked] = useState(false);
  const c = checkable.build;
  const correct = checked ? c.check(slide, value) : null;
  return (
    <div>
      <BuildBlock
        slide={slide}
        value={value}
        checked={checked}
        correct={correct}
        onChange={(v) => {
          setValue(v);
          setChecked(false);
        }}
      />
      <div className="flex items-center justify-center gap-4 mt-5">
        <Button
          variant="success"
          disabled={!c.isComplete(slide, value)}
          onClick={() => setChecked(true)}
        >
          Check
        </Button>
        {checked && (
          <span className={`font-bold ${correct ? 'text-success-600' : 'text-danger-600'}`}>
            {correct ? '✓ nice!' : '✗ not quite'}
          </span>
        )}
      </div>
    </div>
  );
}

function Card({ tag, title, blurb, children }) {
  return (
    <div className="w-full max-w-3xl bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">{tag}</p>
      <h2 className="text-2xl font-extrabold text-neutral-900 mt-1 mb-2">{title}</h2>
      {blurb && <p className="text-neutral-500 mb-5">{blurb}</p>}
      {children}
    </div>
  );
}

export default function EngineDemoPage() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex flex-col items-center gap-8 p-6">
      <div className="w-full max-w-3xl pt-2">
        <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">Engine gallery</h1>
        <p className="text-neutral-500 mt-1">
          One scene model — graphs, shapes, animation, drag, buttons, and tiles. Everything below is
          plain Scene IR.
        </p>
      </div>

      <Card
        tag="Graphs"
        title="y = a·x² + b·x + c"
        blurb="Drag the sliders; the vertex and axis track live."
      >
        <Scene ir={parabola} />
      </Card>

      <Card
        tag="Shapes"
        title="Not just curves"
        blurb="Circle, polygon, vector, and arc — all first-class primitives."
      >
        <Scene ir={shapes} />
      </Card>

      <Card
        tag="Interactivity"
        title="Buttons & steppers"
        blurb="Buttons fire actions: step, animate, set. Watch the area update."
      >
        <Scene ir={buttons} />
      </Card>

      <Card
        tag="Direct manipulation"
        title="Drag the apex"
        blurb="Grab the purple point and reshape the triangle in 2D."
      >
        <Scene ir={dragTri} />
      </Card>

      <Card tag="Tiles" title="Build the answer" blurb="Tap tiles into the slots, then check.">
        <BuildDemo slide={areaBuild} />
      </Card>
    </div>
  );
}
