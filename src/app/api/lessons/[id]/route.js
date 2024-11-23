import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: lesson, error } = await supabase
        .from('lessons')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(lesson)
}
