import type { DocSection } from '../types';

export const sceneSection: DocSection = {
  id: 'scene',
  title: 'Scene & State',
  description:
    'A Prism file is exactly one `scene <type> { ... }` block. Everything else — space config, state, objects, controls, timeline — lives inside it.',
  entries: [
    {
      keyword: 'scene',
      syntax: 'scene <type> {\n  x: [min,max]\n  y: [min,max]\n  [grid]\n  [axes]\n  ...\n}',
      description:
        '`type` is one of: `plane`, `numberline`, `geometry`, `free`. The space config lines (`x`, `y`, `grid`, `axes`) can appear anywhere in the block, in any order, alongside state/object/control declarations.',
      props: [
        { name: 'x', type: '[number, number]', description: 'x-axis domain', required: true },
        { name: 'y', type: '[number, number]', description: 'y-axis domain', required: true },
        { name: 'grid', type: 'flag', description: 'draw a background grid' },
        { name: 'axes', type: 'flag', description: 'draw x/y axes' },
      ],
      example: 'scene plane {\n  x: [-5, 5]\n  y: [-5, 5]\n  grid\n  axes\n}',
    },
    {
      keyword: 'param',
      syntax: 'param <name> = <number> { [range: [min,max]], [step: <number>] }',
      description:
        'Declares a numeric state variable. Controls (sliders, steppers) and draggable objects write to it; object expressions read from it. The `{ ... }` block is optional — omit it if there is nothing to configure.',
      props: [
        { name: 'range', type: '[number, number]', description: 'min/max bounds for controls' },
        { name: 'step', type: 'number', description: 'discrete step size' },
      ],
      example: 'param t = 0 { range: [-3, 3] }',
    },
    {
      keyword: 'bool',
      syntax: 'bool <name> = <true|false>',
      description:
        'Declares a boolean state variable. Toggles write to it; `show:` on objects reads from it.',
      example: 'bool showTangent = false',
    },
  ],
};
