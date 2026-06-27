import { getCourseById } from '@/lib/db/courseService';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  const { id } = await params;
  const course = await getCourseById(id);
  if (!course) return NextResponse.json({ error: 'Course not found' }, { status: 404 });
  return NextResponse.json(course);
}
