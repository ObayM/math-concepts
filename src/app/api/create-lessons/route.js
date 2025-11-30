import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

const lesson1Steps = [
    {
        title: "Welcome to Functions!",
        content: "Functions are the fundamental building blocks of mathematics. Think of a function as a machine: you input one number, and it outputs exactly one corresponding number. Our goal is to understand the two main rules: **Domain** (valid inputs) and **Range** (possible outputs)."
    },
    {
        title: "The 'Plus 2' Machine",
        content: "Consider the function `f(x) = x + 2`. This machine takes any input and adds 2 to it. If you input 5, the output is 7. Simple, right?",
        interactive: { type: 'machine', funcId: 'add2' }
    },
    {
        title: "Visualizing the Function",
        content: "We can visualize this behavior on a graph. The X-axis represents inputs, and the Y-axis represents outputs. For `f(x) = x + 2`, the graph is a straight line rising to the right.",
        interactive: { type: 'graph', funcId: 'add2', domain: [-10, 10], initialX: 3 }
    },
    {
        title: "The Domain: Valid Inputs",
        content: "What numbers can we put into `f(x) = x + 2`? Any real number! There are no restrictions. The **Domain** is all real numbers, written as `(-∞, ∞)`.",
        interactive: { type: 'graph', funcId: 'add2', domain: [-10, 10], initialX: 0, highlight: 'domain' }
    },
    {
        title: "The Range: Possible Outputs",
        content: "Since we can input any number, we can also get any number out. The **Range** is also all real numbers, `(-∞, ∞)`.",
        interactive: { type: 'graph', funcId: 'add2', domain: [-10, 10], initialX: 0, highlight: 'range' }
    },
    {
        title: "Rule #1: Division by Zero",
        content: "Some functions have restrictions. You cannot divide by zero. Consider `f(x) = 1/x`. As x gets closer to 0, the value explodes. At x=0, it's undefined.",
        interactive: { type: 'graph', funcId: 'inverse', domain: [-5, 5], initialX: 2, asymptote: 0 }
    },
    {
        title: "The Vertical Asymptote",
        content: "For `f(x) = 1/x`, the graph never touches the line x=0. This is a vertical asymptote. The domain is every number except 0: `(-∞, 0) U (0, ∞)`.",
    },
    {
        title: "Quiz: Identify the Restriction",
        content: "For the function `f(x) = 5 / (x - 3)`, which input value is not allowed?",
        interactive: {
            type: 'quiz',
            question: 'What is the domain of f(x) = 5 / (x - 3)?',
            options: [
                'All real numbers',
                'All real numbers except x = 3',
                'All real numbers except x = 5',
                'x > 3'
            ],
            correctAnswer: 'All real numbers except x = 3',
            hint: 'The denominator (x - 3) cannot be zero.',
            graph: { funcId: 'quiz1', domain: [-5, 10] }
        }
    },
    {
        title: "Rule #2: Negative Square Roots",
        content: "In the real number system, you cannot take the square root of a negative number. Try `f(x) = √x`. The graph only exists for x ≥ 0.",
        interactive: { type: 'graph', funcId: 'sqrt', domain: [-5, 10], initialX: 4 }
    },
    {
        title: "Domain of Square Root",
        content: "For `f(x) = √x`, the domain is `[0, ∞)`. The range is also `[0, ∞)`.",
    },
    {
        title: "Challenge: Find the Domain",
        content: "For `f(x) = √(x - 2)`, what is the smallest valid x?",
        interactive: {
            type: 'quiz',
            question: 'What is the domain of f(x) = √(x - 2)?',
            options: ['(-∞, 2)', '(-∞, 2]', '(2, ∞)', '[2, ∞)'],
            correctAnswer: '[2, ∞)',
            hint: 'Solve x - 2 ≥ 0.'
        }
    },
    {
        title: "Lesson Complete!",
        content: "You've mastered the basics of Domain and Range! Remember: avoid division by zero and negative square roots."
    }
];

const lesson2Steps = [
    {
        title: "Understanding Monotonicity",
        content: "Monotonicity describes whether a function is increasing or decreasing. Imagine walking along the graph from left to right. Are you going uphill, downhill, or staying flat?"
    },
    {
        title: "Increasing Functions",
        content: "A function is **increasing** if the y-value goes up as x increases. Look at `f(x) = 2x + 1`. It's always going uphill.",
        interactive: { type: 'graph', funcId: 'linear_inc', domain: [-5, 5], initialX: -2 }
    },
    {
        title: "Decreasing Functions",
        content: "A function is **decreasing** if the y-value goes down as x increases. `f(x) = -x + 3` is always going downhill.",
        interactive: { type: 'graph', funcId: 'linear_dec', domain: [-5, 5], initialX: -3 }
    },
    {
        title: "Mixed Behavior",
        content: "Many functions change direction. `f(x) = x²` decreases until x=0, then increases. We describe this using **intervals**.",
        interactive: { type: 'graph', funcId: 'square', domain: [-5, 5], initialX: 3, turningPoint: { x: 0, label: 'Turning Point' } }
    },
    {
        title: "Intervals of Monotonicity",
        content: "For `f(x) = x²`, the function is decreasing on `(-∞, 0)` and increasing on `(0, ∞)`. The point where it changes is the turning point.",
        interactive: { type: 'graph', funcId: 'square', domain: [-5, 5], initialX: -4, turningPoint: { x: 0, label: 'x = 0' } }
    },
    {
        title: "Quiz: Analyze the Graph",
        content: "Look at `f(x) = -(x - 2)² + 1`. Where is it increasing?",
        interactive: {
            type: 'quiz',
            question: 'On what interval is f(x) = -(x - 2)² + 1 increasing?',
            options: ['(-∞, 2)', '(2, ∞)', '(-∞, 1)', '(1, ∞)'],
            correctAnswer: '(-∞, 2)',
            hint: 'Find the peak of the parabola. It increases before the peak.',
            graph: { funcId: 'square_shifted', domain: [-2, 6] }
        }
    },
    {
        title: "Constant Functions",
        content: "A function can also be **constant**, meaning it never changes height. `f(x) = 4` is a flat horizontal line.",
        interactive: { type: 'graph', funcId: 'constant', domain: [-5, 5], initialX: -3 }
    },
    {
        title: "Lesson Complete!",
        content: "You can now identify where functions are increasing, decreasing, or constant. This is crucial for analyzing function behavior."
    }
];

