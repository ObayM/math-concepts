const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const prisma = new PrismaClient();

// bootstrap-only seed for a fresh DB. the admin CMS is the source of truth from
// here on: this never overwrites or deletes content that already exists in the DB.
// every lesson is compiled Prism (Lesson IR v2) loaded from ./lessons/*.json.
// build them first with `npm run build:lessons` (db:seed does this automatically).

async function main() {
  const calculusCourse = await prisma.course.upsert({
    where: { name: 'Calculus' },
    update: {},
    create: {
      name: 'Calculus',
      slug: 'calculus',
      description:
        'A complete single-variable course: limits and continuity, derivatives and their applications, then integration and what it builds.',
    },
  });

  const lessons = [
    {
      courseId: calculusCourse.id,
      lessonKey: 'limits-1',
      unit: 'Limits & Continuity',
      data: require('./lessons/limits-1.json'),
      title: 'What a Limit Is',
      description:
        'The core idea of calculus: what a function does near a point, not at it, numerically, graphically, and with proper notation.',
      category: 'Calculus',
      difficulty: 'Beginner',
      iconName: 'Circle',
      sortOrder: 1,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'limits-2',
      unit: 'Limits & Continuity',
      data: require('./lessons/limits-2.json'),
      title: 'Computing Limits',
      description:
        'Direct substitution, factor-and-cancel, rationalizing with a conjugate, and the squeeze theorem: the toolkit for evaluating limits by hand.',
      category: 'Calculus',
      difficulty: 'Beginner',
      iconName: 'Sigma',
      sortOrder: 2,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'limits-3',
      unit: 'Limits & Continuity',
      data: require('./lessons/limits-3.json'),
      title: 'One-Sided & Infinite Limits',
      description:
        'When left and right disagree, and when a function blows up entirely: jump discontinuities, vertical asymptotes, and reading both kinds off a graph.',
      category: 'Calculus',
      difficulty: 'Beginner',
      iconName: 'LineChart',
      sortOrder: 3,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'limits-4',
      unit: 'Limits & Continuity',
      data: require('./lessons/limits-4.json'),
      title: 'Limits at Infinity',
      description:
        'What happens way out there: horizontal asymptotes, end behavior, and the degree-comparison shortcut for rational functions.',
      category: 'Calculus',
      difficulty: 'Beginner',
      iconName: 'Move',
      sortOrder: 4,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'limits-5',
      unit: 'Limits & Continuity',
      data: require('./lessons/limits-5.json'),
      title: 'Continuity & the Intermediate Value Theorem',
      description:
        'The three conditions behind continuity, the three ways a function can break them, and the guaranteed-root payoff of the Intermediate Value Theorem.',
      category: 'Calculus',
      difficulty: 'Beginner',
      iconName: 'Check',
      sortOrder: 5,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-1',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-1.json'),
      title: 'The Derivative & the Power Rule',
      description:
        'Build the derivative from the ground up — secant to tangent, the derivative as a function, the power rule, and differentiating polynomials term by term.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'TrendingUp',
      sortOrder: 6,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-2',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-2.json'),
      title: 'Product & Quotient Rules',
      description:
        'Differentiate products and quotients — with the rectangle-area intuition, live tangents, and hands-on drills.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'X',
      sortOrder: 7,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-3',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-3.json'),
      title: 'The Chain Rule',
      description:
        'Differentiate composite functions — the rates-multiply intuition, the outside-in recipe, and chain-rule drills under powers and roots.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Link',
      sortOrder: 8,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-7',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-7.json'),
      title: 'Implicit Differentiation',
      description:
        'Find dy/dx for curves that were never solved for y, from circles to the product rule in disguise.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Circle',
      sortOrder: 9,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-4',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-4.json'),
      title: 'Trigonometric Derivatives',
      description:
        'See why the slope of sine is cosine, then master the derivatives of tan, cot, sec, and csc.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Waves',
      sortOrder: 10,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-6',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-6.json'),
      title: 'Exponential & Logarithmic Derivatives',
      description:
        'The function that is its own derivative, the clean 1/x that falls out of ln(x), and every chain rule built on top of them.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'TrendingUp',
      sortOrder: 11,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-5',
      unit: 'Derivatives & Rules',
      data: require('./lessons/differentiation-5.json'),
      title: 'Mixed Differentiation Drill',
      description:
        'Choose the right rule under pressure, a mixed workout spanning power, product, quotient, chain, trig, implicit, exponential, and log derivatives.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Dumbbell',
      sortOrder: 12,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'appderiv-1',
      unit: 'Applications of the Derivative',
      data: require('./lessons/appderiv-1.json'),
      title: 'Linear Approximation & Differentials',
      description:
        'Use the tangent line as a stand-in for a harder function nearby, plus the differential notation that goes with it.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Ruler',
      sortOrder: 13,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'appderiv-2',
      unit: 'Applications of the Derivative',
      data: require('./lessons/appderiv-2.json'),
      title: 'Related Rates',
      description:
        'Growing circles, sliding ladders, and every other problem where one rate of change is tied to another.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Move',
      sortOrder: 14,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'appderiv-3',
      unit: 'Applications of the Derivative',
      data: require('./lessons/appderiv-3.json'),
      title: 'Increasing, Decreasing & the First Derivative Test',
      description:
        "Read a function's rise and fall straight off the sign of its derivative, then classify every critical point.",
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Triangle',
      sortOrder: 15,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'appderiv-4',
      unit: 'Applications of the Derivative',
      data: require('./lessons/appderiv-4.json'),
      title: 'Concavity & the Second Derivative Test',
      description:
        'Find where a curve bends up or down, locate inflection points, and classify critical points without a sign chart.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Undo2',
      sortOrder: 16,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'appderiv-5',
      unit: 'Applications of the Derivative',
      data: require('./lessons/appderiv-5.json'),
      title: 'Curve Sketching',
      description:
        'Combine critical points, concavity, and everything else from this unit into one complete sketching workflow.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'FunctionSquare',
      sortOrder: 17,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'appderiv-6',
      unit: 'Applications of the Derivative',
      data: require('./lessons/appderiv-6.json'),
      title: 'Optimization',
      description:
        'Turn a biggest-or-smallest word problem into a function, then let critical points find the real-world answer.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Star',
      sortOrder: 18,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'integration-1',
      unit: 'Integration',
      data: require('./lessons/integration-1.json'),
      title: 'Antiderivatives',
      description:
        'Run differentiation backward: the power rule in reverse, the mystery constant C, and finding it from an initial condition.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Undo2',
      sortOrder: 19,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'integration-2',
      unit: 'Integration',
      data: require('./lessons/integration-2.json'),
      title: 'Riemann Sums',
      description:
        'Approximate the area under a curve with rectangles, live, and watch the estimate close in as they multiply and thin out.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'Sigma',
      sortOrder: 20,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'integration-3',
      unit: 'Integration',
      data: require('./lessons/integration-3.json'),
      title: 'The Fundamental Theorem of Calculus',
      description:
        'The result that ties the whole course together: exact area under a curve from nothing more than an antiderivative.',
      category: 'Calculus',
      difficulty: 'Intermediate',
      iconName: 'MapPin',
      sortOrder: 21,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'integration-4',
      unit: 'Integration',
      data: require('./lessons/integration-4.json'),
      title: 'u-Substitution',
      description:
        'Reverse the chain rule to simplify integrals that would otherwise be unmanageable, bounds and all.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Play',
      sortOrder: 22,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'integration-5',
      unit: 'Integration',
      data: require('./lessons/integration-5.json'),
      title: 'Area Between Curves',
      description:
        'Stack two regions and integrate the gap between them, from a line and a parabola to curves that cross midway.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Ruler',
      sortOrder: 23,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'intapp-1',
      unit: 'Applications of Integration',
      data: require('./lessons/intapp-1.json'),
      title: 'Volumes of Revolution',
      description:
        'Spin a flat region around an axis and slice the resulting solid into disks or washers to find its volume.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Circle',
      sortOrder: 24,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'intapp-2',
      unit: 'Applications of Integration',
      data: require('./lessons/intapp-2.json'),
      title: 'Average Value & Accumulation',
      description:
        'Average infinitely many values with one integral, then meet the accumulation functions that tie the whole course together.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'ChevronRight',
      sortOrder: 25,
    },
  ];

  for (const lesson of lessons) {
    const source = fs.readFileSync(
      path.join(__dirname, 'lessons', `${lesson.lessonKey}.prism`),
      'utf8'
    );
    await prisma.lesson.upsert({
      where: { lessonKey: lesson.lessonKey },
      update: {},
      create: {
        ...lesson,
        source,
        publishedSource: source,
        publishedData: lesson.data,
        status: 'published',
        publishedAt: new Date(),
      },
    });
    console.log('seeded:', lesson.lessonKey);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
