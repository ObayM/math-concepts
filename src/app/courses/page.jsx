import Link from 'next/link';
import { BookOpen } from 'lucide-react';


export default function CoursesPage() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-65px)] bg-slate-100 font-sans text-gray-800">
      
      <main className="grow container mx-auto px-6 py-16">

        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900">
            Our Courses
          </h1>
          <p className="text-lg text-gray-600 mt-4 max-w-2xl mx-auto">
           Pretty cool visualized way to understand a wide range of things (algebra as a start)!
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          
          <Link href="/courses/algebra" className="group block">
            <div className="h-full bg-white/60 p-8 border border-gray-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 ease-in-out">
              <div className="flex justify-between items-start mb-4">
                <div className="bg-blue-100 rounded-full h-16 w-16 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-blue-500" />
                </div>
                <span className="bg-blue-100 text-blue-700 text-xs font-semibold px-3 py-1 rounded-full">Available Now</span>
              </div>
              <h3 className="text-2xl font-bold text-gray-900 mb-3">Algebra I</h3>
              <p className="text-gray-600 mb-6">A simple Algebra course</p>
              <div className="flex items-center text-sm font-medium text-blue-600 group-hover:underline">
                View Course &rarr;
              </div>
            </div>
          </Link>
          
        </div>
      </main>

    </div>
  );
}