const lesson3Steps = [
    {
        title: "Operations on Functions",
        content: "Just like numbers, we can add, subtract, multiply, and divide functions. We can also compose them!"
    },
    {
        title: "Adding Functions",
        content: "If `f(x) = x + 2` and `g(x) = 3x`, then `(f + g)(x) = (x + 2) + 3x = 4x + 2`. We simply add their outputs.",
        interactive: { type: 'graph', funcId: 'add_ops', domain: [-5, 5], initialX: 1 }
    },
    {
        title: "Subtracting Functions",
        content: "`f(x) = 2x + 1` and `g(x) = x`. `(f - g)(x) = (2x + 1) - x = x + 1`.",
        interactive: { type: 'graph', funcId: 'sub_ops', domain: [-5, 5], initialX: 0 }
    },
    {
        title: "Multiplying Functions",
        content: "`f(x) = x` and `g(x) = x + 1`. `(f * g)(x) = x(x + 1) = x² + x`. Multiplication can change the type of function (linear to quadratic).",
        interactive: { type: 'graph', funcId: 'mul_ops', domain: [-5, 5], initialX: -2 }
    },
    {
        title: "Dividing Functions",
        content: "Be careful with division! `(f / g)(x) = f(x) / g(x)`. The domain excludes values where g(x) = 0.",
        interactive: { type: 'graph', funcId: 'div_ops', domain: [-5, 5], initialX: 1, asymptote: 0 }
    },
    {
        title: "Quiz: Division Domain",
        content: "For `(f / g)(x) = (x² - 1) / (x - 1)`, what value is excluded from the domain?",
        interactive: {
            type: 'quiz',
            question: 'Identify the input that is not allowed.',
            options: ['x = 0', 'x = 1', 'x = -1', 'x = 2'],
            correctAnswer: 'x = 1',
            hint: 'When is the denominator zero?'
        }
    },
    {
        title: "Composition of Functions",
        content: "Composition `(f ∘ g)(x)` means applying g first, then f. `f(g(x))`. If `f(x) = x + 2` and `g(x) = 3x`, then `f(g(x)) = 3x + 2`.",
        interactive: { type: 'graph', funcId: 'comp_ops', domain: [-5, 5], initialX: -1 }
    },
    {
        title: "Order Matters",
        content: "Composition is usually not commutative. `g(f(x)) = 3(x + 2) = 3x + 6`. Different result!",
        interactive: { type: 'graph', funcId: 'comp_ops_rev', domain: [-5, 5], initialX: 0 }
    },
    {
        title: "Lesson Complete!",
        content: "You've learned how to combine functions using arithmetic operations and composition."
    }
];

// Advanced lessons (5-7) data - kept as is but structured for DB
const lesson5Data = [
    {
        id: 'intro',
        title: 'Welcome to Functions',
        content: "Functions are the machines of mathematics. They take an input (x) and produce exactly one output (y). Let's master their secret properties.",
        interactiveType: 'intro'
    },
    {
        id: 'vlt',
        title: 'The Vertical Line Test',
        content: "A relation is a function only if no vertical line intersects the graph at more than one point. Use the scanner to test this sideways parabola.",
        interactiveType: 'graph',
        category: 'Fundamentals',
        visualization: {
            xDomain: [-2, 6],
            yDomain: [-4, 4],
            paramRange: [-2, 6],
            paramLabel: "Scanner x",
            elements: [
                { id: 'top', type: 'function', expression: 'sqrt(x)', color: '#94a3b8', strokeWidth: 3 },
                { id: 'bot', type: 'function', expression: '-sqrt(x)', color: '#94a3b8', strokeWidth: 3 },
                { id: 'scan', type: 'v-line', x: 't', color: '#ef4444', style: 'solid', label: 'Scanner', strokeWidth: 3 },
                { id: 'int1', type: 'point', x: 't', y: 'sqrt(t)', color: '#ef4444', r: 5 },
                { id: 'int2', type: 'point', x: 't', y: '-sqrt(t)', color: '#ef4444', r: 5 },
            ]
        }
    },
    {
        id: 'even',
        title: 'Even Functions',
        content: "Symmetry is beauty. An Even function is symmetric about the y-axis. f(x) = f(-x). Drag to see the mirror image.",
        interactiveType: 'graph',
        category: 'Symmetry',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-2, 12],
            paramRange: [-5, 5],
            paramLabel: "Input x",
            elements: [
                { id: 'f', type: 'function', expression: '0.5 * x^2', color: '#3b82f6' },
                { id: 'p_main', type: 'point', x: 't', y: '0.5 * t^2', color: '#3b82f6', label: '(x,y)' },
                { id: 'p_ref', type: 'point', x: '-t', y: '0.5 * t^2', color: '#10b981', label: '(-x,y)' },
                { id: 'conn', type: 'line', x1: 't', y1: '0.5 * t^2', x2: '-t', y2: '0.5 * t^2', color: '#10b981', style: 'dashed' }
            ]
        }
    },
    {
        id: 'odd',
        title: 'Odd Functions',
        content: "Odd functions have rotational symmetry. f(-x) = -f(x). If you rotate 180° around the origin, it matches.",
        interactiveType: 'graph',
        category: 'Symmetry',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-10, 10],
            paramRange: [-5, 5],
            paramLabel: "Input x",
            elements: [
                { id: 'f', type: 'function', expression: '(x^3)/5 - x', color: '#8b5cf6' },
                { id: 'p_main', type: 'point', x: 't', y: '(t^3)/5 - t', color: '#8b5cf6', label: '(x,y)' },
                { id: 'p_ref', type: 'point', x: '-t', y: '-((t^3)/5 - t)', color: '#f59e0b', label: '(-x,-y)' },
                { id: 'line_origin', type: 'line', x1: 't', y1: '(t^3)/5 - t', x2: '-t', y2: '-((t^3)/5 - t)', color: '#f59e0b', style: 'dotted' }
            ]
        }
    },
    {
        id: 'one-to-one',
        title: 'One-to-One Functions',
        content: "Every y-value is unique. Use the Horizontal Line Test to verify.",
        interactiveType: 'graph',
        category: 'Mapping',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-4, 4],
            paramLabel: "Test y",
            elements: [
                { id: 'f', type: 'function', expression: '(x^3)/10 + x', color: '#ec4899' },
                { id: 'scan', type: 'h-line', y: 't', color: '#f59e0b', label: 'HLT', strokeWidth: 3 },
            ]
        }
    },
    {
        id: 'quiz-1',
        title: 'Quick Check',
        content: "If a graph is symmetric about the Y-axis, which type of function is it?",
        interactiveType: 'quiz',
        quizOptions: ['Odd', 'One-to-One', 'Even', 'Neither'],
        correctOption: 2,
        category: 'Assessment'
    }
];

