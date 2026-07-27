import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    return NextResponse.json({ ok: false, database: 'unreachable' }, { status: 503 });
  }
  return NextResponse.json({ ok: true, database: 'ok' });
}
