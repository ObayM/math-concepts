const { PrismaClient } = require('@prisma/client');
const fs = require('node:fs');
const path = require('node:path');
const prisma = new PrismaClient();

// bootstrap-only seed for a fresh DB. the admin CMS is the source of truth from
// here on: this never overwrites or deletes content that already exists in the DB.
// every content fact (title, unit, difficulty, icon, summary) is read out of the
// compiled Prism, so this file only owns placement: which course, in what order.
// build the .json first with `npm run build:lessons` (db:seed does this for you).

const ORDER = [
  'limits-1',
  'limits-2',
  'limits-3',
  'limits-4',
  'limits-5',
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
];

async function main() {
  const course = await prisma.course.upsert({
    where: { name: 'Calculus' },
    update: {},
    create: {
      name: 'Calculus',
      slug: 'calculus',
      description:
        'A complete single-variable course: limits and continuity, derivatives and their applications, then integration and what it builds.',
    },
  });

  const dir = path.join(__dirname, 'lessons');

  for (const [i, lessonKey] of ORDER.entries()) {
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
    console.log('seeded:', lessonKey);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
