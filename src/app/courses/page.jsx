import Link from 'next/link';
import { BookOpen, ArrowRight } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { courseUrlSlug } from '@/lib/db/courseService';
import Card from '@/components/ui/Card';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: 'published' },
    orderBy: { sortOrder: 'asc' },
    include: {
      _count: { select: { lessons: { where: { status: 'published' } } } },
    },
  });

  const lessonUnits = await prisma.lesson.findMany({
    where: { courseId: { in: courses.map((c) => c.id) }, status: 'published' },
    select: { courseId: true, unit: true },
  });
  const unitsByCourse = new Map();
  for (const l of lessonUnits) {
    if (!l.unit) continue;
    const set = unitsByCourse.get(l.courseId) ?? new Set();
    set.add(l.unit);
    unitsByCourse.set(l.courseId, set);
  }

  return (
    <div className="bg-app -mt-[var(--nav-h)] min-h-screen pt-[var(--nav-h)]">
      <main className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16">
        <header className="animate-fade-in-up">
          <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900 sm:text-5xl">
            Our courses
          </h1>
          <p className="mt-3 text-lg text-neutral-500">
            Visual, interactive tracks that make the math actually click.
          </p>
        </header>

        <div className="mt-10 space-y-4">
          {courses.map((course, i) => {
            const lessonCount = course._count.lessons;
            const unitCount = unitsByCourse.get(course.id)?.size ?? 0;
            const meta = [
              lessonCount ? `${lessonCount} lesson${lessonCount === 1 ? '' : 's'}` : null,
              unitCount ? `${unitCount} unit${unitCount === 1 ? '' : 's'}` : null,
            ]
              .filter(Boolean)
              .join(' · ');

            return (
              <Link
                key={course.id}
                href={`/courses/${courseUrlSlug(course)}`}
                className="group block animate-fade-in-up opacity-0"
                style={{ animationDelay: `${80 + i * 80}ms` }}
              >
                <Card className="card-soft flex items-center gap-5 p-6 transition-colors hover:border-primary-200 sm:p-7">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                    <BookOpen className="h-7 w-7" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-2xl font-bold text-neutral-900">
                      {course.name}
                    </h2>
                    {course.description && (
                      <p className="mt-1 text-neutral-500 line-clamp-2">{course.description}</p>
                    )}
                    {meta && (
                      <p className="mt-2 text-xs font-bold uppercase tracking-[0.12em] text-neutral-400">
                        {meta}
                      </p>
                    )}
                  </div>
                  <ArrowRight className="hidden h-5 w-5 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-500 sm:block" />
                </Card>
              </Link>
            );
          })}

          {courses.length === 0 && (
            <Card className="card-soft p-8 text-center">
              <p className="text-neutral-400">No courses published yet. Check back soon.</p>
            </Card>
          )}
        </div>

        {courses.length > 0 && (
          <p className="mt-8 text-sm text-neutral-400">More tracks coming soon.</p>
        )}
      </main>
    </div>
  );
}
