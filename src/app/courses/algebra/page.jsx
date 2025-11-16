import LessonCard from '@/components/lessonCard';
import { lessonsData } from '@/components/lib/data';

export default function ConceptsPage() {
  return (
    <div className="min-h-[calc(100vh-65px)] bg-slate-50 text-gray-800">

      <main className="container mx-auto px-6 py-12">

        <div className="text-center mb-12">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Explore cool concepts
          </h1>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {lessonsData.map((lesson) => (
            <LessonCard key={lesson.id} lesson={lesson} />
          ))}
        </div>
      </main>
    </div>
  );
}