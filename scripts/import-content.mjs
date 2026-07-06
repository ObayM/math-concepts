// one-time backfill: reads prisma/lessons/*.prism source into the DB (source + IR),
// marks existing lessons published, and backfills Course.slug.
// there is no IR->source decompiler, so this is the only way to get real .prism
// text into the DB for the 9 lessons that predate the CMS. run once via:
//   node --env-file=.env scripts/import-content.mjs
import { execSync } from 'node:child_process';
import Module, { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const out = path.join(root, '.lessons-build');
const lessonsDir = path.join(root, 'prisma', 'lessons');
const cfg = path.join(root, '.lessons-build.tsconfig.json');
const prisma = new PrismaClient();

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

fs.writeFileSync(
  cfg,
  JSON.stringify({
    compilerOptions: {
      module: 'commonjs',
      target: 'es2019',
      skipLibCheck: true,
      moduleResolution: 'node',
      esModuleInterop: true,
      resolveJsonModule: true,
      baseUrl: '.',
      paths: { '@/*': ['./src/*'] },
      rootDir: './src',
      outDir: '.lessons-build',
      noEmit: false,
      jsx: 'react-jsx',
      ignoreDeprecations: '6.0',
    },
    include: ['src/engine/lang/**/*.ts', 'src/engine/ir/**/*.ts', 'src/engine/expr/**/*.ts'],
  })
);

async function main() {
  execSync(`"${path.join(root, 'node_modules/.bin/tsc')}" -p .lessons-build.tsconfig.json`, {
    cwd: root,
    stdio: 'inherit',
  });

  const origResolve = Module._resolveFilename;
  Module._resolveFilename = function (req, ...rest) {
    if (req.startsWith('@/')) req = path.join(out, req.slice(2));
    return origResolve.call(this, req, ...rest);
  };

  const require = createRequire(import.meta.url);
  const { compileLesson } = require(path.join(out, 'engine/lang/compile.js'));

  const courses = await prisma.course.findMany();
  for (const course of courses) {
    if (course.slug) continue;
    await prisma.course.update({ where: { id: course.id }, data: { slug: slugify(course.name) } });
    console.log(`slugged course: ${course.name} -> ${slugify(course.name)}`);
  }

  const files = fs.readdirSync(lessonsDir).filter((f) => f.endsWith('.prism'));
  const now = new Date();
  for (const file of files) {
    const lessonKey = file.replace(/\.prism$/, '');
    const existing = await prisma.lesson.findUnique({ where: { lessonKey } });
    if (!existing) {
      console.log(`skip ${lessonKey}: no matching DB row (not seeded yet)`);
      continue;
    }
    const source = fs.readFileSync(path.join(lessonsDir, file), 'utf8');
    const data = compileLesson(source);
    await prisma.lesson.update({
      where: { lessonKey },
      data: {
        source,
        data,
        publishedSource: source,
        publishedData: data,
        status: 'published',
        publishedAt: now,
      },
    });
    console.log(`imported ${lessonKey} (${data.slides.length} slides)`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
    fs.rmSync(out, { recursive: true, force: true });
    fs.rmSync(cfg, { force: true });
  });
