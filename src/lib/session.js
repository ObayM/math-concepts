import { auth } from '@/lib/auth';
import { headers } from 'next/headers';

export async function requireUser() {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
}

export async function refreshSessionCache() {
  try {
    await auth.api.getSession({
      headers: await headers(),
      query: { disableCookieCache: true },
    });
  } catch (err) {
    console.error('could not refresh the cached session', err);
  }
}
