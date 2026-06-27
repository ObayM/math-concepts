import { prisma } from '@/lib/prisma';
import { NextResponse } from 'next/server';

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/;

export async function GET(request) {
  const username = request.nextUrl.searchParams.get('username');

  if (!username || !USERNAME_REGEX.test(username)) {
    return NextResponse.json({ available: false });
  }

  const existing = await prisma.user.findFirst({
    where: { username },
    select: { id: true },
  });

  return NextResponse.json({ available: !existing });
}
