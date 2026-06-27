import { requireUser } from '@/lib/session';
import { getActivityHeatmap } from '@/lib/db/activityService';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const activity = await getActivityHeatmap(user.id);
  return NextResponse.json({ activity });
}
