import fs from 'fs';
import path from 'path';
import { compile, compileLesson, CompileError, formatCompileError } from '@/engine/lang';

const G = '\x1b[32m';
const R = '\x1b[31m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const B = '\x1b[1m';
const X = '\x1b[0m';

const argv = process.argv.slice(2);
const cmd = argv[0];

// a .prism file is either a `lesson { ... }` or a bare `scene { ... }`
function isLesson(src: string): boolean {
  return /^\s*lesson\b/.test(src);
}

function printError(src: string, e: unknown, indent = '  ') {
  const frame = e instanceof CompileError ? formatCompileError(src, e) : String(e);
  console.log(
    frame
      .split('\n')
      .map((l) => `${indent}${R}${l}${X}`)
      .join('\n')
  );
}

function checkFile(filePath: string): boolean {
  const src = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);
  try {
    if (isLesson(src)) {
      const lesson = compileLesson(src);
      console.log(`${G}✓${X} ${name} ${Y}(lesson, ${lesson.slides.length} slides)${X}`);
    } else {
      compile(src);
      console.log(`${G}✓${X} ${name} ${Y}(scene)${X}`);
    }
    return true;
  } catch (e) {
    console.log(`${R}✗${X} ${name}`);
    printError(src, e);
    return false;
  }
}

if (cmd === 'check') {
  const file = argv[1];
  if (!file) {
    console.error('usage: dsl check <file>');
    process.exit(1);
  }
  process.exit(checkFile(path.resolve(file)) ? 0 : 1);
} else if (cmd === 'check-all') {
  const dir = argv[1] ?? 'prisma/lessons';
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.prism'));
  let anyFail = false;
  for (const f of files) {
    if (!checkFile(path.join(dir, f))) anyFail = true;
  }
  process.exit(anyFail ? 1 : 0);
} else if (cmd === 'compile') {
  const file = argv[1];
  if (!file) {
    console.error('usage: dsl compile <file>');
    process.exit(1);
  }
  const src = fs.readFileSync(path.resolve(file), 'utf8');
  try {
    const ir = isLesson(src) ? compileLesson(src) : compile(src);
    console.log(`${B}${C}${path.basename(file)}${X}`);
    console.log(JSON.stringify(ir, null, 2));
  } catch (e) {
    printError(src, e, '');
    process.exit(1);
  }
} else {
  console.log(`${B}dsl${X} - Prism compiler

${B}commands:${X}
  check <file>       validate a .prism lesson or scene file
  check-all [dir]    validate every .prism file (default: prisma/lessons)
  compile <file>     compile and print the IR as JSON

${B}examples:${X}
  make dsl-check f=prisma/lessons/quadratics-1.prism
  make dsl-check-all
  make dsl-compile f=prisma/lessons/quadratics-1.prism
`);
}
