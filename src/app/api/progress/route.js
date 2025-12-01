import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request) {

    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const { lessonKey, currentStep, isCompleted } = await request.json()

        if (!lessonKey) {
            return NextResponse.json({ error: 'Lesson Key is required :(' }, { status: 400 })
        }


        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select('id')
            .eq('lesson_key', lessonKey)
            .single()

        if (lessonError || !lesson) {
            return NextResponse.json({ error: 'Lesson not found :(' }, { status: 404 })
        }


        const updateData = {
            user_id: user.id,
            lesson_id: lesson.id,
            current_step: currentStep,
            last_played_at: new Date().toISOString(),
        }

        if (isCompleted) {
            updateData.completed = true
            updateData.completed_at = new Date().toISOString()
        }

        const { error: progressError } = await supabase
            .from('user_lesson_progress')
            .upsert(updateData, { onConflict: 'user_id, lesson_id' })

        if (progressError) {
            throw progressError
        }

        return NextResponse.json({ success: true })
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}

export async function GET(request) {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const lessonKey = searchParams.get('lessonKey')

    if (!lessonKey) {
        return NextResponse.json({ error: 'Lesson Key is required :(' }, { status: 400 })
    }

    try {

        const { data: lesson, error: lessonError } = await supabase
            .from('lessons')
            .select('id')
            .eq('lesson_key', lessonKey)
            .single()

        if (lessonError || !lesson) {

            return NextResponse.json({ currentStep: 0, completed: false })
        }


        const { data: progress, error: progressError } = await supabase
            .from('user_lesson_progress')
            .select('current_step, completed')
            .eq('user_id', user.id)
            .eq('lesson_id', lesson.id)
            .single()

        if (progressError && progressError.code !== 'PGRST116') { 
            // fyi PGRST116 = "no rows returned"
            throw progressError
        }

        return NextResponse.json({
            currentStep: progress?.current_step || 0,
            completed: progress?.completed || false
        })

    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }
}
