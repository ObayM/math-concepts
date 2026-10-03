import Link from 'next/link';
import { notFound } from 'next/navigation';
import { lessonSchema } from '@/engine/ir/lesson';
import LessonPlayer from '@/components/lesson/LessonPlayer';
import { MathNotationProvider } from '@/engine/artex/context';
import { getLessonById } from '@/lib/db/lessonService';
import { requireAdmin } from '@/lib/authz';
import { getMasteryFor } from '@/lib/db/progressService';
import { skippableChecks } from '@/lib/prerequisites';
import { DEFAULT_LOCALE, dirFor, isLocale } from '@/lib/locale';

// preview resolves by id, not by key plus language. the cms always runs on the
// english host, so a key lookup would refuse every arabic draft.
export default async function LessonPreviewPage({ params, searchParams }) {
  const admin = await requireAdmin();
  const { id } = await params;
  const { published } = await searchParams;

  const lesson = await getLessonById(id);
  if (!lesson) notFound();

  const ir = published === '1' ? lesson.publishedData : lesson.data;
  const parsed = lessonSchema.safeParse(ir);
  if (!parsed.success) return <PreviewProblem lesson={lesson} />;
  if (!parsed.data.slides.some((slide) => !slide.hidden)) {
    return <PreviewProblem lesson={lesson} />;
  }

  const course = lesson.courseId ? await courseLang(lesson.courseId) : null;
  const lang = isLocale(course) ? course : DEFAULT_LOCALE;
  const mastery = await getMasteryFor(admin?.id, parsed.data.requires);
  const skipTo = skippableChecks(parsed.data.slides, parsed.data.requires, mastery);

  return (
    <div lang={lang} dir={dirFor(lang)}>
      <MathNotationProvider notation={lang === 'ar' ? 'ar' : 'latin'}>
        <LessonPlayer
          slides={parsed.data.slides}
          lessonId={lesson.lessonKey}
          coursePath={`admin/content`}
          nextLessonId={null}
          skipTo={skipTo}
        />
      </MathNotationProvider>
    </div>
  );
}

async function courseLang(courseId) {
  const { prisma } = await import('@/lib/prisma');
  const course = await prisma.course.findUnique({
    where: { id: courseId },
    select: { lang: true },
  });
  return course?.lang ?? null;
}

function PreviewProblem({ lesson }) {
  return (
    <div className="border border-neutral-300 bg-card p-6">
      <h1 className="text-lg font-bold text-neutral-900">This draft will not render</h1>
      <p className="mt-2 text-sm text-neutral-600">
        {lesson.lessonKey} compiled, but the stored IR does not match the schema, or every slide in
        it is hidden. Open the editor and check the Problems panel.
      </p>
      <Link
        href={`/admin/content/lessons/${lesson.id}/edit`}
        className="mt-4 inline-block text-sm underline"
      >
        Back to the editor
      </Link>
    </div>
  );
}
