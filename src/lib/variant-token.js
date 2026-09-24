import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';

const secret = () => process.env.BETTER_AUTH_SECRET || 'mathly-dev-variant-secret';

const sign = (userId, lessonKey, slideId, seed) =>
  createHmac('sha256', secret())
    .update(`${userId}|${lessonKey}|${slideId}|${seed}`)
    .digest('base64url')
    .slice(0, 22);

export function issueVariant(userId, lessonKey, slideId) {
  const seed = randomInt(2 ** 31);
  return `${seed}.${sign(userId, lessonKey, slideId, seed)}`;
}

export function readVariant(token, userId, lessonKey, slideId) {
  if (typeof token !== 'string') return null;
  const [raw, sig] = token.split('.');
  const seed = Number(raw);
  if (!Number.isInteger(seed) || seed < 0 || !sig) return null;
  const want = Buffer.from(sign(userId, lessonKey, slideId, seed));
  const got = Buffer.from(sig);
  if (want.length !== got.length || !timingSafeEqual(want, got)) return null;
  return seed;
}
