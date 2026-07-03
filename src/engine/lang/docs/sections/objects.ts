import type { DocSection } from '../types';

export const objectsSection: DocSection = {
  id: 'objects',
  title: 'Objects',
  description:
    'Objects are the visual elements of a scene. Properties go in a trailing `{ key: value }` block — omit it entirely if the object needs no configuration. All objects accept: `color`, `style` (solid/dashed/dotted), `show:<expr>`, `width:<number>`. **Note:** `curve`, `line`, `rect`, `circle`, `polygon`, `vector`, `arc` require `plane` scenes; only `point` and `label` work on `numberline` scenes.',
  entries: [
    {
      keyword: 'curve',
      syntax:
        'curve <id> = <expr> { [props] }  OR  curve <id> = (x(t), y(t)) { t: [start, end], [steps: <n>] }',
      description:
        'Plots f(x) across the domain. Give it a `(x, y)` pair instead to trace a parametric curve over the parameter `t` — supply `t: [start, end]`. State variables can appear in either form.',
      props: [
        { name: 't', type: '[start, end]', description: 'parameter range (parametric form only)' },
        { name: 'steps', type: 'number', description: 'sample count for parametric curves' },
        {
          name: 'where',
          type: 'expr',
          description: 'boolean in x — draw the curve only where it holds (piecewise)',
        },
      ],
      example: `curve f = x^2 { color: primary }\ncurve g = sin(x)*t { color: accent, show: showSin }\ncurve circle = (cos(t), sin(t)) { t: [0, 2*PI], color: accent }\ncurve left = x + 2 { where: x < k }  // a piecewise branch`,
    },
    {
      keyword: 'area',
      syntax:
        'area <id> = <upper expr> { [from: <n>], [to: <n>], [lower: <expr>], [opacity: <n>] }',
      description:
        'Shades the region under a curve. Fills between y = <upper expr> and y = 0 (or `lower:` for a second curve), clipped to x in `[from, to]` (defaults to the scene domain). `from`/`to` can bind to state, so a slider can sweep the shaded width.',
      props: [
        { name: 'from', type: 'expr', description: 'left x bound (default xMin)' },
        { name: 'to', type: 'expr', description: 'right x bound (default xMax)' },
        { name: 'lower', type: 'expr', description: 'lower boundary curve (default y = 0)' },
        { name: 'opacity', type: 'number', description: 'fill opacity (default 0.15)' },
      ],
      example: `area a = x^2 { from: 0, to: 4, color: accent, opacity: 0.1 }\narea band = f(x) { lower: g(x), color: primary }`,
    },
    {
      keyword: 'point',
      syntax:
        'point <id> = (x, y) { [drag: <axis> -> <bind>], [snap: <n>|(nx,ny)|grid], [r: <number>], [label: "text"], [props] }',
      description:
        "A point at scene coordinates (x, y). Both coords can be expressions. `drag` makes it draggable — axis is `x`, `y`, or `xy`; bind is the state key updated by the drag. `snap` rounds the dragged value to the nearest step (`grid` = nearest 1). `drag: along(<objId>) -> <bind>` constrains the drag to a `circle` or two-point `line` object — bind receives an angle (radians) for a circle, or 0..1 for a line segment; the point's own position should already be an expression of that param.",
      props: [
        { name: 'drag', type: 'axis -> bind', description: 'make it draggable, writes state' },
        {
          name: 'snap',
          type: 'number | (number, number) | grid',
          description: 'round the dragged value(s) to a step',
        },
        { name: 'r', type: 'number', description: 'radius in pixels (default 6)' },
        { name: 'label', type: 'string', description: 'text label next to the point' },
      ],
      example: `point p = (t, t^2) { drag: x -> t, color: accent }\npoint v = (vx, vy) { drag: xy -> (vx, vy), label: "vertex" }\npoint g = (t, t^2) { drag: x -> t, snap: 0.5 }\ncircle c = (0, 0) { r: 3 }\npoint onC = (3*cos(theta), 3*sin(theta)) { drag: along(c) -> theta }`,
    },
    {
      keyword: 'line',
      syntax:
        'line <id> = (x1,y1) -> (x2,y2) { [props] }  OR  line <id> { through: <obj_id>, slope: <expr>, [props] }',
      description:
        'A line segment uses `->` arrow syntax. For an infinite line through a point, omit `=` and put `through:` and `slope:` in the props block instead.',
      example: `line seg = (-2,0) -> (2,4) { color: neutral }\nline tangent { through: p, slope: 2*t, style: dashed, show: showTangent }`,
    },
    {
      keyword: 'label',
      syntax: 'label [id] at (x, y) = <text> { [size: <number>], [tex], [props] }',
      description:
        'Text positioned in scene coordinates. Use `${expr}` in the text for live-updating values (rounded to 2 dp). Add `tex` flag to render as LaTeX via KaTeX.',
      example: `label at (t, t^2+0.5) = "slope = \${2*t}"\nlabel eq at (0, 4) = "x^2 + 1" { tex }`,
    },
    {
      keyword: 'rect',
      syntax: 'rect <id> = (x, y) { w: <expr>, h: <expr>, [opacity: <number>], [props] }',
      description:
        '(x, y) is the bottom-left corner in scene coords. Width and height are expressions.',
      example: 'rect bar = (0, 0) { w: 0.5, h: t^2, color: primary, opacity: 0.4 }',
    },
    {
      keyword: 'circle',
      syntax: 'circle <id> = (x, y) { r: <expr>, [opacity: <number>], [props] }',
      description: 'Circle centered at (x, y) with radius r in scene units.',
      example: 'circle unit = (0, 0) { r: 1, color: primary }',
    },
    {
      keyword: 'polygon',
      syntax: 'polygon <id> = [(x1,y1), (x2,y2), (x3,y3), ...] { [props] }',
      description: 'Closed polygon. Vertices are a list `[...]` of `(x, y)` tuples.',
      example: 'polygon tri = [(0,0), (2,0), (1, sqrt(3))]',
    },
    {
      keyword: 'vector',
      syntax: 'vector <id> = (x1,y1) -> (x2,y2) { [props] }',
      description: 'An arrow from (x1,y1) to (x2,y2). All coords can be expressions.',
      example: 'vector v = (0,0) -> (vx, vy) { color: accent }',
    },
    {
      keyword: 'arc',
      syntax: 'arc <id> = (x, y) { r: <expr>, from: <degrees>, to: <degrees>, [props] }',
      description:
        'An arc centered at (x, y), from `from` degrees to `to` degrees (counter-clockwise). Useful for angle markers.',
      example: 'arc angle = (0,0) { r: 0.5, from: 0, to: t }',
    },
  ],
};
