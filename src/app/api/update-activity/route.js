import { requireUser } from '@/lib/session';
import { touchActivity } from '@/lib/db/activityService';
import { NextResponse } from 'next/server';

export async function POST() {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await touchActivity(user.id);
  return NextResponse.json({ success: true });
}
