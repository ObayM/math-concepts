import { notFound } from 'next/navigation';
import { getLessonById } from '@/lib/db/lessonService';
import LessonEditor from '@/components/admin/editor/LessonEditor';
import { requireAdmin } from '@/lib/authz';

export default async function LessonEditPage({ params }) {
  await requireAdmin();
  const { id } = await params;
  const lesson = await getLessonById(id);
  if (!lesson) notFound();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">{lesson.title ?? lesson.lessonKey}</h1>
      <p className="text-sm text-neutral-500">{lesson.lessonKey}</p>
      <LessonEditor
        lessonId={lesson.id}
        title={lesson.title ?? lesson.lessonKey}
        initialSource={lesson.source}
      />
    </div>
  );
}
