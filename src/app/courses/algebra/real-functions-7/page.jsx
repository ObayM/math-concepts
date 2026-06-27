import { prisma } from '@/lib/prisma';
import LessonTemplateNew from '../LessonTemplateNew';

export default async function LessonPage() {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey: 'real-functions-7' },
    select: { data: true },
  });

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Lesson not found</h1>
          <p className="text-slate-600 mb-6">
            Sorry, we couldn&apos;t load this lesson. Please try again later.
          </p>
          <a
            href="/courses/algebra"
            className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Return to Algebra
          </a>
        </div>
      </div>
    );
  }

  return <LessonTemplateNew lessonData={lesson.data} lessonId="real-functions-7" />;
}
