'use client';
import { useState } from 'react';
import { Scene, compile } from '@/engine';
import Button from '@/components/ui/Button';
import BuildBlock from '@/components/lesson/blocks/BuildBlock';
import RichText from '@/components/lesson/RichText';
import { checkable } from '@/components/lesson/checkable';

const barSrc = `scene, plane, x: [-5.5, 5.5], y: [-3.2, 3], axes, grid

for i in range(-4, 5):
    if i >= 0:
        rect f"r{i}" = (i - 0.4, 0), w: 0.8, h: i * 0.6 + 0.1, color: success
    else:
        rect f"r{i}" = (i - 0.4, i * 0.6 - 0.1), w: 0.8, h: -i * 0.6 + 0.1, color: danger
    label at (i, -2.9), f"{i}"`;

const clockSrc = `scene, plane, x: [-2.2, 2.2], y: [-1.9, 1.9], axes

circle ring = (0, 0), r: 1, color: neutral

for i in range(0, 12):
    point f"pt{i}" = (cos(i * 3.14159 / 6), sin(i * 3.14159 / 6)), color: primary, r: 5
    if i % 3 == 0:
        label at (1.55 * cos(i * 3.14159 / 6), 1.55 * sin(i * 3.14159 / 6)), f"{i * 30}°"`;

const barScene = compile(barSrc);
const clockScene = compile(clockSrc);

const parabola = {
  state: {
    a: { type: 'number', init: 1, min: -3, max: 3, step: 0.1 },
    b: { type: 'number', init: 0, min: -6, max: 6, step: 0.5 },
    c: { type: 'number', init: -2, min: -6, max: 6, step: 0.5 },
  },
  space: { type: 'plane', xDomain: [-6, 6], yDomain: [-8, 8], grid: true, axes: true },
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
    {
      as: 'button',
      label: 'morph',
      animate: { a: -1.5, b: 3, c: 2 },
      duration: 1400,
      ease: 'easeInOut',
    },
    { as: 'button', label: 'reset', set: { a: 1, b: 0, c: -2 } },
  ],
  timeline: [
    { set: { a: 1, b: 0, c: -2 }, narrate: 'A plain upward parabola.' },
    { animate: { a: 0.3 }, duration: 900, ease: 'easeInOut', narrate: 'Small a → wide bowl.' },
    {
      animate: { a: -1, b: 2 },
      duration: 1100,
      ease: 'easeInOut',
      narrate: 'Negative a flips it; b slides the vertex.',
    },
  ],
};

const trig = {
  state: {
    theta: { type: 'number', init: 0.9, min: 0, max: 6.2832, step: 0.01 },
    showProj: { type: 'boolean', init: true },
  },
  space: { type: 'plane', xDomain: [-1.9, 1.9], yDomain: [-1.25, 1.25], grid: true, axes: true },
  objects: [
    { id: 'circ', type: 'circle', x: '0', y: '0', r: '1', color: 'neutral' },
    {
      id: 'ang',
      type: 'arc',
      x: '0',
      y: '0',
      r: '0.32',
      start: '0',
      end: 'theta*180/3.14159',
      color: 'warning',
      strokeWidth: 3,
    },
    {
      id: 'cos',
      type: 'line',
      x1: '0',
      y1: '0',
      x2: 'cos(theta)',
      y2: '0',
      color: 'success',
      strokeWidth: 4,
      visibleIf: 'showProj',
    },
    {
      id: 'sin',
      type: 'line',
      x1: 'cos(theta)',
      y1: '0',
      x2: 'cos(theta)',
      y2: 'sin(theta)',
      color: 'danger',
      strokeWidth: 4,
      visibleIf: 'showProj',
    },
    {
      id: 'r',
      type: 'vector',
      x1: '0',
      y1: '0',
      x2: 'cos(theta)',
      y2: 'sin(theta)',
      color: 'primary',
    },
    { id: 'P', type: 'point', x: 'cos(theta)', y: 'sin(theta)', color: 'primary', r: 6 },
    {
      id: 'lc',
      type: 'label',
      x: '-1.85',
      y: '1.1',
      text: 'cos θ = ${cos(theta)}',
      color: 'success',
      fontSize: 15,
    },
    {
      id: 'ls',
      type: 'label',
      x: '-1.85',
      y: '0.88',
      text: 'sin θ = ${sin(theta)}',
      color: 'danger',
      fontSize: 15,
    },
  ],
  controls: [
    { as: 'slider', bind: 'theta', label: 'angle θ (radians)' },
    { as: 'button', label: 'spin', animate: { theta: 6.2832 }, duration: 2400, ease: 'linear' },
    { as: 'button', label: 'reset', set: { theta: 0 } },
    { as: 'toggle', bind: 'showProj', label: 'show sin / cos' },
  ],
};

