import { DEFAULT_LOCALE, isLocale, isRtl, type Locale } from './locale';
import { translate } from './i18n';
import type { MessageKey } from './i18n';

export function localeOf(value: unknown): Locale {
  return isLocale(value) ? value : DEFAULT_LOCALE;
}

export function shell(locale: Locale, body: string): string {
  const dir = isRtl(locale) ? 'rtl' : 'ltr';
  const align = isRtl(locale) ? 'right' : 'left';
  return `<div dir="${dir}" style="font-family:sans-serif;max-width:480px;margin:auto;text-align:${align}">${body}</div>`;
}

export function button(url: string, label: string): string {
  return `<a href="${url}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;text-decoration:none;border-radius:6px;font-weight:600">${label}</a>`;
}

function line(text: string, muted = false): string {
  const style = muted ? ' style="margin-top:16px;color:#6b7280;font-size:13px"' : '';
  return `<p${style}>${text}</p>`;
}

export function verificationEmail(locale: Locale, url: string) {
  const t = (key: MessageKey) => translate(locale, key);
  return {
    subject: t('email.verifySubject'),
    html: shell(
      locale,
      `<h2>${t('email.verifyHeading')}</h2>${line(t('email.verifyBody'))}${button(url, t('email.verifyCta'))}${line(t('email.verifyIgnore'), true)}`
    ),
  };
}

export function resetEmail(locale: Locale, url: string) {
  const t = (key: MessageKey) => translate(locale, key);
  return {
    subject: t('email.resetSubject'),
    html: shell(
      locale,
      `<h2>${t('email.resetHeading')}</h2>${line(t('email.resetBody'))}${button(url, t('email.resetCta'))}${line(t('email.resetIgnore'), true)}`
    ),
  };
}

export function reminderEmail(
  locale: Locale,
  reason: 'streak-at-risk' | 'gone-quiet',
  name: string,
  appUrl: string
) {
  const t = (key: MessageKey, vars?: Record<string, string | number>) =>
    translate(locale, key, vars);
  const lead =
    reason === 'streak-at-risk'
      ? t('email.streakAtRisk', { name })
      : t('email.goneQuiet', { name });

  return {
    subject: t('email.reminderSubject'),
    html: shell(
      locale,
      `${line(lead)}${line(`<a href="${appUrl}/dashboard">${t('email.openMathly')}</a>`)}${line(
        `${t('email.dontWantThese')} <a href="${appUrl}/settings">${t('email.turnOff')}</a>`,
        true
      )}`
    ),
  };
}
