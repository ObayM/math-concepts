'use client';

import { useState } from 'react';
import { useT } from '@/components/i18n/LocaleProvider';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/auth-client';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Card from '@/components/ui/Card';

// telling someone their password is wrong when they are actually rate limited,
// unverified or banned sends them in circles.
function signInMessage(error, t) {
  if (error.status === 429) return t('auth.tooManyAttempts');
  switch (error.code) {
    case 'EMAIL_NOT_VERIFIED':
      return t('auth.verifyFirst');
    case 'USER_BANNED':
    case 'BANNED_USER':
      return t('auth.suspended');
    case 'INVALID_EMAIL_OR_PASSWORD':
      return t('auth.invalid');
    default:
      return error.message || t('error.generic');
  }
}

export default function LoginPage() {
  const t = useT();
  const { user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return redirect('/dashboard');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
      callbackURL: '/dashboard',
    });

    if (authError) {
      setError(signInMessage(authError));
      setLoading(false);
    } else {
      router.push('/dashboard');
      router.refresh();
    }
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 bg-surface">
      <Card className="animate-fade-in-up w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            {t('auth.welcomeBack')}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{t('auth.signInBlurb')}</p>
        </div>

        <form method="post" onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder={t('auth.emailAddress')}
            aria-label={t('auth.emailAddress')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5" />}
          />

          <PasswordInput
            id="password"
            name="password"
            autoComplete="current-password"
            required
            placeholder={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div className="text-end -mt-2">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary-600 hover:text-primary-500 hover:underline"
            >
              {t('auth.forgot')}
            </Link>
          </div>

          {error && <p className="text-sm font-medium text-center text-danger-600">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('auth.signingIn')}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {t('auth.signIn')}
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-neutral-500">
          {t('auth.noAccount')}{' '}
          <Link
            href="/signup"
            className="font-bold text-primary-600 hover:text-primary-500 hover:underline"
          >
            {t('auth.signUpCta')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
