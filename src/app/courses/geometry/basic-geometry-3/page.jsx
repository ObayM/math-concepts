import { prisma } from "@/lib/prisma";
import LessonTemplateNew from "../../algebra/LessonTemplateNew";

export default async function LessonPage() {
  const lesson = await prisma.lesson.findUnique({
    where: { lessonKey: "geometry-basic-3" },
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
          <a href="/courses/geometry" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Return to Geometry
          </a>
        </div>
      </div>
    );
  }

  return <LessonTemplateNew lessonData={lesson.data} lessonId="geometry-basic-3" />;
}
