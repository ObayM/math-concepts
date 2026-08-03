import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { exportWarmupCsv } from '@/lib/db/warmupService';

export async function GET(request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'warmup-export');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const scope =
    new URL(request.url).searchParams.get('scope') === 'answers' ? 'answers' : 'sessions';
  const csv = await exportWarmupCsv(user.id, scope);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="mathly-warmup-${scope}.csv"`,
      'Cache-Control': 'no-store',
    },
  });
}
