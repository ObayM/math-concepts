import { compile as compileScene, CompileError } from '@/engine/lang';
import { scanLine } from '@/engine/lang/scan';
import { lessonDataSchema } from './schema';

// a lesson is a sequence of @blocks. each @line opens a block; the lines under it
// are its body. block types: text | scene | quiz | build.

function unq(t: string): string {
  return t.length >= 2 && t.startsWith('"') && t.endsWith('"') ? t.slice(1, -1) : t;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

type RawBlock = { type: string; meta: Record<string, string | boolean>; body: string[] };

function parseHeader(line: string): { type: string; meta: Record<string, string | boolean> } {
  const toks = scanLine(line.slice(1).trim());
  const meta: Record<string, string | boolean> = {};
  for (const t of toks.slice(1)) {
    const eq = t.indexOf('=');
    if (eq >= 0) meta[t.slice(0, eq)] = unq(t.slice(eq + 1));
    else meta[t] = true; // bare flag, e.g. `reusable`
  }
  return { type: toks[0], meta };
}

function buildSceneBlock(base: any, body: string[]) {
  const prose = body.filter((l) => l.trim().startsWith('>')).map((l) => l.replace(/^\s*>\s?/, ''));
  const sceneSrc = body.filter((l) => !l.trim().startsWith('>')).join('\n');
  return { ...base, type: 'scene', content: prose.join(' ').trim(), scene: compileScene(sceneSrc) };
}

function buildQuizBlock(base: any, body: string[]) {
  const options: string[] = [];
  const prose: string[] = [];
  let correct = -1;
  let explanation: string | undefined;
  for (const raw of body) {
    const l = raw.trim();
    if (l.startsWith('*')) {
      correct = options.length;
      options.push(l.slice(1).trim());
    } else if (l.startsWith('-')) {
      options.push(l.slice(1).trim());
    } else if (l.startsWith('!')) {
      explanation = l.slice(1).trim();
    } else if (l) {
      prose.push(l);
    }
  }
  if (correct < 0) throw new CompileError(`quiz "${base.title}" needs a * correct option`);
  return {
    ...base,
    type: 'quiz',
    content: prose.join(' '),
    quizOptions: options,
    correctOption: correct,
    ...(explanation ? { explanation } : {}),
  };
}

function buildBuildBlock(base: any, meta: Record<string, string | boolean>, body: string[]) {
  let bank: any[] = [];
  const answer: string[][] = [];
  const prose: string[] = [];
  let explanation: string | undefined;
  for (const raw of body) {
    const l = raw.trim();
    if (l.startsWith('bank:')) {
      bank = l
        .slice(5)
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((label) => ({
          id: label,
          label,
          kind: /^[a-zA-Z0-9]/.test(label) ? 'operand' : 'operator',
        }));
    } else if (l.startsWith('answer:')) {
      answer.push(l.slice(7).trim().split(/\s+/).filter(Boolean));
    } else if (l.startsWith('!')) {
      explanation = l.slice(1).trim();
    } else if (l) {
      prose.push(l);
    }
  }
  if (!bank.length) throw new CompileError(`build "${base.title}" needs a bank:`);
  if (!answer.length) throw new CompileError(`build "${base.title}" needs an answer:`);
  return {
    ...base,
    type: 'build',
    content: prose.join(' '),
    slots: meta.slots ? Number(meta.slots) : answer[0].length,
    bank,
    answer,
    ...(meta.reusable ? { reusable: true } : {}),
    ...(explanation ? { explanation } : {}),
  };
}

function buildBlock(b: RawBlock, i: number) {
  const title = typeof b.meta.title === 'string' ? b.meta.title : '';
  const id = (typeof b.meta.id === 'string' && b.meta.id) || slug(title) || `${b.type}-${i}`;
  const base: any = { id, title };
  if (typeof b.meta.cat === 'string') base.category = b.meta.cat;

  switch (b.type) {
    case 'text':
      return { ...base, type: 'text', content: b.body.join('\n').trim() };
    case 'scene':
      return buildSceneBlock(base, b.body);
    case 'quiz':
      return buildQuizBlock(base, b.body);
    case 'build':
      return buildBuildBlock(base, b.meta, b.body);
    default:
      throw new CompileError(`unknown block type "@${b.type}"`);
  }
}

export function compileLesson(source: string) {
  const blocks: RawBlock[] = [];
  let cur: RawBlock | null = null;
  for (const raw of source.split('\n')) {
    if (raw.startsWith('@')) {
      if (cur) blocks.push(cur);
      cur = { ...parseHeader(raw), body: [] };
    } else if (cur) {
      cur.body.push(raw);
    }
  }
  if (cur) blocks.push(cur);

  const slides = blocks.map(buildBlock);
  const result = lessonDataSchema.safeParse({ slides });
  if (!result.success) {
    const first = result.error.issues[0];
    throw new CompileError(`invalid lesson at ${first.path.join('.')}: ${first.message}`);
  }
  return result.data;
}
