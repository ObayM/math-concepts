import { createClient } from '@/utils/supabase/server';
import LessonCard from '@/components/lessonCard';

export default async function GeometryCourse() {
    const supabase = await createClient();


    const { data: { user } } = await supabase.auth.getUser();
    
    let progressMap = new Map();

    if (user) {
        const { data: progressData } = await supabase
            .from('user_lesson_progress')
            .select('lesson_id, completed, current_step, lessons(lesson_key)')
            .eq('user_id', user.id);

        if (progressData) {
            progressData.forEach(p => {
                if (p.lessons) {
                    progressMap.set(p.lessons.lesson_key, {
                        is_completed: p.completed,
                        current_step: p.current_step
                    });
                }
            });
        }
    }


    const { data: lessons } = await supabase
        .from('lessons')
        .select('*')
        .eq('category', 'Geometry')
        .order('sort_order', { ascending: true });

    const lessonsWithProgress = (lessons || []).map((lesson, index) => {
        const progress = progressMap.get(lesson.lesson_key);
        let status = 'locked';

        const isCompleted = progress?.is_completed;
        const isStarted = progress?.current_step > 0;

        if (isCompleted) {
            status = 'completed';
        } else if (index === 0) {
            status = 'unlocked';
        } else {

            const prevLessonKey = (lessons || [])[index - 1].lesson_key;
            const prevProgress = progressMap.get(prevLessonKey);
            if (prevProgress?.is_completed) {
                status = 'unlocked';
            }
        }


        if (status === 'locked' && isStarted) {
            status = 'unlocked';
        }

        return {
            ...lesson,
            id: lesson.lesson_key,
            status
        };
    });

    return (
        <div className="min-h-screen bg-slate-50 relative overflow-hidden">

            <main className="relative z-10 container mx-auto px-4 py-16 md:py-24">

                <div className="text-center max-w-3xl mx-auto mb-20">
                    <span className="inline-block py-1 px-3 rounded-full bg-emerald-100 text-emerald-700 text-sm font-bold tracking-wide uppercase mb-4">
                        Geometry Course
                    </span>
                    <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
                        Explore the <span className="text-transparent bg-clip-text bg-linear-to-r from-emerald-600 to-teal-600">Shape of Space</span>
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
                    {lessonsWithProgress.map((lesson) => (
                        <LessonCard key={lesson.id} lesson={lesson} />
                    ))}
                    </div>

                </div>

                 <div className="relative z-10 flex justify-center mt-12">
                        <div className="px-6 py-3 bg-white rounded-full shadow-md border border-slate-200 text-slate-500 text-sm font-medium">
                            More lessons coming soon...
                        </div>
                </div>

            </main>
        </div>
    );
}
