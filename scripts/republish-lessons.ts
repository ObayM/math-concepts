import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';
import { compileLesson } from '@/engine/lang';

const prisma = new PrismaClient();

const KEYS = process.argv.slice(2);
const APPLY = process.env.APPLY === '1';

async function main() {
  if (KEYS.length === 0) {
    console.error('usage: tsx scripts/republish-lessons.ts <lessonKey...>  (set APPLY=1 to write)');
    process.exit(1);
  }

  for (const key of KEYS) {
    const path = fileURLToPath(new URL(`../prisma/lessons/${key}.prism`, import.meta.url));
    const source = readFileSync(path, 'utf8');
    const compiled = compileLesson(source);
    const data = compiled as unknown as Prisma.InputJsonValue;

    const lesson = await prisma.lesson.findUnique({ where: { lessonKey: key } });
    if (!lesson) {
      console.log(`SKIP ${key}: no DB row`);
      continue;
    }

    const drifted = (lesson.publishedSource ?? '').trim() !== source.trim();
    console.log(
      `${key}: status=${lesson.status} drifted=${drifted} slides=${compiled.slides.length}`
    );

    if (APPLY) {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          source,
          data,
          publishedSource: source,
          publishedData: data,
          status: 'published',
          publishedAt: new Date(),
        },
      });
      console.log(`  -> republished`);
    }
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
