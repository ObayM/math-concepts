'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, Loader2, LogIn, User } from 'lucide-react';
import { useT } from '@/components/i18n/LocaleProvider';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/auth-client';
import { PASSWORD_MIN } from '@/lib/password';
import { NAME_MAX, nameProblem } from '@/lib/user-name';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import PasswordInput from '@/components/ui/PasswordInput';
import Card from '@/components/ui/Card';

export default function SignupPage() {
  const t = useT();
  const { user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return redirect('/dashboard');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (nameProblem(name)) {
      setError(t('auth.nameRequired'));
      return;
    }

    if (password.length < PASSWORD_MIN) {
      setError(t('auth.passwordShort', { count: PASSWORD_MIN }));
      return;
    }

    if (!accepted) {
      setError(t('auth.mustAgree'));
      return;
    }

    setLoading(true);

    try {
      const { error: authError } = await authClient.signUp.email({
        email,
        password,
        name: name.trim(),
        callbackURL: '/onboarding',
      });

      if (authError) {
        setError(authError.message ?? 'Something went wrong. Please try again.');
        setLoading(false);
        return;
      }

      router.push(`/auth/email-confirm?email=${encodeURIComponent(email)}`);
    } catch {
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 ">
      <Card className="animate-fade-in-up w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {t('auth.createAccount')}
          </h1>
          <p className="mt-2 text-sm text-neutral-500">{t('auth.signupBlurb')}</p>
        </div>

        <form method="post" onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={NAME_MAX}
            placeholder={t('auth.namePlaceholder')}
            aria-label={t('auth.namePlaceholder')}
            value={name}
            onChange={(e) => setName(e.target.value)}
            icon={<User className="w-5 h-5" />}
          />

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
            autoComplete="new-password"
            required
            placeholder={t('auth.password')}
            aria-label={t('auth.password')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <label className="flex items-start gap-3 text-sm text-neutral-500">
            <input
              id="terms"
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-neutral-300 text-primary-600 focus:ring-primary-500"
            />
            <span>
              {t('auth.agreePrefix')}{' '}
              <Link
                href="/terms"
                target="_blank"
                className="font-semibold text-primary-600 hover:underline"
              >
                {t('auth.terms')}
              </Link>{' '}
              {t('auth.agreeAnd')}{' '}
              <Link
                href="/privacy"
                target="_blank"
                className="font-semibold text-primary-600 hover:underline"
              >
                {t('auth.privacy')}
              </Link>
              .
            </span>
          </label>

          {error && <p className="text-sm font-medium text-center text-danger-600">{error}</p>}

          <Button type="submit" fullWidth disabled={loading || !accepted}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                {t('auth.signingUp')}
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                {t('auth.createAccount')}
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-neutral-500">
          {t('auth.haveAccount')}{' '}
          <Link
            href="/login"
            className="font-bold text-primary-600 hover:text-primary-500 hover:underline"
          >
            {t('auth.signIn')}
          </Link>
        </p>
      </Card>
    </main>
  );
}
