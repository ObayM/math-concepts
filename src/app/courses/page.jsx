import Link from 'next/link';
import { BookOpen, Shapes } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import { courseUrlSlug } from '@/lib/db/courseService';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    where: { status: 'published' },
    orderBy: { createdAt: 'asc' },
    include: {
      _count: { select: { lessons: { where: { status: 'published' } } } },
    },
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--nav-h))] bg-grid-snow text-neutral-800">
      <main className="grow container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-neutral-900">
            Our Courses
          </h1>
          <p className="text-lg text-neutral-500 mt-4 max-w-2xl mx-auto">
            Pretty cool visualized way to understand a wide range of things!
          </p>
        </div>

        <div className="flex flex-wrap justify-center gap-8 max-w-4xl mx-auto">
          {courses.map((course, i) => {
            const isGeometry = course.name.toLowerCase().includes('geometry');
            const lessonCount = course._count.lessons;
            return (
              <Link
                key={course.id}
                href={`/courses/${courseUrlSlug(course)}`}
                className="group block w-full sm:w-[calc(50%-1rem)] animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
              >
                <Card pressable className="h-full p-8">
                  <div className="flex justify-between items-start mb-4">
                    <div
                      className={`rounded-full h-16 w-16 flex items-center justify-center ${
                        isGeometry ? 'bg-accent-100' : 'bg-primary-100'
                      }`}
                    >
                      {isGeometry ? (
                        <Shapes className="h-8 w-8 text-accent-500" />
                      ) : (
                        <BookOpen className="h-8 w-8 text-primary-500" />
                      )}
                    </div>
                    {lessonCount > 0 && (
                      <Badge variant={isGeometry ? 'accent' : 'primary'}>
                        {lessonCount} lesson{lessonCount === 1 ? '' : 's'}
                      </Badge>
                    )}
                  </div>
                  <h3 className="text-2xl font-bold text-neutral-900 mb-3">{course.name}</h3>
                  <p className="text-neutral-500 mb-6">{course.description}</p>
                  <div
                    className={`flex items-center text-sm font-medium group-hover:underline ${
                      isGeometry ? 'text-accent-600' : 'text-primary-600'
                    }`}
                  >
                    View Course &rarr;
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      </main>
    </div>
  );
}
