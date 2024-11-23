import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request, { params }) {
    const { id } = await params
    const supabase = await createClient()

    const { data: course, error } = await supabase
        .from('courses')
        .select('*')
        .eq('id', id)
        .single()

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(course)
}
