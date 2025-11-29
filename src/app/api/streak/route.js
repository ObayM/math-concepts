import { createClient } from '@/utils/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
    const supabase = await createClient()

    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
        return NextResponse.json({ error: 'Unauthorized :/' }, { status: 401 })
    }

    const { data: activities, error } = await supabase
        .from('user_daily_activity')
        .select('activity_date')
        .eq('user_id', user.id)
        .order('activity_date', { ascending: false })

    if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let streak = 0
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    const toDateString = (date) => date.toISOString().split('T')[0]
    const todayStr = toDateString(today)
    const yesterdayStr = toDateString(yesterday)


    const hasActivityToday = activities.some(a => a.activity_date === todayStr)
    const hasActivityYesterday = activities.some(a => a.activity_date === yesterdayStr)

    if (!hasActivityToday && !hasActivityYesterday) {
        return NextResponse.json({ streak: 0 })
    }

    let currentDate = hasActivityToday ? today : yesterday

    for (let i = 0; i < activities.length; i++) {
        const activityDate = activities[i].activity_date
        const expectedDateStr = toDateString(currentDate)

        if (activityDate === expectedDateStr) {
            streak++
            currentDate.setDate(currentDate.getDate() - 1)
        } else if (activityDate < expectedDateStr) {

            break
        }

    }

    return NextResponse.json({ streak })
}
