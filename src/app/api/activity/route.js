import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized :/' }, { status: 401 })
    }

    const oneYearAgo = new Date()
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1)
    const oneYearAgoStr = oneYearAgo.toISOString().split('T')[0]

    const { data: activities, error } = await supabase
        .from('user_daily_activity')
        .select('activity_date')
        .eq('user_id', user.id)
        .gte('activity_date', oneYearAgoStr)
        .order('activity_date', { ascending: true })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    
    const activityMap = activities.map(a => ({
        date: a.activity_date,
        count: 1
    }))

    return NextResponse.json({ activity: activityMap })
}
