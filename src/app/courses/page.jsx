import Link from 'next/link';
import { BookOpen, Shapes } from 'lucide-react';
import { prisma } from '@/lib/prisma';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';

export default async function CoursesPage() {
  const courses = await prisma.course.findMany({
    orderBy: { createdAt: 'asc' },
  });

  return (
    <div className="flex flex-col min-h-[calc(100vh-var(--nav-h))] bg-slate-50 text-gray-800">
      <main className="grow container mx-auto px-6 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Our Courses
          </h1>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
            Pretty cool visualized way to understand a wide range of things!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {courses.map((course, i) => {
            const isGeometry = course.name.toLowerCase().includes('geometry');
            return (
              <Link
                key={course.id}
                href={`/courses/${course.name.toLowerCase()}`}
                className="group block animate-fade-in-up"
                style={{ animationDelay: `${i * 100}ms`, opacity: 0 }}
              >
                <Card className="h-full p-8 transition-colors hover:border-primary-200">
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
                    <Badge variant={isGeometry ? 'accent' : 'primary'}>Available Now</Badge>
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-3">{course.name}</h3>
                  <p className="text-gray-600 mb-6">{course.description}</p>
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
