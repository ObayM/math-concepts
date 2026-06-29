@text title="Meet the Quadratic" cat="Quadratics"
A quadratic is any equation with an x² in it, and its graph is always a U-shaped curve called a **parabola** — the path of a thrown ball, the curve of a satellite dish, an arc of water. Let us take it apart piece by piece.

@scene title="The Squaring Function" cat="Quadratics"
> The simplest quadratic is y = x². Every output is its input squared, so it is never negative — and it is symmetric: x and -x land at the same height.
scene, plane, x: [-4, 4], y: [-1, 9], grid, axes
curve f = x^2, color: primary, width: 3
point p1 = (2, 4), color: accent, r: 6, label: "(2, 4)"
point p2 = (-2, 4), color: accent, r: 6, label: "(-2, 4)"
point o = (0, 0), color: danger, r: 6, label: "vertex"

@scene title="Standard Form: a, b, c" cat="Standard Form"
> Every quadratic can be written y = a·x² + b·x + c. Drag the three sliders and watch each reshape the curve. The purple dot is the vertex; the dashed line is the axis of symmetry; the green dot is the y-intercept.
scene, plane, x: [-6, 6], y: [-8, 8], grid, axes
param a = 1, range: [-3, 3], step: 0.1
param b = 0, range: [-6, 6], step: 0.5
param c = -2, range: [-6, 6], step: 0.5
line axis = (-b/(2*a), -8) -> (-b/(2*a), 8), color: neutral, style: dashed
curve f = a*x^2 + b*x + c, color: primary, width: 3
point v = (-b/(2*a), c - b^2/(4*a)), color: accent, r: 7, label: "vertex"
point yint = (0, c), color: success, r: 5, label: "y-int"
slider a, label: "a - opens up/down & width"
slider b, label: "b - shifts the vertex sideways"
slider c, label: "c - the y-intercept"

@scene title="The Role of a" cat="Standard Form"
> The leading coefficient a controls the whole shape. Press play: a big a makes a narrow parabola, a small a makes it wide, and a negative a flips it upside-down.
scene, plane, x: [-5, 5], y: [-8, 8], grid, axes
param a = 1, range: [-3, 3], step: 0.1
curve f = a*x^2, color: primary, width: 3
label lbl at (-4.5, 7), "a = ${a}", color: primary, size: 18
slider a, label: "a"
step "Start with a = 1, the basic parabola.", set: {a: 1}
step "a = 3 → tall and narrow.", animate: {a: 3}, ease: easeInOut, dur: 1000
step "a = 0.3 → short and wide.", animate: {a: 0.3}, ease: easeInOut, dur: 1200
step "a < 0 → it flips upside-down.", animate: {a: -1}, ease: easeInOut, dur: 1200

@quiz title="Quick Check" cat="Standard Form"
If a is negative, the parabola...
- opens upward
* opens downward
- becomes a straight line
- disappears
! A negative a flips the U upside-down, so it opens downward and has a maximum instead of a minimum.

@scene title="Vertex Form" cat="Vertex Form"
> Vertex form y = a(x - h)² + k puts the vertex right in the equation: it sits at (h, k). Grab the vertex and drag it anywhere — the whole parabola follows.
scene, plane, x: [-7, 7], y: [-8, 8], grid, axes
param a = 1, range: [-3, 3], step: 0.1
param h = 1, range: [-5, 5], step: 0.1
param k = -2, range: [-6, 6], step: 0.1
curve f = a*(x-h)^2 + k, color: primary, width: 3
point v = (h, k), color: accent, r: 8, drag: xy -> (h, k), label: "(${h}, ${k})"
slider a, label: "a — shape"

@scene title="Roots Are X-Intercepts" cat="Roots"
> The roots are where the parabola crosses the x-axis. In factored form y = a(x - r₁)(x - r₂), the roots are r₁ and r₂. Drag the two red points along the axis and watch the curve snap through them.
scene, plane, x: [-7, 7], y: [-8, 8], grid, axes
param a = 0.5, range: [-2, 2], step: 0.1
param r1 = -3, range: [-6, 6], step: 0.1
param r2 = 2, range: [-6, 6], step: 0.1
curve f = a*(x-r1)*(x-r2), color: primary, width: 3
point p1 = (r1, 0), color: danger, r: 7, drag: x -> r1, label: "r₁"
point p2 = (r2, 0), color: danger, r: 7, drag: x -> r2, label: "r₂"
slider a, label: "a — stretch"

