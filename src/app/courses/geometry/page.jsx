'use client';
import LessonCard from '@/components/lessonCard';
import { geometryLessonsData } from '@/components/lib/data';

export default function LessonsPage() {
    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">

            <div className="absolute inset-0 z-0 opacity-40">
                <div className="absolute top-0 -left-4 w-72 h-72 bg-emerald-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob"></div>
                <div className="absolute top-0 -right-4 w-72 h-72 bg-teal-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute -bottom-8 left-20 w-72 h-72 bg-lime-300 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-blob animation-delay-4000"></div>
            </div>


            <div className="absolute inset-0 z-0 opacity-[0.03]"
                style={{ backgroundImage: 'radial-gradient(#444 1px, transparent 1px)', backgroundSize: '24px 24px' }}
            ></div>

            <main className="relative z-10 container mx-auto px-4 py-16 md:py-24">

                <div className="text-center max-w-3xl mx-auto mb-20">
                    <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold tracking-wide uppercase mb-4">
                        Geometry Course
                    </span>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                        Explore the <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 to-teal-600">Shape of Space</span>
                    </h1>
                    <p className="text-xl text-slate-600 leading-relaxed">
                        Dive into the world of points, lines, and shapes. Master the coordinate plane and visualize geometric concepts like never before.
                    </p>
                </div>


                <div className="relative max-w-5xl mx-auto">

                    <div
                        className="absolute left-1/2 top-0 bottom-0 w-1 bg-linear-to-b from-emerald-500 via-teal-500 to-slate-200 -translate-x-1/2 rounded-full"
                        aria-hidden="true"
                    ></div>

                    <div className="space-y-24 py-12">
                        {geometryLessonsData.map((lesson, index) => (
                            <LessonCard
                                key={lesson.id}
                                lesson={lesson}
                                index={index}
                            />
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
