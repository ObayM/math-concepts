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
      description: 'From the tangent line to the full toolkit of derivatives.',
    },
  });

  const lessons = [
    {
      courseId: calculusCourse.id,
      lessonKey: 'limits-1',
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
      data: require('./lessons/differentiation-5.json'),
      title: 'Mixed Differentiation Drill',
      description:
        'Choose the right rule under pressure, a mixed workout spanning power, product, quotient, chain, trig, implicit, exponential, and log derivatives.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Dumbbell',
      sortOrder: 12,
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