@scene title="The Discriminant" cat="Discriminant"
> How many roots does a quadratic have? The discriminant D = b² - 4ac answers it: D > 0 → two roots, D = 0 → one, D < 0 → none. Move the sliders and watch D and the crossings change together.
scene, plane, x: [-6, 6], y: [-8, 8], grid, axes
param a = 1, range: [-3, 3], step: 0.1
param b = 1, range: [-6, 6], step: 0.5
param c = -3, range: [-6, 6], step: 0.5
curve f = a*x^2 + b*x + c, color: primary, width: 3
label d at (-5.5, 7), "D = b² - 4ac = ${b^2 - 4*a*c}", color: accent, size: 16
slider a, label: "a"
slider b, label: "b"
slider c, label: "c"

@quiz title="Discriminant Check" cat="Discriminant"
If the discriminant D = b² - 4ac is negative, the parabola...
- crosses the x-axis twice
- touches the x-axis once
* never touches the x-axis
- is a straight line
! D < 0 means there are no real roots — the parabola floats entirely above or below the x-axis.

@scene title="Factoring with Area" cat="Factoring"
> Factoring runs the parabola backwards: from x² + 5x + 6 to (x + 2)(x + 3). Picture it as area — a big x² square, two strips, and a small block. The side-lengths you add up are the factors.
scene, plane, x: [-0.5, 7], y: [-1, 6]
rect sq = (0, 0), w: 4, h: 4, color: primary, opacity: 0.18
label sql at (1.7, 2), "x²", color: primary, size: 22
rect st = (4.2, 0), w: 1.6, h: 4, color: accent, opacity: 0.22
label stl at (4.5, 2), "3x", color: accent, size: 16
rect st2 = (0, 4.2), w: 4, h: 1.6, color: success, opacity: 0.22
label st2l at (1.7, 4.9), "2x", color: success, size: 16
rect sm = (4.2, 4.2), w: 1.6, h: 1.6, color: warning, opacity: 0.3
label sml at (4.7, 4.9), "6", color: warning, size: 15

@build title="Factor It" cat="Factoring" reusable
Factor x² + 5x + 6. Find two numbers that multiply to 6 and add to 5, then build the factored form.
bank: ( ) x + 2 3
answer: ( x + 2 ) ( x + 3 )
answer: ( x + 3 ) ( x + 2 )
! 2 × 3 = 6 and 2 + 3 = 5, so x² + 5x + 6 = (x + 2)(x + 3).

@build title="Expand the Square" cat="Factoring" reusable
Expand (x + 3)². The middle term is twice the product (2·3·x). Build x² + ? + ?.
bank: x² 6x 3x 9 6 +
answer: x² + 6x + 9
! (x + 3)² = x² + 2·3·x + 9 = x² + 6x + 9.

@scene title="Vertex on the Move" cat="Putting It Together"
> Changing b alone drags the vertex along a hidden path while the y-intercept stays pinned at c. Press play and watch.
scene, plane, x: [-7, 7], y: [-8, 8], grid, axes
param a = 1, range: [-3, 3], step: 0.1
param b = -4, range: [-6, 6], step: 0.5
param c = 1, range: [-6, 6], step: 0.5
curve f = a*x^2 + b*x + c, color: primary, width: 3
point v = (-b/(2*a), c - b^2/(4*a)), color: accent, r: 7, label: "vertex"
point yi = (0, c), color: success, r: 5
slider b, label: "b"
step "b = -4, vertex sits on the right.", set: {b: -4}
step "b = 0 → vertex jumps onto the y-axis.", animate: {b: 0}, ease: easeInOut, dur: 1200
step "b = 4 → vertex swings left. The y-intercept never moved.", animate: {b: 4}, ease: easeInOut, dur: 1200

@quiz title="Final Check" cat="Assessment"
A parabola has vertex (3, -4) and opens upward. Which equation shows this most directly?
- y = (x + 3)² - 4
* y = (x - 3)² - 4
- y = (x - 3)² + 4
- y = -(x - 3)² - 4
! Vertex form is y = a(x - h)² + k with vertex (h, k) = (3, -4), and a > 0 for upward — giving y = (x - 3)² - 4.

@text title="You Did It!" cat="Quadratics"
You met quadratics from every angle: **standard form** (a, b, c), **vertex form** (h, k), **factored form** (the roots), the **discriminant**, and **factoring**. One curve, five lenses — that is what it means to *see* math instead of memorizing it.
