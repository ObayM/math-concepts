import fs from 'fs';
import path from 'path';
import { compile, CompileError } from '@/engine/lang';

const G = '\x1b[32m';
const R = '\x1b[31m';
const Y = '\x1b[33m';
const C = '\x1b[36m';
const DIM = '\x1b[2m';
const B = '\x1b[1m';
const X = '\x1b[0m';

const argv = process.argv.slice(2);
const cmd = argv[0];

type Scene = { title: string; src: string };

function extractScenes(text: string): Scene[] {
  const scenes: Scene[] = [];
  let i = 0;
  const lines = text.split('\n');
  while (i < lines.length) {
    if (lines[i].startsWith('@scene')) {
      const m = lines[i].match(/title="([^"]+)"/);
      const title = m ? m[1] : `line ${i + 1}`;
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('@')) body.push(lines[i++]);
      const src = body.filter((l) => !l.trim().startsWith('>')).join('\n');
      scenes.push({ title, src });
    } else {
      i++;
    }
  }
  return scenes;
}

function checkFile(filePath: string): boolean {
  const text = fs.readFileSync(filePath, 'utf8');
  const name = path.basename(filePath);

  if (!text.includes('@scene')) {
    try {
      compile(text);
      console.log(`${G}✓${X} ${name}`);
      return true;
    } catch (e) {
      console.log(`${R}✗${X} ${name}: ${e instanceof CompileError ? e.message : e}`);
      return false;
    }
  }

  const scenes = extractScenes(text);
  if (!scenes.length) {
    console.log(`${Y}?${X} ${name}: no @scene blocks`);
    return true;
  }

  let ok = true;
  for (let i = 0; i < scenes.length; i++) {
    const { title, src } = scenes[i];
    try {
      compile(src);
      console.log(`  ${G}✓${X} ${DIM}[${i + 1}]${X} ${title}`);
    } catch (e) {
      const msg = e instanceof CompileError ? e.message : String(e);
      console.log(`  ${R}✗${X} ${DIM}[${i + 1}]${X} ${title}`);
      console.log(`       ${R}${msg}${X}`);
      ok = false;
    }
  }
  return ok;
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
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.dsl'));
  let anyFail = false;
  for (const f of files) {
    console.log(`${B}${C}${f}${X}`);
    if (!checkFile(path.join(dir, f))) anyFail = true;
  }
  process.exit(anyFail ? 1 : 0);
} else if (cmd === 'compile') {
  const file = argv[1];
  const n = parseInt(argv[2] ?? '1', 10);
  if (!file) {
    console.error('usage: dsl compile <file> [scene-number]');
    process.exit(1);
  }
  const text = fs.readFileSync(path.resolve(file), 'utf8');
  let src = text;
  let title = path.basename(file);
  if (text.includes('@scene')) {
    const scenes = extractScenes(text);
    if (!scenes.length) {
      console.error('no @scene blocks found');
      process.exit(1);
    }
    if (n < 1 || n > scenes.length) {
      console.error(`scene ${n} out of range (file has ${scenes.length} scenes)`);
      process.exit(1);
    }
    ({ src, title } = scenes[n - 1]);
  }
  try {
    const ir = compile(src);
    console.log(`${B}${C}${title}${X}`);
    console.log(JSON.stringify(ir, null, 2));
  } catch (e) {
    console.error(`${R}error:${X} ${e instanceof CompileError ? e.message : e}`);
    process.exit(1);
  }
} else {
  console.log(`${B}dsl${X} - Mathly scene DSL compiler

${B}commands:${X}
  check <file>          validate all @scene blocks in a lesson file
  check-all [dir]       validate every .dsl file (default: prisma/lessons)
  compile <file> [n]    compile scene n (default: 1) and print the IR as JSON

${B}examples:${X}
  make dsl-check f=prisma/lessons/quadratics-1.dsl
  make dsl-check-all
  make dsl-compile f=prisma/lessons/quadratics-1.dsl scene=2
`);
}
