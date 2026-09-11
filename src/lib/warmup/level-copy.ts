import type { Translate } from '@/lib/i18n';
import type { MessageKey } from '@/lib/i18n';

function resolve(t: Translate, key: string, fallback: string): string {
  const value = t(key as MessageKey);
  return value === key ? fallback : value;
}

export function levelName(t: Translate, id: number, fallback: string): string {
  return resolve(t, `warmup.l${id}.name`, fallback);
}

export function levelBlurb(t: Translate, id: number, fallback: string): string {
  return resolve(t, `warmup.l${id}.blurb`, fallback);
}
