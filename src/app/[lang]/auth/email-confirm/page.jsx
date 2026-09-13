'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2 } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import { useT } from '@/components/i18n/LocaleProvider';

const COOLDOWN_SECONDS = 60;

function ConfirmCard() {
  const t = useT();
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState('');
  const [problem, setProblem] = useState('');
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((n) => n - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    if (!email || sending || cooldown > 0) return;
    setSending(true);
    setNotice('');
    setProblem('');

    try {
      const res = await fetch('/api/user/resend-verification', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.status === 429) {
        setProblem(t('confirm.tooMany'));
      } else if (!res.ok) {
        setProblem(t('confirm.failed'));
      } else {
        setNotice(t('confirm.resent'));
        setCooldown(COOLDOWN_SECONDS);
      }
    } catch {
      setProblem(t('confirm.offline'));
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100dvh-var(--nav-h))] items-center justify-center px-4 ">
      <Card className="animate-fade-in-up w-full max-w-md space-y-6 p-6 text-center sm:p-8">
        <div className="flex justify-center">
          <div className="rounded-full bg-primary-50 p-4">
            <Mail className="h-10 w-10 text-primary-600" />
          </div>
        </div>

        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
            {t('confirm.title')}
          </h1>
          <p className="mt-3 text-sm text-neutral-500">
            {t('confirm.sentTo')}
            {email ? '' : ` ${t('confirm.yourEmail')}`}
          </p>
          {email && <p className="mt-1 font-semibold text-neutral-800">{email}</p>}
        </div>

        <p className="text-sm text-neutral-500">{t('confirm.spam')}</p>

        {email && (
          <div className="space-y-2">
            <Button onClick={resend} variant="outline" fullWidth disabled={sending || cooldown > 0}>
              {sending ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  {t('confirm.resending')}
                </>
              ) : cooldown > 0 ? (
                t('confirm.resendIn', { seconds: cooldown })
              ) : (
                t('confirm.resend')
              )}
            </Button>
            {notice && <p className="text-sm font-medium text-success-600">{notice}</p>}
            {problem && <p className="text-sm font-medium text-danger-600">{problem}</p>}
          </div>
        )}

        <div className="flex items-center justify-center gap-4 text-sm text-neutral-500">
          <Link href="/signup" className="font-semibold text-primary-600 hover:underline">
            {t('confirm.wrongEmail')}
          </Link>
          <span aria-hidden>·</span>
          <Link href="/login" className="font-semibold text-primary-600 hover:underline">
            {t('confirm.alreadyVerified')}
          </Link>
        </div>
      </Card>
    </main>
  );
}

export default function AuthConfirmPage() {
  return (
    <Suspense fallback={<main className="min-h-[calc(100dvh-var(--nav-h))] " />}>
      <ConfirmCard />
    </Suspense>
  );
}
