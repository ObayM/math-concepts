import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import Button from '@/components/admin/ui/Button';
import Input from '@/components/admin/ui/Input';
import ConfirmSubmitButton from '@/components/admin/ConfirmSubmitButton';
import PublishLessonButton from '@/components/admin/PublishLessonButton';
import {
  createCourseAction,
  createLessonAction,
  publishLessonAction,
  unpublishLessonAction,
  deleteLessonAction,
  deleteCourseAction,
} from './actions';

export default async function AdminContentPage() {
  const courses = await prisma.course.findMany({
    orderBy: { sortOrder: 'asc' },
    include: { lessons: { orderBy: { sortOrder: 'asc' } } },
  });

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Content</h1>

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
            <div className="flex items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-neutral-900">{course.name}</h2>
                  <Badge variant={course.status === 'published' ? 'success' : 'neutral'}>
                    {course.status}
                  </Badge>
                </div>
                {course.description && (
                  <p className="text-sm text-neutral-500">{course.description}</p>
                )}
              </div>
              <form action={deleteCourseAction}>
                <input type="hidden" name="id" value={course.id} />
                <ConfirmSubmitButton
                  confirmText={`Delete "${course.name}" and all its lessons? This cannot be undone.`}
                  variant="ghost"
                  size="sm"
                >
                  Delete course
                </ConfirmSubmitButton>
              </form>
            </div>

            <div className="mt-4 divide-y divide-neutral-100">
              {course.lessons.map((lesson) => (
                <div key={lesson.id} className="flex items-center justify-between gap-3 py-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-neutral-800">
                      {lesson.title ?? lesson.lessonKey}
                    </span>
                    <Badge variant={lesson.status === 'published' ? 'success' : 'neutral'}>
                      {lesson.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/content/lessons/${lesson.id}/edit`}>
                      <Button variant="secondary" size="sm">
                        Edit
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
                    <form action={deleteLessonAction}>
                      <input type="hidden" name="id" value={lesson.id} />
                      <ConfirmSubmitButton
                        confirmText={`Delete "${lesson.title ?? lesson.lessonKey}"? Student progress on it will be lost.`}
                        variant="ghost"
                        size="sm"
                      >
                        Delete
                      </ConfirmSubmitButton>
                    </form>
                  </div>
                </div>
              ))}
              {course.lessons.length === 0 && (
                <p className="py-3 text-sm text-neutral-400">No lessons yet.</p>
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
      </div>
    </div>
  );
}
