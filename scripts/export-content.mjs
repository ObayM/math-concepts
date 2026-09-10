import fs from 'node:fs';
import path from 'node:path';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const out = process.argv[2] ?? `content-export-${new Date().toISOString().slice(0, 10)}`;

function safe(name) {
  return name.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'course';
}

async function main() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { lessons: { orderBy: { sortOrder: 'asc' } } },
  });

  fs.mkdirSync(out, { recursive: true });

  const manifest = [];
  let written = 0;

  for (const course of courses) {
    const dir = path.join(out, `${safe(course.slug ?? course.name)}-${course.lang}`);
    fs.mkdirSync(dir, { recursive: true });

    manifest.push({
      name: course.name,
      slug: course.slug,
      lang: course.lang,
      status: course.status,
      sortOrder: course.sortOrder,
      description: course.description,
      lessons: course.lessons.map((l) => ({
        lessonKey: l.lessonKey,
        title: l.title,
        unit: l.unit,
        sortOrder: l.sortOrder,
        status: l.status,
      })),
    });

    for (const lesson of course.lessons) {
      const source = lesson.publishedSource ?? lesson.source;
      if (!source) continue;
      fs.writeFileSync(path.join(dir, `${lesson.lessonKey}.prism`), source);
      written += 1;
      if (lesson.source && lesson.source !== lesson.publishedSource) {
        fs.writeFileSync(path.join(dir, `${lesson.lessonKey}.draft.prism`), lesson.source);
      }
    }
  }

  fs.writeFileSync(path.join(out, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  console.log(`exported ${written} lessons across ${courses.length} courses to ${out}/`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
