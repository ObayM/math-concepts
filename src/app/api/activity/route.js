import { requireUser } from '@/lib/session';
import { getActivityHeatmap, getStreak, touchActivity } from '@/lib/db/activityService';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [heatmap, streak] = await Promise.all([getActivityHeatmap(user.id), getStreak(user.id)]);
  return NextResponse.json({ heatmap, streak });
}

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await touchActivity(user.id);
  return NextResponse.json({ success: true });
}