const lesson6Data = [
    {
        id: 'intro',
        title: 'The Art of Graphing',
        content: "Graphing is about seeing patterns. In this advanced lesson, we will master function families, transformations, and the logic of piecewise functions. Ready to visualize math?",
        interactiveType: 'intro',
        category: 'Introduction'
    },
    {
        id: 'power-families',
        title: 'Power Families',
        content: "The exponent determines the shape. x¹ is a line, x² is a U-shaped parabola, x³ is an S-curve. Drag the slider to morph the exponent p from 1 to 3.",
        interactiveType: 'graph',
        category: 'Basic Functions',
        visualization: {
            xDomain: [-3, 3],
            yDomain: [-3, 3],
            paramRange: [1, 3],
            paramLabel: "Exponent p",
            elements: [
                { id: 'f_pow', type: 'function', expression: 'x^t', color: '#3b82f6', strokeWidth: 4 },
                { id: 'lbl', type: 'point', x: '1.5', y: '1.5^t', color: '#3b82f6', label: 'y = x^p', r: 0 },
            ]
        }
    },
    {
        id: 'abs-transform',
        title: 'Absolute Transformations',
        content: "The Absolute Value function f(x) = |x| creates a V-shape. Multiplying by a coefficient 'a' stretches it. If 'a' is negative, it reflects downwards.",
        interactiveType: 'graph',
        category: 'Transformations',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-2, 2],
            paramLabel: "Coeff a",
            elements: [
                { id: 'f_abs', type: 'function', expression: 't * abs(x)', color: '#ec4899', strokeWidth: 4 },
                { id: 'origin', type: 'point', x: '0', y: '0', color: '#ec4899', r: 5 },
                { id: 'ref_p', type: 'point', x: '2', y: 't * abs(2)', color: '#ec4899', label: 'y = a|x|', r: 6 }
            ]
        }
    },
    {
        id: 'piecewise-concept',
        title: 'Piecewise Logic',
        content: "A piecewise function applies different rules to different parts of the domain. Here, we switch from a line to a constant at x = k. Drag k to move the boundary.",
        interactiveType: 'graph',
        category: 'Piecewise',
        visualization: {
            xDomain: [-4, 6],
            yDomain: [-2, 6],
            paramRange: [-2, 4],
            paramLabel: "Split k",
            elements: [
                { id: 'left', type: 'function', expression: '(x < t) ? x + 2 : NaN', color: '#3b82f6', strokeWidth: 4 },
                { id: 'right', type: 'function', expression: '(x >= t) ? 3 : NaN', color: '#f97316', strokeWidth: 4 },
                { id: 'bound', type: 'v-line', x: 't', color: '#94a3b8', style: 'dashed', label: 'x = k' },
                { id: 'p_join', type: 'point', x: 't', y: '3', color: '#f97316', r: 6, label: 'Switch' }
            ]
        }
    },
    {
        id: 'puzzle-continuity',
        title: 'Repair the Graph',
        content: "A function is continuous if the pieces meet. Here we have f(x) = -x (left) and f(x) = (x-1)² + c (right). Adjust c to make them connect at x=1.",
        interactiveType: 'graph',
        category: 'Puzzle',
        visualization: {
            xDomain: [-2, 4],
            yDomain: [-2, 6],
            paramRange: [-2, 2],
            paramLabel: "Shift c",
            elements: [
                { id: 'f_left', type: 'function', expression: '(x < 1) ? -x + 2 : NaN', color: '#ef4444', strokeWidth: 4 },
                { id: 'f_right', type: 'function', expression: '(x >= 1) ? (x-1)^2 + t : NaN', color: '#10b981', strokeWidth: 4 },
                { id: 'target', type: 'point', x: '1', y: '1', color: '#ef4444', r: 4, label: 'Target' },
                { id: 'mover', type: 'point', x: '1', y: 't', color: '#10b981', r: 6 }
            ]
        }
    },
    {
        id: 'step-function',
        title: 'The Step Function',
        content: "The Floor function ⌊x⌋ rounds down to the nearest integer, creating a staircase. Scaling the input changes the step width. Graph: y = floor(x/s).",
        interactiveType: 'graph',
        category: 'Advanced Types',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-3, 3],
            paramRange: [1, 2.5],
            paramLabel: "Scale s",
            elements: [
                { id: 'step_f', type: 'function', expression: 'floor(x/t)', color: '#8b5cf6', strokeWidth: 3 },
                { id: 'tracer', type: 'point', x: '2', y: 'floor(2/t)', color: '#8b5cf6', r: 6, label: '⌊2/s⌋' }
            ]
        }
    },
    {
        id: 'quiz-piecewise',
        title: 'Knowledge Check',
        content: "Which value of k makes the function f(x) = { 2x (x<1), x+k (x≥1) } continuous?",
        interactiveType: 'quiz',
        quizOptions: ['k = 0', 'k = 1', 'k = 2', 'k = -1'],
        correctOption: 1,
        category: 'Assessment'
    }
];

