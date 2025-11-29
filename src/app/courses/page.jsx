import Link from 'next/link';
import { BookOpen, Shapes } from 'lucide-react';
import { createClient } from '@/utils/supabase/server';

export default async function CoursesPage() {

  const supabase = await createClient();
  
  const { data: courses } = await supabase.from('courses').select('*').order('created_at', { ascending: true });

  const getIcon = (name) => {
    if (name.toLowerCase().includes('geometry')) return <Shapes className="h-8 w-8 text-purple-500" />;
    return <BookOpen className="h-8 w-8 text-blue-500" />;
  };

  const getColor = (name) => {
    if (name.toLowerCase().includes('geometry')) return 'bg-purple-100 text-purple-700';
    return 'bg-blue-100 text-blue-700';
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-73px)] bg-sky-50 text-gray-800">

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

          {courses?.map((course) => (
            <Link key={course.id} href={`/courses/${course.name.toLowerCase()}`} className="group block">
              <div className="h-full bg-white/60 p-8 border border-gray-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out">
                <div className="flex justify-between items-start mb-4">
                  <div className={`rounded-full h-16 w-16 flex items-center justify-center ${course.name.toLowerCase().includes('geometry') ? 'bg-purple-100' : 'bg-blue-100'}`}>
                    {getIcon(course.name)}
                  </div>
                  <span className={`text-xs font-semibold px-3 py-1 rounded-full ${getColor(course.name)}`}>Available Now</span>
                </div>
                <h3 className="text-2xl font-bold text-gray-900 mb-3">{course.name}</h3>
                <p className="text-gray-600 mb-6">{course.description}</p>
                <div className={`flex items-center text-sm font-medium group-hover:underline ${course.name.toLowerCase().includes('geometry') ? 'text-purple-600' : 'text-blue-600'}`}>
                  View Course &rarr;
                </div>
              </div>
            </Link>
          ))}

        </div>
      </main>

    </div>
  );
}