import { auth } from '@/lib/auth';
import { toNextJsHandler } from 'better-auth/next-js';

// turbopack's dev-mode analysis does not see a destructured `export const
// { GET, POST }`, so the route silently 404s under `next dev`. explicit
// function exports register in both dev and build.
const handler = toNextJsHandler(auth);

export async function GET(request) {
  return handler.GET(request);
}

export async function POST(request) {
  return handler.POST(request);
}