const lesson7Data = [
    {
        id: 'intro-inverse',
        title: 'The Mirror World',
        content: "An inverse function undoes the action of the original function. If f(x) maps input A to output B, the inverse f⁻¹(x) maps B back to A. Graphically, this creates a beautiful symmetry across the line y = x.",
        interactiveType: 'intro',
        category: 'Introduction'
    },
    {
        id: 'horiz-line-test',
        title: 'The Horizontal Line Test',
        content: "To have an inverse, a function must be 'One-to-One', meaning no two inputs produce the same output. We test this with a horizontal line. If it hits the graph twice, there is no inverse function!",
        interactiveType: 'graph',
        category: 'Concept',
        visualization: {
            xDomain: [-4, 4],
            yDomain: [-5, 5],
            paramRange: [-4, 4],
            paramLabel: "Line Height k",
            elements: [
                { id: 'curve', type: 'function', expression: '0.25*x^2 - 2', color: '#3b82f6', strokeWidth: 4 },
                { id: 'hline', type: 'h-line', y: 't', color: '#ef4444', style: 'dashed', label: 'y = k' },
                { id: 'int1', type: 'point', x: '2 * sqrt(t + 2)', y: 't', color: '#ef4444', r: 5 },
                { id: 'int2', type: 'point', x: '-2 * sqrt(t + 2)', y: 't', color: '#ef4444', r: 5 }
            ]
        }
    },
    {
        id: 'reflection-symmetry',
        title: 'Reflection Symmetry',
        content: "The graph of an inverse function is the reflection of the original function across the diagonal line y = x. Notice how the blue curve (f) and purple curve (f⁻¹) mirror each other.",
        interactiveType: 'graph',
        category: 'Visualization',
        visualization: {
            xDomain: [-2, 6],
            yDomain: [-2, 6],
            paramRange: [0, 2.5],
            paramLabel: "Input x",
            elements: [
                { id: 'axis', type: 'function', expression: 'x', color: '#cbd5e1', strokeWidth: 2, style: 'dashed' },
                { id: 'func', type: 'function', expression: 'x^3 / 4 + 1', color: '#3b82f6', strokeWidth: 4 },
                { id: 'inv', type: 'function', expression: 'cbrt(4 * (x - 1))', color: '#a855f7', strokeWidth: 4 },
                { id: 'p_f', type: 'point', x: 't', y: 't^3/4 + 1', color: '#3b82f6', r: 6, label: 'f(x)' },
                { id: 'p_inv', type: 'point', x: 't^3/4 + 1', y: 't', color: '#a855f7', r: 6, label: 'f⁻¹(x)' },
                { id: 'conn', type: 'line', x1: 't', y1: 't^3/4 + 1', x2: 't^3/4 + 1', y2: 't', color: '#94a3b8', style: 'dotted' }
            ]
        }
    },
    {
        id: 'coord-swap',
        title: 'Swapping Coordinates',
        content: "Algebraically, finding the inverse involves swapping x and y. If the point (2, 5) is on f(x), then (5, 2) must be on f⁻¹(x). Watch the coordinates swap as you move the slider.",
        interactiveType: 'graph',
        category: 'Algebra',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-3, 3],
            paramLabel: "Value a",
            elements: [
                { id: 'diag', type: 'function', expression: 'x', color: '#cbd5e1', style: 'dashed' },
                { id: 'f', type: 'function', expression: '2*x - 1', color: '#3b82f6', strokeWidth: 3 },
                { id: 'finv', type: 'function', expression: '(x + 1) / 2', color: '#a855f7', strokeWidth: 3 },
                { id: 'pt_a', type: 'point', x: 't', y: '2*t - 1', color: '#3b82f6', r: 6, label: '(a, b)' },
                { id: 'pt_b', type: 'point', x: '2*t - 1', y: 't', color: '#a855f7', r: 6, label: '(b, a)' },
                { id: 'link', type: 'line', x1: 't', y1: '2*t - 1', x2: '2*t - 1', y2: 't', color: '#64748b', style: 'dashed' }
            ]
        }
    },
    {
        id: 'domain-restrict',
        title: 'Restricting the Domain',
        content: "Sometimes we cut a function in half to make it invertible. The parabola y=x² isn't one-to-one, but if we only keep x ≥ 0 (solid line), we can find its inverse: y=√x.",
        interactiveType: 'graph',
        category: 'Advanced',
        visualization: {
            xDomain: [-4, 6],
            yDomain: [-4, 6],
            paramRange: [0, 2.5],
            paramLabel: "Input x",
            elements: [
                { id: 'diag', type: 'function', expression: 'x', color: '#cbd5e1', style: 'dashed' },
                { id: 'para_ghost', type: 'function', expression: 'x^2', color: '#bfdbfe', strokeWidth: 2, style: 'dashed' },
                { id: 'para_real', type: 'function', expression: '(x >= 0) ? x^2 : NaN', color: '#3b82f6', strokeWidth: 4 },
                { id: 'root', type: 'function', expression: '(x >= 0) ? sqrt(x) : NaN', color: '#a855f7', strokeWidth: 4 },
                { id: 'pt1', type: 'point', x: 't', y: 't^2', color: '#3b82f6', r: 5 },
                { id: 'pt2', type: 'point', x: 't^2', y: 't', color: '#a855f7', r: 5 },
                { id: 'conn', type: 'line', x1: 't', y1: 't^2', x2: 't^2', y2: 't', color: '#94a3b8', style: 'dotted' }
            ]
        }
    },
    {
        id: 'quiz-inverse',
        title: 'Check Your Understanding',
        content: "If a function f(x) has an inverse, which of the following MUST be true?",
        interactiveType: 'quiz',
        quizOptions: [
            'f(x) passes the Vertical Line Test',
            'f(x) passes the Horizontal Line Test',
            'f(x) is always increasing',
            'f(x) is a straight line'
        ],
        correctOption: 1,
        category: 'Assessment'
    }
];



