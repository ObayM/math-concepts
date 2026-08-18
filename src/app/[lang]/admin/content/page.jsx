import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import Button from '@/components/admin/ui/Button';
import Input from '@/components/admin/ui/Input';
import CourseHeaderRow from '@/components/admin/CourseHeaderRow';
import DeleteWithImpact from '@/components/admin/DeleteWithImpact';
import PublishLessonButton from '@/components/admin/PublishLessonButton';
import { requireAdmin } from '@/lib/authz';
import {
  createCourseAction,
  createLessonAction,
  deleteCourseAction,
  deleteLessonAction,
  moveCourseAction,
  moveLessonAction,
  moveLessonToCourseAction,
  publishCourseAction,
  publishLessonAction,
  unpublishCourseAction,
  unpublishLessonAction,
  updateCourseAction,
} from './actions';

const LESSON_SELECT = {
  id: true,
  lessonKey: true,
  title: true,
  status: true,
  unit: true,
  difficulty: true,
  iconName: true,
  description: true,
  updatedAt: true,
  author: { select: { email: true } },
  _count: { select: { attempts: true, progress: true } },
};

function missingMetadata(lesson) {
  return ['unit', 'difficulty', 'iconName', 'description'].filter((k) => !lesson[k]);
}

function LessonRow({ lesson, courses }) {
  const gaps = missingMetadata(lesson);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3 py-3">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-neutral-800">{lesson.title ?? lesson.lessonKey}</span>
          <Badge variant={lesson.status === 'published' ? 'success' : 'neutral'}>
            {lesson.status}
          </Badge>
          {gaps.length > 0 && (
            <span
              title={`Missing in the lesson source: ${gaps.join(', ')}`}
              className="text-warning-600"
            >
              ●
            </span>
          )}
        </div>
        <p className="mt-0.5 text-xs text-neutral-400">
          {lesson.unit ?? 'no unit'} · {lesson.difficulty ?? 'no difficulty'} ·{' '}
          {lesson._count.attempts} attempts · edited {lesson.updatedAt.toISOString().slice(0, 10)}
          {lesson.author?.email ? ` by ${lesson.author.email}` : ''}
        </p>
      </div>

      <div className="flex flex-wrap items-start gap-2">
        <div className="flex">
          {['up', 'down'].map((direction) => (
            <form key={direction} action={moveLessonAction}>
              <input type="hidden" name="id" value={lesson.id} />
              <input type="hidden" name="direction" value={direction} />
              <button
                type="submit"
                aria-label={`Move ${direction}`}
                className="border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
              >
                {direction === 'up' ? '▲' : '▼'}
              </button>
            </form>
          ))}
        </div>

        {courses.length > 1 && (
          <form action={moveLessonToCourseAction} className="flex items-center gap-1">
            <input type="hidden" name="id" value={lesson.id} />
            <select
              name="courseId"
              defaultValue=""
              aria-label="Move to course"
              className="border border-neutral-300 bg-white px-2 py-1 text-xs"
            >
              <option value="" disabled>
                Move to…
              </option>
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <Button type="submit" variant="outline" size="sm">
              Go
            </Button>
          </form>
        )}

        <Link href={`/admin/content/lessons/${lesson.id}/edit`}>
          <Button variant="secondary" size="sm">
            Edit
          </Button>
        </Link>

        <Link href={`/admin/preview/${lesson.id}`}>
          <Button variant="outline" size="sm">
            Preview
          </Button>
        </Link>

        {lesson.status === 'published' ? (
          <form action={unpublishLessonAction}>
            <input type="hidden" name="id" value={lesson.id} />
            <Button type="submit" variant="outline" size="sm">
              Unpublish
            </Button>
          </form>
        ) : (
          <PublishLessonButton lessonId={lesson.id} action={publishLessonAction} />
        )}

        <DeleteWithImpact
          id={lesson.id}
          action={deleteLessonAction}
          label={lesson.title ?? lesson.lessonKey}
        />
      </div>
    </div>
  );
}

export default async function AdminContentPage({ searchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const q = params?.q?.trim() || '';

  const where = q
    ? {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { lessonKey: { contains: q, mode: 'insensitive' } },
        ],
      }
    : {};

  const [courses, orphans] = await Promise.all([
    prisma.course.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { lessons: { where, orderBy: { sortOrder: 'asc' }, select: LESSON_SELECT } },
    }),
    prisma.lesson.findMany({
      where: { courseId: null, ...where },
      orderBy: { sortOrder: 'asc' },
      select: LESSON_SELECT,
    }),
  ]);

  const courseOptions = courses.map((c) => ({ id: c.id, name: c.name }));

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">Content</h1>
        <form method="get" className="flex gap-2">
          <Input name="q" defaultValue={q} placeholder="Search lessons" className="w-56" />
          <Button type="submit" size="sm">
            Search
          </Button>
          {q && (
            <Link href="/admin/content" className="py-1.5 text-sm font-semibold text-primary-700">
              Clear
            </Link>
          )}
        </form>
      </div>

      <Card className="mt-6 p-5">
        <h2 className="text-sm font-bold text-neutral-700">New course</h2>
        <form action={createCourseAction} className="mt-3 flex flex-wrap gap-2">
          <Input name="name" placeholder="Course name" required />
          <Input
            name="description"
            placeholder="Description (optional)"
            className="min-w-[220px] flex-1"
          />
          <Button type="submit" size="sm">
            Create course
          </Button>
        </form>
      </Card>

      <div className="mt-8 space-y-8">
        {courses.map((course) => (
          <Card key={course.id} className="p-5">
            <CourseHeaderRow
              course={course}
              updateAction={updateCourseAction}
              publishAction={publishCourseAction}
              unpublishAction={unpublishCourseAction}
              moveAction={moveCourseAction}
            >
              <DeleteWithImpact
                id={course.id}
                action={deleteCourseAction}
                label={course.name}
                noun="course"
              />
            </CourseHeaderRow>

            <div className="mt-4 divide-y divide-neutral-100">
              {course.lessons.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} courses={courseOptions} />
              ))}
              {course.lessons.length === 0 && (
                <p className="py-3 text-sm text-neutral-400">
                  {q ? 'No lessons match that search.' : 'No lessons yet.'}
                </p>
              )}
            </div>

            <form action={createLessonAction} className="mt-4 flex gap-2">
              <input type="hidden" name="courseId" value={course.id} />
              <Input name="title" placeholder="New lesson title" required className="flex-1" />
              <Button type="submit" size="sm">
                New lesson
              </Button>
            </form>
          </Card>
        ))}

        {orphans.length > 0 && (
          <Card className="border-warning-500 p-5">
            <h2 className="text-lg font-bold text-neutral-900">Unassigned</h2>
            <p className="mt-1 text-sm text-neutral-500">
              These lessons belong to no course, so no student can reach them. Move them somewhere
              or delete them.
            </p>
            <div className="mt-4 divide-y divide-neutral-100">
              {orphans.map((lesson) => (
                <LessonRow key={lesson.id} lesson={lesson} courses={courseOptions} />
              ))}
            </div>
          </Card>
        )}
      </div>
    </div>
  );
}
