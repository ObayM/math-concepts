'use client';
import { Scene } from '@/engine';

// hand-wrote this scene IR — same shape the DSL will spit out later
// derivative as slope: drag the point, tangent + slope move live
const demo = {
  state: {
    t: { type: 'number', init: 1, min: -3, max: 3, step: 0.05 },
    showTangent: { type: 'boolean', init: true },
  },
  space: { type: 'plane', xDomain: [-3.2, 3.2], yDomain: [-1.5, 10.5], grid: true, axes: true },
  objects: [
    { id: 'f', type: 'curve', expr: 'x^2', color: 'primary', strokeWidth: 3 },
    {
      id: 'tan',
      type: 'line',
      through: 'p',
      slope: '2*t',
      color: 'accent',
      style: 'dashed',
      visibleIf: 'showTangent',
    },
    {
      id: 'p',
      type: 'point',
      x: 't',
      y: 't^2',
      color: 'danger',
      r: 7,
      draggable: { axis: 'x', bind: 't' },
      label: '(${t}, ${t^2})',
    },
    {
      id: 'slope',
      type: 'label',
      x: '-3',
      y: '9.6',
      text: 'slope = 2x = ${2*t}',
      color: 'accent',
      fontSize: 16,
      visibleIf: 'showTangent',
    },
  ],
  controls: [
    { as: 'slider', bind: 't', label: 'x position (or drag the point)' },
    { as: 'toggle', bind: 'showTangent', label: 'Show tangent line' },
  ],
};

export default function EngineDemoPage() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex items-center justify-center p-6">
      <div className="w-full max-w-3xl bg-white rounded-2xl border border-neutral-200 p-6 md:p-8">
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-wider text-neutral-400">
            Engine v2 · Scene demo
          </p>
          <h1 className="text-2xl md:text-3xl font-extrabold text-neutral-900 mt-1">
            Derivative as slope
          </h1>
          <p className="text-neutral-500 mt-2">
            Drag the red point along the curve. The tangent line and its slope update live — one
            scene, named state, real interaction. This is what the old single-slider engine couldn’t
            do.
          </p>
        </div>
        <Scene ir={demo} />
      </div>
    </div>
  );
}