const lesson8Data = [
    {
        id: 'intro-vectors',
        title: 'Introduction to Vectors',
        content: "A vector has both magnitude (length) and direction. It's like an arrow pointing from one place to another. Drag the tip to change the vector.",
        interactiveType: 'graph',
        category: "Vectors",
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-4, 4],
            paramLabel: "Tip X",
            elements: [
                { id: 'vec', type: 'vector', x1: '0', y1: '0', x2: 't', y2: '3', color: '#3b82f6', strokeWidth: 4 },
                { id: 'label', type: 'text', x: 't/2', y: '1.5', content: 'v', color: '#3b82f6', fontSize: 16 }
            ]
        }
    },
    {
        id: 'vector-components',
        title: 'Vector Components',
        content: "Every vector can be broken down into horizontal (x) and vertical (y) components. These are like instructions: 'Go right 3, then go up 4'.",
        interactiveType: 'graph',
        category: 'Vectors',
        visualization: {
            xDomain: [-2, 6],
            yDomain: [-2, 6],
            paramRange: [1, 5],
            paramLabel: "X Component",
            elements: [
                { id: 'vec', type: 'vector', x1: '0', y1: '0', x2: 't', y2: '4', 
                    color: '#8b5cf6', strokeWidth: 4 },
                { id: 'compX', type: 'line', x1: '0', y1: '0', x2: 't', y2: '0', 
                    color: '#ef4444', style: 'dashed', label: 'Vx' },
                { id: 'compY', type: 'line', x1: 't', y1: '0', x2: 't', y2: '4', 
                    color: '#10b981', style: 'dashed', label: 'Vy' },
                { id: 'pt', type: 'point', x: 't', y: '4', color: '#8b5cf6', r: 4 }
            ]
        }
    },
    {
        id: 'vector-addition',
        title: 'Vector Addition',
        content: "To add vectors, we place them head-to-tail. The result (red) goes from the start of the first to the end of the last.",
        interactiveType: 'graph',
        category: 'Vectors',
        visualization: {
            xDomain: [-2, 8],
            yDomain: [-2, 8],
            paramRange: [1, 5],
            paramLabel: "Vector B X",
            elements: [
                { id: 'v1', type: 'vector', x1: '0', y1: '0', x2: '2', y2: '3', color: '#3b82f6', strokeWidth: 3 },
                { id: 'v2', type: 'vector', x1: '2', y1: '3', x2: '2+t', y2: '3+1', color: '#10b981', strokeWidth: 3 },
                { id: 'vSum', type: 'vector', x1: '0', y1: '0', x2: '2+t', y2: '4', color: '#ef4444', strokeWidth: 4 },
                { id: 'lbl1', type: 'text', x: '1', y: '1.5', content: 'A', color: '#3b82f6' },
                { id: 'lbl2', type: 'text', x: '2+t/2', y: '3.5', content: 'B', color: '#10b981' },
                { id: 'lblSum', type: 'text', x: '(2+t)/2', y: '2', content: 'A+B', color: '#ef4444' }
            ]
        }
    },
    {
        id: 'vector-scaling',
        title: 'Scalar Multiplication',
        content: "Multiplying a vector by a number (scalar) stretches or shrinks it. If the scalar is negative, it flips direction.",
        interactiveType: 'graph',
        category: 'Vectors',
        visualization: {
            xDomain: [-6, 6],
            yDomain: [-6, 6],
            paramRange: [-2, 2],
            paramLabel: "Scalar k",
            elements: [
                { id: 'orig', type: 'vector', x1: '0', y1: '0', x2: '2', y2: '1', 
                    color: '#cbd5e1', strokeWidth: 2 },
                { id: 'scaled', type: 'vector', x1: '0', y1: '0', x2: '2*t', y2: '1*t', color: '#ec4899', strokeWidth: 4 },
                { id: 'lbl', type: 'text', x: '2*t', y: '1*t + 0.5', content: 'kv', color: '#ec4899' }
            ]
        }
    },
    {
        id: 'parametric-intro',
        title: 'Parametric Equations',
        content: "Instead of y = f(x), we can define x and y separately as functions of time 't'. x(t) = t, y(t) = t². This traces a parabola.",
        interactiveType: 'graph',
        category: 'Parametric',
        visualization: {
            xDomain: [-3, 3],
            yDomain: [-1, 5],
            paramRange: [-2, 2],
            paramLabel: "Time t",
            elements: [
                { id: 'curve', type: 'parametric', xExpression: 't', yExpression: 't^2', tRange: [-3, 3], 
                    color: '#3b82f6', strokeWidth: 3 },
                { id: 'particle', type: 'point', x: 't', y: 't^2', color: '#ef4444', r: 6, label: 't' }
            ]
        }
    },
    {
        id: 'unit-circle',
        title: 'The Unit Circle',
        content: "The most famous parametric curve! x(t) = cos(t), y(t) = sin(t). As t goes from 0 to 2π, we trace a circle.",
        interactiveType: 'graph',
        category: 'Parametric',
        visualization: {
            xDomain: [-2, 2],
            yDomain: [-2, 2],
            paramRange: [0, 6.28],
            paramLabel: "Angle t",
            elements: [
                { id: 'circle', type: 'parametric', xExpression: 'cos(t)', yExpression: 'sin(t)', tRange: [0, 6.28], color: '#cbd5e1', strokeWidth: 2 },
                { id: 'radius', type: 'vector', x1: '0', y1: '0', x2: 'cos(t)', y2: 'sin(t)', color: '#3b82f6', strokeWidth: 3 },
                { id: 'pt', type: 'point', x: 'cos(t)', y: 'sin(t)', color: '#ef4444', r: 5 }
            ]
        }
    },
    {
        id: 'ellipse',
        title: 'Parametric Ellipse',
        content: "If we scale x and y differently, we get an ellipse. x(t) = a*cos(t), y(t) = b*sin(t). Change 'a' to stretch it horizontally.",
        interactiveType: 'graph',
        category: 'Parametric',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-3, 3],
            paramRange: [1, 4],
            paramLabel: "Width a",
            elements: [
                { id: 'ellipse', type: 'parametric', xExpression: 't * cos(p)', yExpression: '2 * sin(p)', tRange: [0, 6.28], color: '#8b5cf6', strokeWidth: 3, steps: 100 },
            ]
        }
    },
    {
        id: 'lissajous',
        title: 'Lissajous Figures',
        content: "When the frequencies of x and y oscillation differ, we get beautiful knots. x = sin(3t), y = sin(kt).",
        interactiveType: 'graph',
        category: 'Parametric',
        visualization: {
            xDomain: [-2, 2],
            yDomain: [-2, 2],
            paramRange: [1, 5],
            paramLabel: "Freq k",
            elements: [
                { id: 'liss', type: 'parametric', xExpression: 'sin(3*t)', yExpression: 'sin(T*t)', tRange: [0, 6.28], color: '#ec4899', strokeWidth: 2, steps: 200 }
            ]
        }
    },
    {
        id: 'spiral',
        title: 'Parametric Spiral',
        content: "If the radius grows with time, we get a spiral. x = t*cos(t), y = t*sin(t).",
        interactiveType: 'graph',
        category: 'Parametric',
        visualization: {
            xDomain: [-10, 10],
            yDomain: [-10, 10],
            paramRange: [0, 10],
            paramLabel: "Growth",
            elements: [
                { id: 'spiral', type: 'parametric', xExpression: '(t/2)*cos(t)', yExpression: '(t/2)*sin(t)', tRange: [0, 20], color: '#f59e0b', strokeWidth: 2, steps: 300 },
                { id: 'pt', type: 'point', x: '(T/2)*cos(T)', y: '(T/2)*sin(T)', color: '#ef4444', r: 6 }
            ]
        }
    },
    {
        id: 'inequalities',
        title: 'Visualizing Inequalities',
        content: "We can shade regions where a condition is true. Here, we shade y < x².",
        interactiveType: 'graph',
        category: 'Areas',
        visualization: {
            xDomain: [-3, 3],
            yDomain: [-1, 5],
            paramRange: [-2, 2],
            paramLabel: "Check x",
            elements: [
                { id: 'para', type: 'function', expression: 'x^2', color: '#3b82f6', strokeWidth: 3 },
                { id: 'shade', type: 'area', y1: '-1', y2: 'x^2', color: '#3b82f6', opacity: 0.2 },
                { id: 'pt', type: 'point', x: 't', y: 't^2', color: '#3b82f6', r: 5 }
            ]
        }
    },
    {
        id: 'area-between',
        title: 'Area Between Curves',
        content: "Calculus often asks for the area between two functions. Here, between y = x and y = x².",
        interactiveType: 'graph',
        category: 'Areas',
        visualization: {
            xDomain: [-0.5, 1.5],
            yDomain: [-0.5, 1.5],
            paramRange: [0, 1],
            paramLabel: "Sweep",
            elements: [
                { id: 'f1', type: 'function', expression: 'x', color: '#10b981', strokeWidth: 3 },
                { id: 'f2', type: 'function', expression: 'x^2', color: '#3b82f6', strokeWidth: 3 },
                { id: 'area', type: 'area', y1: 'x^2', y2: 'x', color: '#f59e0b', opacity: 0.3 }
            ]
        }
    },
    {
        id: 'calculus-preview',
        title: 'Area Under Curve',
        content: "The area under a velocity graph represents distance traveled. This is the core of integration.",
        interactiveType: 'graph',
        category: 'Calculus',
        visualization: {
            xDomain: [0, 5],
            yDomain: [0, 5],
            paramRange: [0, 5],
            paramLabel: "Limit b",
            elements: [
                { id: 'f', type: 'function', expression: '0.5*x + 1', color: '#8b5cf6', strokeWidth: 3 },
                { id: 'area', type: 'area', y1: '0', y2: '(x < T) ? 0.5*x + 1 : 0', color: '#8b5cf6', opacity: 0.3 },
                { id: 'limit', type: 'v-line', x: 'T', color: '#ef4444', style: 'dashed' }
            ]
        }
    },
    {
        id: 'dynamic-labels',
        title: 'Dynamic Labeling',
        content: "Labels can move and update with the visualization, making it easier to track points of interest.",
        interactiveType: 'graph',
        category: 'Features',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-4, 4],
            paramLabel: "Move Point",
            elements: [
                { id: 'path', type: 'function', expression: 'sin(x)*3', color: '#cbd5e1' },
                { id: 'pt', type: 'point', x: 't', y: 'sin(t)*3', color: '#ef4444', r: 6 },
                { id: 'lbl', type: 'text', x: 't', y: 'sin(t)*3 + 1', content: 'Moving!', color: '#ef4444' }
            ]
        }
    },
    {
        id: 'final-quiz',
        title: 'Mastery Check',
        content: "Which parametric equation represents a circle with radius 3?",
        interactiveType: 'quiz',
        quizOptions: [
            'x = 3cos(t), y = 3sin(t)',
            'x = cos(3t), y = sin(3t)',
            'x = 3t, y = 3t',
            'x = cos(t)+3, y = sin(t)+3'
        ],
        correctOption: 0,
        category: 'Assessment'
    }
];

