import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { compile, compileLesson, CompileError, formatCompileError } from '@/engine/lang';

const LESSONS_DIR = path.resolve(process.cwd(), 'prisma/lessons');

// lessons carry their scenes inside slides. the old @scene block format this
// used to scan for has not existed since v2, which is why every lesson file
// fell through to the bare-scene compiler and reported "missing scene declaration".
function lessonScenes(text: string) {
  const lesson = compileLesson(text);
  return lesson.slides
    .map((slide, i) => ({
      title: slide.title ?? `Slide ${i + 1}`,
      scene: slide.scene,
      pane: slide.pane,
    }))
    .filter((s): s is typeof s & { scene: NonNullable<typeof s.scene> } => Boolean(s.scene));
}

export async function GET(req: NextRequest) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'not found' }, { status: 404 });
  }

  const { searchParams } = req.nextUrl;
  const file = searchParams.get('file') ?? '';
  const sceneN = parseInt(searchParams.get('scene') ?? '1', 10);

  if (!file.endsWith('.prism') || file.includes('/') || file.includes('..')) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  }

  const filePath = path.join(LESSONS_DIR, file);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `not found: ${file}` }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const mtime = stat.mtimeMs;
  const text = fs.readFileSync(filePath, 'utf8');
  const isLesson = /^\s*lesson\b/m.test(text);

  if (!isLesson) {
    try {
      const ir = compile(text);
      return NextResponse.json({ file, sceneCount: 1, scene: 1, title: file, ir, mtime });
    } catch (e) {
      const error = e instanceof CompileError ? formatCompileError(text, e) : String(e);
      return NextResponse.json({ file, sceneCount: 1, scene: 1, title: file, error, mtime });
    }
  }

  let scenes: ReturnType<typeof lessonScenes>;
  try {
    scenes = lessonScenes(text);
  } catch (e) {
    const error = e instanceof CompileError ? formatCompileError(text, e) : String(e);
    return NextResponse.json({ file, sceneCount: 0, scene: 1, title: file, error, mtime });
  }

  if (!scenes.length) {
    return NextResponse.json({
      error: 'this lesson has no scenes to preview',
      file,
      sceneCount: 0,
      scene: 1,
      mtime,
    });
  }

  const idx = Math.max(0, Math.min(sceneN - 1, scenes.length - 1));
  const { title, scene, pane } = scenes[idx];

  return NextResponse.json({
    file,
    sceneCount: scenes.length,
    scene: idx + 1,
    title,
    ir: scene,
    pane,
    mtime,
  });
}
