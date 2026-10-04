const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const prisma = new PrismaClient();

// bootstrap-only seed for a fresh DB. the admin CMS is the source of truth from
// here on: this never overwrites or deletes content that already exists in the DB.
// every content fact (title, unit, difficulty, icon, summary) is read out of the
// compiled Prism, so this file only owns placement: which course, in what order.
// build the .json first with `npm run build:lessons` (db:seed does this for you).

// lessons sharing a unit must stay adjacent here: the course page groups by
// consecutive run, so a split unit renders its heading twice.
const COURSES = [
  {
    name: 'Calculus',
    slug: 'calculus',
    sortOrder: 0,
    description:
      'A complete single-variable course: limits and continuity, derivatives and their applications, then integration and what it builds.',
    lessons: [
      'limits-1',
      'limits-2',
      'limits-3',
      'limits-4',
      'limits-5',
      'derivative-meaning',
      'differentiation-1',
      'differentiation-2',
      'differentiation-3',
      'differentiation-7',
      'differentiation-4',
      'differentiation-6',
      'differentiation-5',
      'appderiv-1',
      'appderiv-2',
      'appderiv-3',
      'appderiv-4',
      'appderiv-5',
      'appderiv-6',
      'integration-1',
      'integration-2',
      'integration-3',
      'integration-4',
      'integration-5',
      'intapp-1',
      'intapp-2',
    ],
  },
  {
    name: 'Pure Maths',
    slug: 'pure-maths',
    sortOrder: 1,
    description:
      'Algebra, counting, trigonometry, coordinate geometry, complex numbers, logs and vectors, finishing with the calculus you need to go further.',
    lessons: [
      'alg-1',
      'alg-2',
      'alg-3',
      'comb-1',
      'comb-2',
      'comb-3',
      'trig-1',
      'trig-2',
      'trig-3',
      'trig-4',
      'coord-1',
      'coord-2',
      'coord-3',
      'cplx-1',
      'cplx-2',
      'cplx-3',
      'cplx-4',
      'explog-1',
      'explog-2',
      'explog-3',
      'explog-4',
      'vec-1',
      'vec-2',
      'vec-3',
      'vec-4',
      'vec-5',
      'vec-6',
      'vec-cross',
      'calcess-1',
      'calcess-2',
      'calcess-3',
      'calcess-4',
    ],
  },
  {
    name: 'Mechanics',
    slug: 'mechanics',
    sortOrder: 2,
    description:
      'Forces, friction, the three laws of motion, and motion under constant acceleration. Bring vectors and a little trigonometry.',
    lessons: [
      'force-1',
      'force-2',
      'force-3',
      'force-4',
      'fric-1',
      'fric-2',
      'fric-3',
      'fric-angle',
      'fric-4',
      'newton-1',
      'newton-2',
      'newton-3',
      'newton-4',
      'kin-1',
      'kin-2',
      'kin-3',
      'kin-4',
    ],
  },
  {
    name: 'الهندسة الفراغية',
    slug: 'solid-geometry-ar',
    description:
      'الهندسة الفراغية للثانوية العامة: الإحداثيات في الفراغ، المتجهات، والضرب القياسي والاتجاهي.',
    lang: 'ar',
    sortOrder: 4,
    lessons: ['ar-3d-1', 'ar-3d-2', 'ar-3d-3', 'ar-3d-4', 'ar-3d-5'],
  },
  {
    name: 'التفاضل والتكامل',
    slug: 'calculus-ar',
    description: 'التفاضل للثانوية العامة: معنى المشتقة وقواعدها، ثم الاشتقاق الضمني والبارامتري.',
    lang: 'ar',
    sortOrder: 3,
    lessons: ['ar-calc-1', 'ar-calc-2', 'ar-calc-3', 'ar-calc-4', 'ar-calc-5', 'ar-calc-6'],
  },
];

async function main() {
  const dir = path.join(__dirname, 'lessons');

  for (const { name, slug, description, sortOrder, lang = 'en', lessons } of COURSES) {
    const course = await prisma.course.upsert({
      where: { name },
      update: {},
      create: { name, slug, description, sortOrder, lang },
    });

    for (const [i, lessonKey] of lessons.entries()) {
      const source = fs.readFileSync(path.join(dir, `${lessonKey}.prism`), 'utf8');
      const data = JSON.parse(fs.readFileSync(path.join(dir, `${lessonKey}.json`), 'utf8'));

      await prisma.lesson.upsert({
        where: { lessonKey },
        update: {},
        create: {
          courseId: course.id,
          lessonKey,
          source,
          data,
          title: data.title,
          description: data.summary ?? null,
          unit: data.unit ?? null,
          difficulty: data.difficulty ?? null,
          iconName: data.icon ?? null,
          sortOrder: i + 1,
          publishedSource: source,
          publishedData: data,
          status: 'published',
          publishedAt: new Date(),
        },
      });
      console.log('seeded:', slug, '/', lessonKey);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
