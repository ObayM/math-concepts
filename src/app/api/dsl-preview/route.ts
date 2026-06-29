import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { compile, CompileError } from '@/engine/lang';

const LESSONS_DIR = path.resolve(process.cwd(), 'prisma/lessons');

function extractScenes(text: string) {
  const scenes: { title: string; src: string }[] = [];
  let i = 0;
  const lines = text.split('\n');
  while (i < lines.length) {
    if (lines[i].startsWith('@scene')) {
      const m = lines[i].match(/title="([^"]+)"/);
      const title = m ? m[1] : `Scene ${scenes.length + 1}`;
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

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const file = searchParams.get('file') ?? '';
  const sceneN = parseInt(searchParams.get('scene') ?? '1', 10);

  if (!file.endsWith('.dsl') || file.includes('/') || file.includes('..')) {
    return NextResponse.json({ error: 'invalid filename' }, { status: 400 });
  }

  const filePath = path.join(LESSONS_DIR, file);
  if (!fs.existsSync(filePath)) {
    return NextResponse.json({ error: `not found: ${file}` }, { status: 404 });
  }

  const stat = fs.statSync(filePath);
  const mtime = stat.mtimeMs;
  const text = fs.readFileSync(filePath, 'utf8');
  const isLesson = text.includes('@scene');

  if (!isLesson) {
    try {
      const ir = compile(text);
      return NextResponse.json({ file, sceneCount: 1, scene: 1, title: file, ir, mtime });
    } catch (e) {
      const error = e instanceof CompileError ? e.message : String(e);
      return NextResponse.json({ file, sceneCount: 1, scene: 1, title: file, error, mtime });
    }
  }

  const scenes = extractScenes(text);
  if (!scenes.length) {
    return NextResponse.json({
      error: 'no @scene blocks found',
      file,
      sceneCount: 0,
      scene: 1,
      mtime,
    });
  }

  const idx = Math.max(0, Math.min(sceneN - 1, scenes.length - 1));
  const { title, src } = scenes[idx];

  try {
    const ir = compile(src);
    return NextResponse.json({ file, sceneCount: scenes.length, scene: idx + 1, title, ir, mtime });
  } catch (e) {
    const error = e instanceof CompileError ? e.message : String(e);
    return NextResponse.json({
      file,
      sceneCount: scenes.length,
      scene: idx + 1,
      title,
      error,
      mtime,
    });
  }
}