const pyth = {
  state: {
    a: { type: 'number', init: 3, min: 1, max: 4.5, step: 0.1 },
    b: { type: 'number', init: 4, min: 1, max: 6, step: 0.1 },
  },
  space: { type: 'plane', xDomain: [-5.5, 7], yDomain: [-6.8, 5], grid: true, axes: true },
  objects: [
    { id: 'sqb', type: 'rect', x: '0', y: '-b', w: 'b', h: 'b', color: 'success', opacity: 0.16 },
    { id: 'lb', type: 'label', x: 'b/2 - 0.3', y: '-b/2', text: 'b² = ${b*b}', color: 'success' },
    { id: 'sqa', type: 'rect', x: '-a', y: '0', w: 'a', h: 'a', color: 'accent', opacity: 0.16 },
    { id: 'la', type: 'label', x: '-a/2 - 0.3', y: 'a/2', text: 'a² = ${a*a}', color: 'accent' },
    {
      id: 'tri',
      type: 'polygon',
      points: [
        ['0', '0'],
        ['b', '0'],
        ['0', 'a'],
      ],
      color: 'primary',
      opacity: 0.18,
    },
    {
      id: 'sq',
      type: 'rect',
      x: '0',
      y: '0',
      w: '0.35',
      h: '0.35',
      color: 'neutral',
      opacity: 0.6,
    },
    {
      id: 'hyp',
      type: 'vector',
      x1: 'b',
      y1: '0',
      x2: '0',
      y2: 'a',
      color: 'danger',
      strokeWidth: 3,
    },
    {
      id: 'pb',
      type: 'point',
      x: 'b',
      y: '0',
      color: 'primary',
      r: 7,
      draggable: { axis: 'x', bind: 'b' },
      label: 'b',
    },
    {
      id: 'pa',
      type: 'point',
      x: '0',
      y: 'a',
      color: 'primary',
      r: 7,
      draggable: { axis: 'y', bind: 'a' },
      label: 'a',
    },
    {
      id: 'res',
      type: 'label',
      x: '1.4',
      y: '4.2',
      text: 'a² + b² = ${a*a + b*b} → c = ${sqrt(a*a + b*b)}',
      color: 'danger',
      fontSize: 15,
    },
  ],
  controls: [
    { as: 'stepper', bind: 'a', label: 'leg a' },
    { as: 'stepper', bind: 'b', label: 'leg b' },
  ],
};

