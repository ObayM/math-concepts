import type { APIRequestContext, BrowserContext } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
export const PASSWORD = 'e2e-password-123';

// sign-in and sign-up are rate limited on purpose (src/lib/auth.js). space the
// suite's auth calls out rather than weakening the limit for tests.
const AUTH_GAP_MS = 2_500;
let authChain: Promise<unknown> = Promise.resolve();

export function throttleAuth<T>(fn: () => Promise<T>): Promise<T> {
  const next = authChain.then(async () => {
    const result = await fn();
    await new Promise((r) => setTimeout(r, AUTH_GAP_MS));
    return result;
  });
  authChain = next.catch(() => {});
  return next as Promise<T>;
}

export async function createUser(
  request: APIRequestContext,
  baseURL: string,
  email: string,
  role = 'student'
) {
  await throttleAuth(() =>
    request.post(`${baseURL}/api/auth/sign-up/email`, {
      data: { email, password: PASSWORD, name: 'E2E User' },
      headers: { origin: baseURL },
    })
  );
  const username = `e${Math.random().toString(36).slice(2, 10)}`;
  await prisma.user.update({
    where: { email },
    data: { emailVerified: true, role, username, displayUsername: username },
  });
  return { email, username };
}

// better-auth rate limits sign-in in production, so a suite that logs in through
// the UI for every test runs itself out of budget. only the auth journey spec
// exercises the real form; everything else takes its cookie from the API once.
export async function authenticate(
  context: BrowserContext,
  request: APIRequestContext,
  baseURL: string,
  email: string
) {
  const cached = cookieCache.get(email);
  const res =
    cached ??
    (await throttleAuth(() =>
      request.post(`${baseURL}/api/auth/sign-in/email`, {
        data: { email, password: PASSWORD },
        headers: { origin: baseURL },
      })
    ));
  cookieCache.set(email, res);
  if (!res.ok()) throw new Error(`sign-in failed (${res.status()}): ${await res.text()}`);

  const setCookie = res.headersArray().filter((h) => h.name.toLowerCase() === 'set-cookie');
  const url = new URL(baseURL);
  await context.addCookies(
    setCookie.map((h) => {
      const [pair] = h.value.split(';');
      const eq = pair.indexOf('=');
      return {
        name: pair.slice(0, eq).trim(),
        value: pair.slice(eq + 1).trim(),
        domain: url.hostname,
        path: '/',
      };
    })
  );
}

// one sign-in per user for the whole file, reused across its tests
const cookieCache = new Map<string, Awaited<ReturnType<APIRequestContext['post']>>>();

export async function disconnect() {
  await prisma.$disconnect();
}

export { prisma };
