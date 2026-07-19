type Bucket = { tokens: number; last: number };
const store = new Map<string, Bucket>();

const LIMITS = {
  chat: { max: 20, perMin: 20 },
  generate: { max: 5, perMin: 5 },
  'generate-lesson': { max: 2, perMin: 2 },
  'content-save': { max: 30, perMin: 30 },
  practice: { max: 60, perMin: 60 },
  progress: { max: 60, perMin: 60 },
} as const;

export function consume(key: string, tier: keyof typeof LIMITS): boolean {
  const { max, perMin } = LIMITS[tier];
  const bucketKey = `${tier}:${key}`;
  const now = Date.now();
  const b = store.get(bucketKey) ?? { tokens: max, last: now };
  const refilled = Math.min(max, b.tokens + ((now - b.last) / 60_000) * perMin);
  if (refilled < 1) return false;
  store.set(bucketKey, { tokens: refilled - 1, last: now });
  return true;
}
