import { timingSafeEqual, createHash } from 'node:crypto';

import { pruneLessonEvents } from '@/lib/db/eventService';

function bearerMatches(given, expected) {
  const digest = (value) =>
    createHash('sha256')
      .update(String(value ?? ''))
      .digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: 'CRON_SECRET is not configured' }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get('authorization'), `Bearer ${secret}`)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const pruned = await pruneLessonEvents();
  return Response.json({ pruned });
}
