'use client';
import { useState } from 'react';
import { Scene } from '@/engine';
import Button from '@/components/ui/Button';
import BuildBlock from '@/components/lesson/blocks/BuildBlock';
import { checkable } from '@/components/lesson/checkable';

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
    { as: 'slider', bind: 'a', label: 'a — opens up/down, width' },
    { as: 'slider', bind: 'b', label: 'b — slides the vertex' },
    { as: 'slider', bind: 'c', label: 'c — y-intercept' },
  ],
};

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
  visual: {
    space: { type: 'plane', xDomain: [-0.5, 5], yDomain: [-1, 4], axes: false },
    state: {},
    objects: [
      { id: 'sq', type: 'rect', x: '0', y: '0', w: '3', h: '3', color: 'primary', opacity: 0.18 },
      { id: 'sq-l', type: 'label', x: '1.2', y: '1.4', text: 'x²', color: 'primary', fontSize: 18 },
      {
        id: 'st',
        type: 'rect',
        x: '3.2',
        y: '0',
        w: '1.2',
        h: '3',
        color: 'accent',
        opacity: 0.22,
      },
      { id: 'st-l', type: 'label', x: '3.4', y: '1.4', text: '3x', color: 'accent', fontSize: 16 },
    ],
  },
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

export default function EngineDemoPage() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex flex-col items-center gap-8 p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Quadratics · the parabola
        </p>
        <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-1 mb-2">
          y = a·x² + b·x + c
        </h1>
        <p className="text-neutral-500 mb-5">
          Drag a, b, c. Watch the parabola stretch, slide, and shift — the purple vertex and dashed
          axis of symmetry track it live.
        </p>
        <Scene ir={parabola} />
      </div>

      <div className="w-full max-w-3xl bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
        <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
          Quadratics · build block
        </p>
        <h2 className="text-2xl font-extrabold text-neutral-900 mt-1 mb-5">Tap the tiles</h2>
        <BuildDemo slide={areaBuild} />
      </div>
    </div>
  );
}
