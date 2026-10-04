import { NextResponse } from 'next/server';
import { assertPermission } from '@/lib/authz';
import { writeTopic } from '@/lib/topic-write';

export async function POST(request) {
  const { ok, status, user } = await assertPermission({ content: ['create', 'publish'] });
  if (!ok) return NextResponse.json({ error: 'Forbidden' }, { status });
  return writeTopic(request, { actor: user, rateKey: user.id });
}
