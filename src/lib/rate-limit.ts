type Bucket = { tokens: number; last: number };
const store = new Map<string, Bucket>();

const LIMITS = {
  chat: { max: 20, perMin: 20 },
  generate: { max: 5, perMin: 5 },
} as const;

export function consume(key: string, tier: keyof typeof LIMITS): boolean {
  const { max, perMin } = LIMITS[tier];
  const now = Date.now();
  const b = store.get(key) ?? { tokens: max, last: now };
  const refilled = Math.min(max, b.tokens + ((now - b.last) / 60_000) * perMin);
  if (refilled < 1) return false;
  store.set(key, { tokens: refilled - 1, last: now });
  return true;
}
