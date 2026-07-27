import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PrismaClient, Prisma } from '@prisma/client';
import { compileLesson } from '@/engine/lang';

const prisma = new PrismaClient();

const ARGS = process.argv.slice(2);
const APPLY = process.env.APPLY === '1';

async function main() {
  if (ARGS.length === 0) {
    console.error(
      'usage: tsx scripts/republish-lessons.ts <lessonKey...|--all>  (set APPLY=1 to write)'
    );
    process.exit(1);
  }

  const keys = ARGS.includes('--all')
    ? readdirSync(fileURLToPath(new URL('../prisma/lessons', import.meta.url)))
        .filter((f) => f.endsWith('.prism'))
        .map((f) => f.replace(/\.prism$/, ''))
        .sort()
    : ARGS;

  for (const key of keys) {
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
          title: compiled.title,
          description: compiled.summary ?? null,
          unit: compiled.unit ?? null,
          difficulty: compiled.difficulty ?? null,
          iconName: compiled.icon ?? null,
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
