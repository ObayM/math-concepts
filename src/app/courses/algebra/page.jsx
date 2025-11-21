import LessonCard from '@/components/lessonCard';
import { lessonsData } from '@/components/lib/data';

export default function LessonsPage() {
  return (
    <div className="min-h-[calc(100vh-73px)] bg-neutral-50 text-gray-800 overflow-hidden">
      <main className="container mx-auto px-6 py-12">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Your Learning Path
          </h1>
          <p className="mt-4 text-lg text-gray-600">
            Complete lessons to unlock the next steps on your journey.
          </p>
        </div>


        <div className="relative max-w-2xl mx-auto">

          <div 
            className="absolute left-1/2 top-14 bottom-14 -ml-0.5 w-1 bg-gray-200" 
            aria-hidden="true"
          ></div>

          <div className="space-y-12">
            {lessonsData.map((lesson, index) => (
              <div
                key={lesson.id}
                className={`relative flex items-center ${
                  index % 2 === 0 ? 'justify-start' : 'justify-end'
                }`}
              >

                <div className={`${index % 2 === 0 ? 'pr-8 md:pr-16' : 'pl-8 md:pl-16'}`}>
                  <LessonCard lesson={lesson} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}