import { requireUser } from '@/lib/session';
import { getStreak } from '@/lib/db/activityService';
import { NextResponse } from 'next/server';

export async function GET() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const streak = await getStreak(user.id);
  return NextResponse.json({ streak });
}