const geometry1Data = [
    {
        id: 'intro-geo',
        title: 'Points & Coordinates',
        content: "Geometry starts with a point. On the Cartesian plane, every point has an address (x, y). Let's explore the distance between two points.",
        interactiveType: 'intro',
        category: 'Basics'
    },
    {
        id: 'distance-visual',
        title: 'The Distance Formula',
        content: "The distance between two points is the hypotenuse of a right triangle. Drag point B to see how the horizontal (dx) and vertical (dy) distances change.",
        interactiveType: 'graph',
        category: 'Distance',
        visualization: {
            xDomain: [-2, 8],
            yDomain: [-2, 8],
            paramRange: [2, 7],
            paramLabel: "Point B x",
            elements: [
                { id: 'pA', type: 'point', x: '1', y: '1', color: '#3b82f6', r: 6, label: 'A(1,1)' },
                { id: 'pB', type: 'point', x: 't', y: '5', color: '#ef4444', r: 6, label: 'B(x,5)' },
                { id: 'line', type: 'line', x1: '1', y1: '1', x2: 't', y2: '5', color: '#94a3b8', strokeWidth: 3 },
                { id: 'dx', type: 'line', x1: '1', y1: '1', x2: 't', y2: '1', color: '#cbd5e1', style: 'dashed' },
                { id: 'dy', type: 'line', x1: 't', y1: '1', x2: 't', y2: '5', color: '#cbd5e1', style: 'dashed' }
            ]
        }
    },
    {
        id: 'midpoint',
        title: 'The Midpoint',
        content: "The midpoint is the average of the coordinates. It's the exact center of the line segment connecting two points.",
        interactiveType: 'graph',
        category: 'Midpoint',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-4, 4],
            paramLabel: "Point B x",
            elements: [
                { id: 'pA', type: 'point', x: '-2', y: '-2', color: '#3b82f6', r: 5, label: 'A' },
                { id: 'pB', type: 'point', x: 't', y: '3', color: '#ef4444', r: 5, label: 'B' },
                { id: 'seg', type: 'line', x1: '-2', y1: '-2', x2: 't', y2: '3', color: '#94a3b8' },
                { id: 'mid', type: 'point', x: '(-2 + t)/2', y: '(-2 + 3)/2', color: '#10b981', r: 6, label: 'M' }
            ]
        }
    },
    {
        id: 'quiz-dist',
        title: 'Quick Check',
        content: "What is the distance between (0,0) and (3,4)?",
        interactiveType: 'quiz',
        quizOptions: ['3', '4', '5', '7'],
        correctOption: 2,
        category: 'Assessment'
    }
];