const wave = {
  state: {
    amp: { type: 'number', init: 1.5, min: 0, max: 3, step: 0.1 },
    freq: { type: 'number', init: 1, min: 0.2, max: 3, step: 0.1 },
    phase: { type: 'number', init: 0, min: -3.14, max: 3.14, step: 0.05 },
    shift: { type: 'number', init: 0, min: -2, max: 2, step: 0.1 },
    t: { type: 'number', init: 1, min: -6, max: 6, step: 0.05 },
  },
  space: { type: 'plane', xDomain: [-6.5, 6.5], yDomain: [-4, 4], grid: true, axes: true },
  objects: [
    {
      id: 'w',
      type: 'curve',
      expr: 'amp*sin(freq*x + phase) + shift',
      color: 'primary',
      strokeWidth: 3,
    },
    {
      id: 'vl',
      type: 'line',
      x1: 't',
      y1: '0',
      x2: 't',
      y2: 'amp*sin(freq*t + phase) + shift',
      color: 'neutral',
      style: 'dashed',
    },
    {
      id: 'P',
      type: 'point',
      x: 't',
      y: 'amp*sin(freq*t + phase) + shift',
      color: 'accent',
      r: 6,
      draggable: { axis: 'x', bind: 't' },
      label: 'y = ${amp*sin(freq*t + phase) + shift}',
    },
  ],
  controls: [
    { as: 'slider', bind: 'amp', label: 'amplitude' },
    { as: 'slider', bind: 'freq', label: 'frequency' },
    { as: 'slider', bind: 'phase', label: 'phase' },
    { as: 'slider', bind: 'shift', label: 'vertical shift' },
    { as: 'button', label: 'roll phase', animate: { phase: 3.14 }, duration: 2600, ease: 'linear' },
    { as: 'button', label: 'reset', set: { phase: 0, amp: 1.5, freq: 1, shift: 0 } },
  ],
};

const vecAdd = {
  state: {
    ux: { type: 'number', init: 2.5, min: -4, max: 4, step: 0.1 },
    uy: { type: 'number', init: 1, min: -3, max: 3, step: 0.1 },
    vx: { type: 'number', init: 1, min: -4, max: 4, step: 0.1 },
    vy: { type: 'number', init: 2.5, min: -3, max: 3, step: 0.1 },
  },
  space: { type: 'plane', xDomain: [-5, 6], yDomain: [-4, 4], grid: true, axes: true },
  objects: [
    {
      id: 'par',
      type: 'polygon',
      points: [
        ['0', '0'],
        ['ux', 'uy'],
        ['ux+vx', 'uy+vy'],
        ['vx', 'vy'],
      ],
      color: 'neutral',
      opacity: 0.08,
    },
    { id: 'u', type: 'vector', x1: '0', y1: '0', x2: 'ux', y2: 'uy', color: 'primary' },
    { id: 'v', type: 'vector', x1: '0', y1: '0', x2: 'vx', y2: 'vy', color: 'success' },
    {
      id: 'sum',
      type: 'vector',
      x1: '0',
      y1: '0',
      x2: 'ux+vx',
      y2: 'uy+vy',
      color: 'accent',
      strokeWidth: 3,
    },
    {
      id: 'pu',
      type: 'point',
      x: 'ux',
      y: 'uy',
      color: 'primary',
      r: 6,
      draggable: { axis: 'xy', bind: 'ux', bindY: 'uy' },
      label: 'u',
    },
    {
      id: 'pv',
      type: 'point',
      x: 'vx',
      y: 'vy',
      color: 'success',
      r: 6,
      draggable: { axis: 'xy', bind: 'vx', bindY: 'vy' },
      label: 'v',
    },
    {
      id: 'ls',
      type: 'label',
      x: '-4.8',
      y: '3.6',
      text: 'u + v = (${ux+vx}, ${uy+vy})',
      color: 'accent',
      fontSize: 15,
    },
  ],
};

const factor = {
  id: 'q-factor',
  type: 'build',
  title: 'Factor it',
  content: 'Factor x² + 5x + 6 — two numbers that multiply to 6 and add to 5.',
  slots: 10,
  reusable: true,
  bank: [
    { id: 'lp', label: '(', kind: 'operator' },
    { id: 'rp', label: ')', kind: 'operator' },
    { id: 'x', label: 'x', kind: 'operand' },
    { id: 'plus', label: '+', kind: 'operator' },
    { id: 'two', label: '2', kind: 'operand' },
    { id: 'three', label: '3', kind: 'operand' },
  ],
  answer: [
    ['lp', 'x', 'plus', 'two', 'rp', 'lp', 'x', 'plus', 'three', 'rp'],
    ['lp', 'x', 'plus', 'three', 'rp', 'lp', 'x', 'plus', 'two', 'rp'],
  ],
  explanation: '2 × 3 = 6 and 2 + 3 = 5, so x² + 5x + 6 = (x + 2)(x + 3).',
};

