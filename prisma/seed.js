const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const prisma = new PrismaClient();

// bootstrap-only seed for a fresh DB. the admin CMS is the source of truth from
// here on: this never overwrites or deletes content that already exists in the DB.
// every lesson is compiled Prism (Lesson IR v2) loaded from ./lessons/*.json.
// build them first with `npm run build:lessons` (db:seed does this automatically).

async function main() {
  const algebraCourse = await prisma.course.upsert({
    where: { name: 'Algebra' },
    update: {},
    create: {
      name: 'Algebra',
      slug: 'algebra',
      description: 'Master the fundamentals of Algebra.',
    },
  });

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
      courseId: algebraCourse.id,
      lessonKey: 'quadratics-1',
      data: require('./lessons/quadratics-1.json'),
      title: 'Quadratic Equations',
      description:
        'Explore parabolas from every angle — standard, vertex, and factored form, the discriminant, and factoring — with draggable, animated graphs and hands-on tiles.',
      category: 'Algebra',
      difficulty: 'Intermediate',
      iconName: 'FunctionSquare',
      sortOrder: 9,
    },
    {
      courseId: algebraCourse.id,
      lessonKey: 'real-functions-1',
      data: require('./lessons/real-functions-1.json'),
      title: 'Intro to Real Functions',
      description:
        'Understand how to determine the domain and range of real functions, including restrictions and interval representation.',
      category: 'Algebra',
      difficulty: 'Beginner',
      iconName: 'FunctionSquare',
      sortOrder: 1,
    },
    {
      courseId: algebraCourse.id,
      lessonKey: 'real-functions-2',
      data: require('./lessons/real-functions-2.json'),
      title: 'Monotonicity of Functions',
      description:
        'Learn how to analyze whether a function is increasing, decreasing, or non-monotonic.',
      category: 'Algebra',
      difficulty: 'Beginner',
      iconName: 'TrendingUp',
      sortOrder: 2,
    },
    {
      courseId: algebraCourse.id,
      lessonKey: 'real-functions-3',
      data: require('./lessons/real-functions-3.json'),
      title: 'Operations on Functions',
      description: 'Explore how to add, subtract, multiply, divide, and compose functions.',
      category: 'Algebra',
      difficulty: 'Intermediate',
      iconName: 'Sigma',
      sortOrder: 3,
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
      sortOrder: 1,
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
      sortOrder: 2,
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
      sortOrder: 3,
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
      sortOrder: 4,
    },
    {
      courseId: calculusCourse.id,
      lessonKey: 'differentiation-5',
      data: require('./lessons/differentiation-5.json'),
      title: 'Mixed Differentiation Drill',
      description:
        'Choose the right rule under pressure — a mixed workout combining power, product, quotient, chain, and trig derivatives.',
      category: 'Calculus',
      difficulty: 'Advanced',
      iconName: 'Dumbbell',
      sortOrder: 5,
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
