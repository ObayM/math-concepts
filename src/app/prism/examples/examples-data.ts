export interface Example {
  id: string;
  title: string;
  description: string;
  tags: string[];
  code: string;
}

export const EXAMPLES: Example[] = [
  {
    id: 'derivative-tangent',
    title: 'Derivative as Tangent Slope',
    description:
      'Drag a point along a parabola and watch the tangent line update live. Shows the geometric meaning of the derivative.',
    tags: ['calculus', 'derivatives', 'interactive'],
    code: `scene, plane, x:[-5,5], y:[-5,5], grid, axes

param t = 0, range:[-3,3]
bool show = false

curve f = x^2, color:"primary"
point p = (t, t^2), drag:x->t, color:"accent"
line tangent, through:p, slope:2*t, style:dashed, show:show

label at (t, t^2+0.6), "slope = \${2*t}", show:show

slider t, label:"move the point"
toggle show, label:"show tangent line"

step "here's f(x) = x²"
step "the tangent at any point x has slope 2x", set:{show:true}
step "drag the point — watch the slope update", animate:{t:3}, dur:2000, ease:easeInOut`,
  },
  {
    id: 'unit-circle',
    title: 'Unit Circle & Trig',
    description:
      'Visualize how sine and cosine come from the unit circle. A rotating point traces out the trig values.',
    tags: ['trigonometry', 'unit-circle', 'interactive'],
    code: `scene, plane, x:[-2.5,2.5], y:[-2,2], grid, axes

param t = 0, range:[0,360]

circle unit = (0,0), r:1, color:"neutral", style:dashed
point p = (cos(t*PI/180), sin(t*PI/180)), color:"accent"

line xproj = (0,0) -> (cos(t*PI/180), 0), color:"primary", style:dashed
line yproj = (cos(t*PI/180),0) -> (cos(t*PI/180), sin(t*PI/180)), color:"accent", style:dashed

vector rad = (0,0) -> (cos(t*PI/180), sin(t*PI/180)), color:"primary"

label at (0.5, -0.2), "cos = \${cos(t*PI/180)}"
label at (1.4, 0.4), "sin = \${sin(t*PI/180)}"

slider t, label:"angle (degrees)", min:0, max:360`,
  },
  {
    id: 'riemann-sum',
    title: 'Riemann Sum Approximation',
    description:
      'See how rectangles approximate the area under a curve. More rectangles = better approximation.',
    tags: ['calculus', 'integration', 'for-loop'],
    code: `scene, plane, x:[-0.5,5], y:[-0.5,10], axes

curve f = x^2, color:"primary"

for i in range(0, 10):
  rect f"r{i}" = (i*0.5, 0), w:0.48, h:(i*0.5)^2, color:"accent", opacity:0.35

label at (2.5, 9), "area ≈ sum of rectangles"`,
  },
  {
    id: 'vector-addition',
    title: 'Vector Addition',
    description:
      'Drag two vectors and see their sum update live. Demonstrates the parallelogram law.',
    tags: ['vectors', 'algebra', 'drag'],
    code: `scene, plane, x:[-5,5], y:[-5,5], grid, axes

param ax = 2, range:[-4,4]
param ay = 1, range:[-4,4]
param bx = 1, range:[-4,4]
param by = 3, range:[-4,4]

vector va = (0,0) -> (ax, ay), color:"primary"
vector vb = (0,0) -> (bx, by), color:"accent"
vector vsum = (0,0) -> (ax+bx, ay+by), color:"success"

line pa = (ax,ay) -> (ax+bx,ay+by), style:dashed, color:"primary"
line pb = (bx,by) -> (ax+bx,ay+by), style:dashed, color:"accent"

point endA = (ax, ay), drag:xy->(ax,ay), r:7, color:"primary"
point endB = (bx, by), drag:xy->(bx,by), r:7, color:"accent"

label at (ax/2-0.3, ay/2), "a"
label at (bx/2+0.1, by/2), "b"
label at ((ax+bx)/2+0.2, (ay+by)/2+0.3), "a + b"`,
  },
  {
    id: 'pythagorean-theorem',
    title: 'Pythagorean Theorem',
    description:
      'A right triangle with squares on each side. Drag the vertex to see a² + b² = c² always holds.',
    tags: ['geometry', 'theorem', 'drag'],
    code: `scene, plane, x:[-1,9], y:[-7,7], axes

param cx = 3, range:[1,7]
param cy = 3, range:[1,6]

rect sq_a = (0,0-cx), w:cx, h:cx, color:"primary", opacity:0.25
rect sq_b = (cx,0), w:cy, h:cy, color:"accent", opacity:0.25

line side1 = (0,0) -> (cx,0), color:"neutral"
line side2 = (cx,0) -> (cx,cy), color:"neutral"
line side3 = (0,0) -> (cx,cy), color:"success"

point v = (cx, cy), drag:xy->(cx,cy), color:"accent", r:7

label at (cx/2, 0-cx/2), "a² = \${cx*cx}"
label at (cx+0.3, cy/2), "b² = \${cy*cy}"
label at (cx/2-1, cy/2+0.5), "c² = \${cx*cx+cy*cy}"`,
  },
  {
    id: 'sine-wave-builder',
    title: 'Sine Wave Builder',
    description:
      'Control amplitude, frequency, and phase shift. See how each parameter transforms the wave.',
    tags: ['trigonometry', 'functions', 'sliders'],
    code: `scene, plane, x:[-7,7], y:[-4,4], grid, axes

param A = 1, range:[0.1,3]
param f = 1, range:[0.1,4]
param phi = 0, range:[-3,3]

curve wave = A * sin(f*x + phi), color:"primary"
curve ref = sin(x), color:"neutral", style:dashed

label at (0.3, A+0.3), "y = \${A}·sin(\${f}x + \${phi})"

slider A, label:"amplitude A", min:0.1, max:3
slider f, label:"frequency f", min:0.1, max:4
slider phi, label:"phase shift φ", min:-3, max:3`,
  },
];
