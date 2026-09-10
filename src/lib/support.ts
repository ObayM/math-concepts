export function supportEmail(): string {
  const explicit = (process.env.SUPPORT_EMAIL ?? '').trim();
  if (explicit) return explicit;

  const domain = (process.env.APP_DOMAIN ?? '').trim().toLowerCase().split(':')[0];
  return domain ? `privacy@${domain}` : 'privacy@mathly.com';
}
