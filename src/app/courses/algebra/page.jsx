import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import LessonCard from "@/components/lessonCard";

export default async function AlgebraCourse() {
  const session = await auth.api.getSession({ headers: await headers() });

  let progressMap = new Map();
  if (session?.user) {
    const progressData = await prisma.userLessonProgress.findMany({
      where: { userId: session.user.id },
      select: {
        completed: true,
        currentStep: true,
        lesson: { select: { lessonKey: true } },
      },
    });
    progressData.forEach((p) => {
      progressMap.set(p.lesson.lessonKey, {
        is_completed: p.completed,
        current_step: p.currentStep,
      });
    });
  }

  const lessons = await prisma.lesson.findMany({
    where: { category: "Algebra" },
    orderBy: { sortOrder: "asc" },
  });

  const lessonsWithProgress = lessons.map((lesson, index) => {
    const progress = progressMap.get(lesson.lessonKey);
    const isCompleted = progress?.is_completed;
    const isStarted = (progress?.current_step ?? 0) > 0;

    let status = "locked";
    if (isCompleted) {
      status = "completed";
    } else if (index === 0) {
      status = "unlocked";
    } else {
      const prevKey = lessons[index - 1].lessonKey;
      if (progressMap.get(prevKey)?.is_completed) status = "unlocked";
    }
    if (status === "locked" && isStarted) status = "unlocked";

    return { ...lesson, id: lesson.lessonKey, status };
  });

  return (
    <div className="min-h-screen bg-slate-50 relative overflow-hidden">
      <main className="relative z-10 container mx-auto px-4 py-16 md:py-24">
        <div className="text-center max-w-3xl mx-auto mb-20">
          <span className="inline-block py-1 px-3 rounded-full bg-blue-100 text-blue-700 text-sm font-bold tracking-wide uppercase mb-4">
            Algebra Course
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Learn the{" "}
            <span className="text-transparent bg-clip-text bg-linear-to-r from-blue-600 to-sky-600">
              Fundamentals
            </span>
          </h1>
          <p className="text-xl text-slate-600 leading-relaxed">
            A structured journey through algebraic concepts. Complete each
            lesson to unlock the next challenge and build your mathematical
            intuition.
          </p>
        </div>

        <div className="relative max-w-5xl mx-auto">
          <div
            className="absolute left-1/2 top-0 bottom-0 w-1 bg-linear-to-b from-blue-500 via-purple-500 to-slate-200 -translate-x-1/2 rounded-full"
            aria-hidden="true"
          />
          <div className="space-y-24 py-12">
            {lessonsWithProgress.map((lesson) => (
              <LessonCard key={lesson.id} lesson={lesson} />
            ))}
          </div>
          <div className="relative z-10 flex justify-center mt-12">
            <div className="px-6 py-3 bg-white rounded-full shadow-md border border-slate-200 text-slate-500 text-sm font-medium">
              More lessons coming soon...
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