const formula = {
  state: {},
  space: { type: 'plane', xDomain: [-6, 6], yDomain: [-2, 8], grid: true, axes: true },
  objects: [
    { id: 'f', type: 'curve', expr: 'x^2 - 2', color: 'primary', strokeWidth: 3 },
    {
      id: 'ql',
      type: 'label',
      x: '-5.6',
      y: '7',
      tex: true,
      text: 'x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}',
      color: 'accent',
      fontSize: 22,
    },
  ],
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
            {correct ? '✓ nailed it' : '✗ try again'}
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
        <h1 className="text-3xl md:text-4xl font-extrabold text-neutral-900">
          Engine — full capability
        </h1>
        <p className="text-neutral-500 mt-1">
          Every primitive and control, combined into real interactive explorers. Drag points, press
          play, push the sliders, build with tiles.
        </p>
      </div>

      <Card
        tag="Typeset math · KaTeX"
        title="Real equations"
        blurb="Inline and display math in prose, plus LaTeX labels rendered inside scenes."
      >
        <RichText className="block text-lg text-neutral-600 leading-relaxed">
          {
            'The **quadratic formula** solves $ax^2 + bx + c = 0$:\n$$x = \\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$\nThe part under the root, $b^2 - 4ac$, is the *discriminant*.'
          }
        </RichText>
        <div className="mt-5">
          <Scene ir={formula} />
        </div>
      </Card>

      <Card
        tag="Graphs + animation"
        title="The parabola"
        blurb="3 sliders, a tracked vertex, a morph button, and a play-through timeline."
      >
        <Scene ir={parabola} />
      </Card>

      <Card
        tag="Circle · vector · arc · trig"
        title="Unit circle explorer"
        blurb="Slide or spin θ; the vector, angle arc, and sin/cos projections track live."
      >
        <Scene ir={trig} />
      </Card>

      <Card
        tag="Polygon · rect · drag"
        title="Pythagoras, by hand"
        blurb="Drag the legs (or use the steppers). The squares and a² + b² = c² update as you go."
      >
        <Scene ir={pyth} />
      </Card>

      <Card
        tag="4 params · drag · animate"
        title="Sine wave lab"
        blurb="Amplitude, frequency, phase, shift — plus a draggable readout point and a rolling animation."
      >
        <Scene ir={wave} />
      </Card>

      <Card
        tag="Vectors · 2D drag"
        title="Vector addition"
        blurb="Drag either arrowhead; the resultant and parallelogram follow."
      >
        <Scene ir={vecAdd} />
      </Card>

      <Card
        tag="DSL · loops · if/else"
        title="Bar chart from source"
        blurb="9 bars in 7 lines of DSL — repeat unrolls at compile time, if/else colors each bar by sign."
      >
        <pre className="text-xs font-mono bg-neutral-50 border border-neutral-100 rounded-xl p-4 overflow-x-auto text-neutral-500 mb-5 leading-relaxed whitespace-pre">
          {barSrc}
        </pre>
        <Scene ir={barScene} />
      </Card>

      <Card
        tag="DSL · repeat · conditional labels"
        title="Polar grid from source"
        blurb="12 points at 30° intervals; labels only every 90° — one repeat block, one if inside."
      >
        <pre className="text-xs font-mono bg-neutral-50 border border-neutral-100 rounded-xl p-4 overflow-x-auto text-neutral-500 mb-5 leading-relaxed whitespace-pre">
          {clockSrc}
        </pre>
        <Scene ir={clockScene} />
      </Card>

      <Card tag="Tiles" title="Build the factors" blurb="Tap tiles into the slots, then check.">
        <BuildDemo slide={factor} />
      </Card>
    </div>
  );
}
