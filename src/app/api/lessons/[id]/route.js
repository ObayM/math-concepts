import { getLessonById } from '@/lib/db/lessonService';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const lesson = await getLessonById(id);
  if (!lesson) return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  return NextResponse.json(lesson);
}
