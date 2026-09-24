import type { DocSection } from '../types';

export const sceneSection: DocSection = {
  id: 'scene',
  title: 'Scene & State',
  description:
    'A Prism file is exactly one `scene <type> { ... }` block. Everything else — space config, state, objects, controls, timeline — lives inside it.',
  entries: [
    {
      keyword: 'scene',
      syntax:
        'scene <type> {\n  x: [min,max]\n  [y: [min,max]]\n  [grid]\n  [axes]\n  [aspect: equal]\n  ...\n}',
      description:
        "`type` is `plane` (2D cartesian) or `numberline` (1D axis). For `plane`, both `x:` and `y:` are required. For `numberline`, only `x:` is needed. The space config lines can appear anywhere in the block, in any order, alongside state/object/control declarations.\n\nBy default the x and y domains are stretched independently to fill the box, so a circle only looks round if the domains happen to match the box. Add `aspect: equal` when shape matters — unit circles, Argand diagrams, geometry, force diagrams — and one shared scale is used for both axes, letterboxed inside the same space.\n\nOn a plane the domains can use the scene's params, which is how you zoom: `x: [1 - z, 1 + z]` with a slider on `z` closes in on x = 1, and a goal like `when: z < 0.05` asks the student to zoom until the curve looks straight. The grid and tick labels follow the zoom.",
      props: [
        {
          name: 'x',
          type: '[expr, expr]',
          description: 'x-axis domain; may use params on a plane, to zoom',
          required: true,
        },
        { name: 'y', type: '[expr, expr]', description: 'y-axis domain (plane only)' },
        { name: 'grid', type: 'flag', description: 'draw a background grid (plane only)' },
        {
          name: 'axes',
          type: 'flag',
          description: 'draw axes. they are on by default — write `axes: false` to hide them',
        },
        {
          name: 'aspect',
          type: 'equal',
          description: 'one scale for both axes, so circles stay round (plane only)',
        },
      ],
      example:
        'scene plane {\n  x: [-2, 2]\n  y: [-2, 2]\n  aspect: equal\n  grid\n  axes\n  circle unit = (0, 0) { r: 1, color: primary }\n}',
    },
    {
      keyword: 'param',
      syntax: 'param <name> = <number> { [range: [min,max]], [step: <number>], [keep] }',
      description:
        'Declares a numeric state variable. Controls (sliders, steppers) and draggable objects write to it; object expressions read from it. The `{ ... }` block is optional, so omit it if there is nothing to configure. `keep` makes the value part of the lesson\'s memory: a later slide with a `keep` param of the same name starts where the student left it, and prose can show it with `${recall("name")}`.',
      props: [
        { name: 'range', type: '[number, number]', description: 'min/max bounds for controls' },
        { name: 'step', type: 'number', description: 'discrete step size' },
        {
          name: 'keep',
          type: 'flag',
          description: 'carry the value to later slides that keep a param of the same name',
        },
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
    {
      keyword: 'choice',
      syntax: 'choice <name> = "<option>" { options: ["a", "b", ...] }',
      description:
        'Declares a string-valued state variable restricted to a fixed set of options. A `picker` control writes to it; object expressions read it and compare with `==`.',
      props: [
        {
          name: 'options',
          type: 'string[]',
          description: 'the allowed values, required',
          required: true,
        },
      ],
      example: 'choice shape = "circle" { options: ["circle", "square", "triangle"] }',
    },
  ],
};
