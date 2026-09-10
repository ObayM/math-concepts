const DEFAULT_HOPS = 1;

function trustedHops() {
  const raw = Number.parseInt(process.env.TRUSTED_PROXY_HOPS ?? '', 10);
  if (Number.isNaN(raw) || raw < 0) return DEFAULT_HOPS;
  return raw;
}

export function clientIp(request, hops = trustedHops()) {
  const direct = request.headers.get('x-real-ip');
  if (hops === 0) return direct ?? 'unknown';

  const forwarded = request.headers.get('x-forwarded-for');
  const chain = (forwarded ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);

  if (chain.length) {
    const index = Math.max(0, chain.length - hops);
    return chain[index];
  }
  return direct ?? 'unknown';
}
