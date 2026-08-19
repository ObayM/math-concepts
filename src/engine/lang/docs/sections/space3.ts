import type { DocSection } from '../types';

const SCENE = `scene space3 {
  x: [-4, 4]
  y: [-4, 4]
  z: [-4, 4]
  param az = 55 { range: [0, 360], step: 5 }
  camera: [az, 26]
  slider az { label: "spin" }`;

export const space3Section: DocSection = {
  id: 'space3',
  title: 'Three dimensions',
  description:
    'A `scene space3` draws in 3D. It needs a `z: [min, max]` alongside `x` and `y`, and it projects orthographically the way a textbook draws a solid — no perspective, so parallel edges stay parallel and lengths along an axis stay comparable. Axes, arrowheads and unit ticks are drawn for you. Point the `camera:` at a `param` and the learner can spin the figure, which is the only reliable way to resolve what is in front of what. The 3D objects below are only legal inside a `space3` scene, and the 2D ones (`curve`, `rect`, `circle`, ...) are not.',
  entries: [
    {
      keyword: 'space3',
      syntax: 'scene space3 { x: [..] y: [..] z: [..] [camera: [azimuth, elevation]] }',
      description:
        '`camera:` takes two angles in degrees: azimuth spins around the vertical z axis, elevation lifts the eye above the xy plane. Both are expressions, so binding either to a `param` gives you a turntable. Defaults to `[55, 26]`.',
      props: [
        { name: 'z', type: '[min, max]', description: 'the third domain — required' },
        {
          name: 'camera',
          type: '[expr, expr]',
          description: 'azimuth and elevation in degrees; bind to state to let the learner spin it',
        },
        { name: 'axes', type: 'flag', description: 'set `axes: false` to hide the drawn axes' },
      ],
      example: `${SCENE}
  point3 A = (3, 2, 2) { label: "A", guides }
}`,
    },
    {
      keyword: 'point3',
      syntax: 'point3 <id> = (x, y, z) { [props] }',
      description:
        'A point in space. `guides` drops the dashed rails down to the xy plane and along to each axis, which is what makes an isolated dot readable — without them a projected point is genuinely ambiguous.',
      props: [
        { name: 'label', type: 'string', description: 'text beside the point, `${}` interpolates' },
        { name: 'guides', type: 'flag', description: 'dashed rails to the coordinate planes' },
        { name: 'r', type: 'number', description: 'radius in pixels' },
        { name: 'open', type: 'flag', description: 'hollow marker' },
      ],
      example: `${SCENE}
  point3 P = (3, 2, 2) { label: "P(3, 2, 2)", guides, color: accent }
}`,
    },
    {
      keyword: 'segment3',
      syntax: 'segment3 <id> = (x1, y1, z1) -> (x2, y2, z2) { [arrow] [props] }',
      description:
        'A straight piece of a line between two points in space. Add `arrow` to make it a vector.',
      props: [
        { name: 'arrow', type: 'flag', description: 'draw an arrowhead at the far end' },
        { name: 'label', type: 'string', description: 'text at the midpoint' },
      ],
      example: `${SCENE}
  segment3 v = (0, 0, 0) -> (3, 2, 2) { arrow, color: accent, label: "v" }
}`,
    },
    {
      keyword: 'polygon3',
      syntax: 'polygon3 <id> = [(x, y, z), (x, y, z), ...] { [props] }',
      description:
        'A flat face through three or more points. Faces are painted back to front by their average depth, so overlapping faces stack in a believable order.',
      props: [
        { name: 'fill', type: 'color', description: 'fill color (defaults to the stroke color)' },
        { name: 'opacity', type: 'number', description: 'fill opacity, default 0.22' },
      ],
      example: `${SCENE}
  polygon3 base = [(0, 0, 0), (3, 0, 0), (3, 3, 0), (0, 3, 0)] { color: primary }
  polygon3 side = [(0, 0, 0), (3, 0, 0), (0, 0, 3)] { color: accent }
}`,
    },
    {
      keyword: 'plane3',
      syntax: 'plane3 <id> { normal: (a, b, c), through: (x, y, z), [size: <n>] }',
      description:
        'A plane, drawn as a square patch of itself centred on `through` and perpendicular to `normal`. A plane is infinite, so `size:` only controls how much of it you draw. The normal cannot be the zero vector.',
      props: [
        { name: 'normal', type: '(a, b, c)', description: 'the normal vector — required' },
        { name: 'through', type: '(x, y, z)', description: 'a point on the plane — required' },
        { name: 'size', type: 'number', description: 'half-width of the drawn patch, default 3' },
        { name: 'label', type: 'string', description: 'text at the centre' },
      ],
      example: `${SCENE}
  plane3 p { normal: (1, 1, 1), through: (0, 0, 0), size: 2.5, color: primary }
  segment3 n = (0, 0, 0) -> (1, 1, 1) { arrow, color: accent }
}`,
    },
    {
      keyword: 'label3',
      syntax: 'label3 [<id>] at (x, y, z) = "text" { [props] }',
      description: 'Free text anchored at a point in space. `${}` interpolates live values.',
      props: [
        { name: 'fontSize', type: 'number', description: 'text size in pixels' },
        { name: 'tex', type: 'flag', description: 'render as LaTeX' },
      ],
      example: `${SCENE}
  point3 A = (2, 2, 2)
  label3 at (2, 2, 2.7) = "A"
}`,
    },
  ],
};
