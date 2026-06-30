import type { DocSection } from '../types';

export const sceneSection: DocSection = {
  id: 'scene',
  title: 'Scene & State',
  description:
    'Every Prism file starts with a scene declaration that sets the coordinate space, then zero or more state variables.',
  entries: [
    {
      keyword: 'scene',
      syntax: 'scene, <type>, x:[min,max], y:[min,max], [grid], [axes]',
      description:
        'Declares the coordinate space. Must come first. `type` is one of: `plane`, `numberline`, `geometry`, `free`. All props are comma-separated.',
      props: [
        { name: 'x', type: '[number, number]', description: 'x-axis domain', required: true },
        { name: 'y', type: '[number, number]', description: 'y-axis domain', required: true },
        { name: 'grid', type: 'flag', description: 'draw a background grid' },
        { name: 'axes', type: 'flag', description: 'draw x/y axes' },
      ],
      example: 'scene, plane, x:[-5,5], y:[-5,5], grid, axes',
    },
    {
      keyword: 'param',
      syntax: 'param <name> = <number>, [range:[min,max]], [step:<number>]',
      description:
        'Declares a numeric state variable. Controls (sliders, steppers) and draggable objects write to it; object expressions read from it.',
      props: [
        { name: 'range', type: '[number, number]', description: 'min/max bounds for controls' },
        { name: 'step', type: 'number', description: 'discrete step size' },
      ],
      example: 'param t = 0, range:[-3,3]',
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