const geometry2Data = [
    {
        id: 'intro-slope',
        title: 'The Slope of a Line',
        content: "Slope measures steepness. It's the 'Rise over Run'. A positive slope goes up, a negative slope goes down.",
        interactiveType: 'intro',
        category: 'Basics'
    },
    {
        id: 'slope-visual',
        title: 'Rise over Run',
        content: "Change the slope 'm'. Notice how the line gets steeper as m increases. When m is negative, it falls.",
        interactiveType: 'graph',
        category: 'Slope',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-3, 3],
            paramLabel: "Slope m",
            elements: [
                { id: 'line', type: 'function', expression: 't * x', color: '#3b82f6', strokeWidth: 4 },
                { id: 'run', type: 'line', x1: '0', y1: '0', x2: '1', y2: '0', color: '#94a3b8', style: 'dashed' },
                { id: 'rise', type: 'line', x1: '1', y1: '0', x2: '1', y2: 't', color: '#ef4444', style: 'dashed' },
                { id: 'pt', type: 'point', x: '1', y: 't', color: '#ef4444', r: 5 }
            ]
        }
    },
    {
        id: 'parallel',
        title: 'Parallel Lines',
        content: "Parallel lines have the same slope but different y-intercepts. They never touch, like railroad tracks.",
        interactiveType: 'graph',
        category: 'Parallel',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-5, 5],
            paramRange: [-3, 3],
            paramLabel: "Intercept b",
            elements: [
                { id: 'l1', type: 'function', expression: '2*x', color: '#3b82f6', strokeWidth: 3 },
                { id: 'l2', type: 'function', expression: '2*x + t', color: '#10b981', strokeWidth: 3 },
                { id: 'dist', type: 'line', x1: '0', y1: '0', x2: '0', y2: 't', color: '#cbd5e1', style: 'dotted' }
            ]
        }
    },
    {
        id: 'quiz-slope',
        title: 'Slope Check',
        content: "If a line goes down from left to right, its slope is:",
        interactiveType: 'quiz',
        quizOptions: ['Positive', 'Negative', 'Zero', 'Undefined'],
        correctOption: 1,
        category: 'Assessment'
    }
];

