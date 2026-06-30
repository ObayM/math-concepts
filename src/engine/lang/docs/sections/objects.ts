import type { DocSection } from '../types';

export const objectsSection: DocSection = {
  id: 'objects',
  title: 'Objects',
  description:
    'Objects are the visual elements of a scene. Their properties are comma-separated. All objects accept: `color`, `style` (solid/dashed/dotted), `show:<expr>`, `width:<number>`.',
  entries: [
    {
      keyword: 'curve',
      syntax: 'curve <id> = <expr>, [props]',
      description:
        'Plots f(x). The expression is evaluated for each x in the domain. State variables can appear in the expression.',
      example: `curve f = x^2, color:"primary"\ncurve g = sin(x)*t, color:"accent", show:showSin`,
    },
    {
      keyword: 'point',
      syntax: 'point <id> = (x, y), [drag:<axis>-><bind>], [r:<number>], [label:"text"], [props]',
      description:
        'A point at scene coordinates (x, y). Both coords can be expressions. `drag` makes it draggable — axis is `x`, `y`, or `xy`; bind is the state key updated by the drag.',
      props: [
        { name: 'drag', type: 'axis -> bind', description: 'make it draggable, writes state' },
        { name: 'r', type: 'number', description: 'radius in pixels (default 6)' },
        { name: 'label', type: 'string', description: 'text label next to the point' },
      ],
      example: `point p = (t, t^2), drag:x->t, color:"accent"\npoint v = (vx, vy), drag:xy->(vx,vy), label:"vertex"`,
    },
    {
      keyword: 'line',
      syntax:
        'line <id> = (x1,y1) -> (x2,y2), [props]  OR  line <id>, through:<obj_id>, slope:<expr>, [props]',
      description:
        'A line segment uses `->` arrow syntax. For an infinite line through a point, omit `=` and use `through:` and `slope:` props instead.',
      example: `line seg = (-2,0) -> (2,4), color:"neutral"\nline tangent, through:p, slope:2*t, style:dashed, show:showTangent`,
    },
    {
      keyword: 'label',
      syntax: 'label [id] at (x, y), <text>, [size:<number>], [tex], [props]',
      description:
        'Text positioned in scene coordinates. Use `${expr}` in the text for live-updating values (rounded to 2 dp). Add `tex` flag to render as LaTeX via KaTeX. Note the comma between position and text.',
      example: `label at (t, t^2+0.5), "slope = \${2*t}"\nlabel eq at (0, 4), "x^2 + 1", tex`,
    },
    {
      keyword: 'rect',
      syntax: 'rect <id> = (x, y), w:<expr>, h:<expr>, [opacity:<number>], [props]',
      description:
        '(x, y) is the bottom-left corner in scene coords. Width and height are expressions.',
      example: 'rect bar = (0, 0), w:0.5, h:t^2, color:"primary", opacity:0.4',
    },
    {
      keyword: 'circle',
      syntax: 'circle <id> = (x, y), r:<expr>, [opacity:<number>], [props]',
      description: 'Circle centered at (x, y) with radius r in scene units.',
      example: 'circle unit = (0, 0), r:1, color:"primary"',
    },
    {
      keyword: 'polygon',
      syntax: 'polygon <id> = [(x1,y1), (x2,y2), (x3,y3), ...]',
      description: 'Closed polygon. Vertices are a list `[...]` of `(x, y)` tuples.',
      example: 'polygon tri = [(0,0), (2,0), (1, sqrt(3))]',
    },
    {
      keyword: 'vector',
      syntax: 'vector <id> = (x1,y1) -> (x2,y2), [props]',
      description: 'An arrow from (x1,y1) to (x2,y2). All coords can be expressions.',
      example: 'vector v = (0,0) -> (vx, vy), color:"accent"',
    },
    {
      keyword: 'arc',
      syntax: 'arc <id> = (x, y), r:<expr>, from:<degrees>, to:<degrees>, [props]',
      description:
        'An arc centered at (x, y), from `from` degrees to `to` degrees (counter-clockwise). Useful for angle markers.',
      example: 'arc angle = (0,0), r:0.5, from:0, to:t',
    },
  ],
};
