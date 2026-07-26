import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/authz';
import { prisma } from '@/lib/prisma';

export async function GET() {
  const { ok, status } = await assertPermission({ content: ['read'] });
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status });

  const lessons = await prisma.lesson.findMany({
    orderBy: { updatedAt: 'desc' },
    select: {
      id: true,
      title: true,
      lessonKey: true,
      status: true,
      course: { select: { name: true } },
    },
  });

  return NextResponse.json({
    lessons: lessons.map((l) => ({
      id: l.id,
      title: l.title ?? l.lessonKey,
      lessonKey: l.lessonKey,
      status: l.status,
      courseName: l.course?.name ?? null,
    })),
  });
}