const geometry3Data = [
    {
        id: 'intro-tri',
        title: 'Triangles on the Plane',
        content: "A triangle is defined by three vertices. In analytic geometry, we can calculate its properties using coordinates.",
        interactiveType: 'intro',
        category: 'Shapes'
    },
    {
        id: 'tri-visual',
        title: 'Dynamic Triangle',
        content: "Drag the top vertex. Watch how the shape changes from acute to obtuse.",
        interactiveType: 'graph',
        category: 'Polygons',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-2, 8],
            paramRange: [-4, 4],
            paramLabel: "Vertex x",
            elements: [
                { id: 'base', type: 'line', x1: '-3', y1: '0', x2: '3', y2: '0', color: '#3b82f6', strokeWidth: 3 },
                { id: 'left', type: 'line', x1: '-3', y1: '0', x2: 't', y2: '5', color: '#3b82f6', strokeWidth: 3 },
                { id: 'right', type: 'line', x1: '3', y1: '0', x2: 't', y2: '5', color: '#3b82f6', strokeWidth: 3 },
                { id: 'top', type: 'point', x: 't', y: '5', color: '#ef4444', r: 6, label: 'V' },
                { id: 'p1', type: 'point', x: '-3', y: '0', color: '#3b82f6', r: 4 },
                { id: 'p2', type: 'point', x: '3', y: '0', color: '#3b82f6', r: 4 }
            ]
        }
    },
    {
        id: 'area',
        title: 'Area of a Triangle',
        content: "Area = 1/2 * base * height. Here, the base is fixed at 6. The height is 5. Does moving the vertex horizontally change the area?",
        interactiveType: 'graph',
        category: 'Area',
        visualization: {
            xDomain: [-5, 5],
            yDomain: [-2, 8],
            paramRange: [-4, 4],
            paramLabel: "Vertex x",
            elements: [
                { id: 'base', type: 'line', x1: '-3', y1: '0', x2: '3', y2: '0', color: '#3b82f6', strokeWidth: 3 },
                { id: 'left', type: 'line', x1: '-3', y1: '0', x2: 't', y2: '5', color: '#94a3b8', strokeWidth: 2 },
                { id: 'right', type: 'line', x1: '3', y1: '0', x2: 't', y2: '5', color: '#94a3b8', strokeWidth: 2 },
                { id: 'h', type: 'line', x1: 't', y1: '0', x2: 't', y2: '5', color: '#ef4444', style: 'dashed', label: 'h=5' },
                { id: 'top', type: 'point', x: 't', y: '5', color: '#ef4444', r: 6 }
            ]
        }
    },
    {
        id: 'quiz-area',
        title: 'Area Check',
        content: "If base = 6 and height = 5, what is the area?",
        interactiveType: 'quiz',
        quizOptions: ['30', '15', '11', '60'],
        correctOption: 1,
        category: 'Assessment'
    }
];

const geometry4Data = [
    {
        id: 'intro-circle',
        title: 'The Circle Equation',
        content: "A circle is the set of all points equidistant from a center. The equation is x² + y² = r².",
        interactiveType: 'intro',
        category: 'Conics'
    },
    {
        id: 'circle-visual',
        title: 'Radius and Shape',
        content: "Change the radius 'r'. The equation x² + y² = r² describes this perfect symmetry.",
        interactiveType: 'graph',
        category: 'Circle',
        visualization: {
            xDomain: [-6, 6],
            yDomain: [-6, 6],
            paramRange: [1, 5],
            paramLabel: "Radius r",
            elements: [
                { id: 'top', type: 'function', expression: 'sqrt(t^2 - x^2)', color: '#8b5cf6', strokeWidth: 3 },
                { id: 'bot', type: 'function', expression: '-sqrt(t^2 - x^2)', color: '#8b5cf6', strokeWidth: 3 },
                { id: 'rad', type: 'line', x1: '0', y1: '0', x2: 't', y2: '0', color: '#ef4444', style: 'dashed', label: 'r' },
                { id: 'center', type: 'point', x: '0', y: '0', color: '#8b5cf6', r: 4 }
            ]
        }
    },
    {
        id: 'shifted-circle',
        title: 'Shifted Circle',
        content: "We can move the circle by changing the center (h, k). (x-h)² + (y-k)² = r². Let's shift it horizontally.",
        interactiveType: 'graph',
        category: 'Transformations',
        visualization: {
            xDomain: [-2, 8],
            yDomain: [-5, 5],
            paramRange: [0, 5],
            paramLabel: "Shift h",
            elements: [
                { id: 'top', type: 'function', expression: 'sqrt(4 - (x-t)^2)', color: '#ec4899', strokeWidth: 3 },
                { id: 'bot', type: 'function', expression: '-sqrt(4 - (x-t)^2)', color: '#ec4899', strokeWidth: 3 },
                { id: 'center', type: 'point', x: 't', y: '0', color: '#ec4899', r: 5, label: '(h,0)' }
            ]
        }
    },
    {
        id: 'quiz-circle',
        title: 'Circle Check',
        content: "What is the radius of the circle x² + y² = 16?",
        interactiveType: 'quiz',
        quizOptions: ['4', '8', '16', '32'],
        correctOption: 0,
        category: 'Assessment'
    }
];

export async function GET() {
    const supabase = await createClient()


    const { data: algebra } = await supabase
        .from('courses')
        .upsert({ name: 'Algebra', description: 'Master the basics of algebra.' }, { onConflict: 'name' })
        .select().single()

    const { data: geometry } = await supabase
        .from('courses')
        .upsert({ name: 'Geometry', description: 'Explore shapes, coordinates, and space.' }, { onConflict: 'name' })
        .select().single()


        const lessons = [
        { key: 'real-functions-1', course_id: algebra.id, data: lesson1Steps },
        { key: 'real-functions-2', course_id: algebra.id, data: lesson2Steps },
        { key: 'real-functions-3', course_id: algebra.id, data: lesson3Steps },
        { key: 'real-functions-5', course_id: algebra.id, data: lesson5Data },
        { key: 'real-functions-6', course_id: algebra.id, data: lesson6Data },
        { key: 'real-functions-7', course_id: algebra.id, data: lesson7Data },
        { key: 'real-functions-8', course_id: algebra.id, data: lesson8Data },

        { key: 'geometry-basic-1', course_id: geometry.id, data: geometry1Data },
        { key: 'geometry-basic-2', course_id: geometry.id, data: geometry2Data },
        { key: 'geometry-basic-3', course_id: geometry.id, data: geometry3Data },
        { key: 'geometry-basic-4', course_id: geometry.id, data: geometry4Data },
    ];

    const results = [];

    for (const lesson of lessons) {
        
        const { error } = await supabase
            .from('lessons')
            .upsert({
                course_id: lesson.course_id,
                lesson_key: lesson.key,
                data: lesson.data
            }, { onConflict: 'lesson_key' })

        if (error) results.push({ key: lesson.key, error: error.message });

        else results.push({ key: lesson.key, success: true });
    }

    return NextResponse.json({ success: true, results })
}
