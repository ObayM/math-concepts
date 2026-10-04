import { timingSafeEqual, createHash } from 'node:crypto';
import { writeTopic } from '@/lib/topic-write';

const TOKEN_ACTOR = { id: null, email: 'content-api-token' };

function bearerMatches(given, expected) {
  const digest = (value) =>
    createHash('sha256')
      .update(String(value ?? ''))
      .digest();
  return timingSafeEqual(digest(given), digest(expected));
}

export async function POST(request) {
  const secret = process.env.CONTENT_API_TOKEN;
  if (!secret) {
    return Response.json({ error: 'CONTENT_API_TOKEN is not configured' }, { status: 503 });
  }
  if (!bearerMatches(request.headers.get('authorization'), `Bearer ${secret}`)) {
    return Response.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return writeTopic(request, { actor: TOKEN_ACTOR, rateKey: 'content-api-token' });
}
