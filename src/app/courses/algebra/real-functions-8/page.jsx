import { createClient } from '@/utils/supabase/server'
import LessonTemplateNew from '../LessonTemplateNew'

export default async function Page() {
    const supabase = await createClient()
    const { data: lesson, error } = await supabase
        .from('lessons')
        .select('data')
        .eq('lesson_key', 'real-functions-8')
        .single()

  if (error || !lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
        <div className="bg-white p-8 rounded-xl shadow-lg text-center max-w-md">
          <h1 className="text-2xl font-bold text-red-600 mb-4">An error happened!</h1>
          <p className="text-slate-600 mb-6">
            Sorry we couldn't load the lesson data for now, please try again later!
          </p>
          {error && <p className="text-xs text-red-400 font-mono bg-red-50 p-2 rounded mb-4">{error.message}</p>}
          <a href="/courses/algebra" className="inline-block bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
            Return back :/
          </a>
        </div>
      </div>
    )
  }

    return <LessonTemplateNew initialSlides={lesson.data} lessonId={'real-functions-8'} />
}
