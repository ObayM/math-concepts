'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Loader2, KeyRound, CheckCircle2 } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import { PASSWORD_MIN } from '@/lib/password';
import Button from '@/components/ui/Button';
import PasswordInput from '@/components/ui/PasswordInput';
import Card from '@/components/ui/Card';

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  if (!token) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 bg-surface">
        <Card className="animate-fade-in-up w-full max-w-md space-y-4 p-6 text-center sm:p-8">
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Link Invalid or Expired
          </h1>
          <p className="text-sm text-neutral-500">
            This password reset link is missing or no longer valid. Request a new one below.
          </p>
          <Link
            href="/forgot-password"
            className="inline-block text-sm font-bold text-primary-600 hover:text-primary-500 hover:underline"
          >
            Request a new link
          </Link>
        </Card>
      </main>
    );
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (password.length < PASSWORD_MIN) {
      setError(`Password must be at least ${PASSWORD_MIN} characters long.`);
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }

    setLoading(true);
    const { error: authError } = await authClient.resetPassword({ newPassword: password, token });
    setLoading(false);

    if (authError) {
      setError(authError.message ?? 'Something went wrong. Please try again.');
      return;
    }
    setDone(true);
  }

  if (done) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 bg-surface">
        <Card className="animate-fade-in-up w-full max-w-md space-y-4 p-6 text-center sm:p-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-success-50 p-4">
              <CheckCircle2 className="h-10 w-10 text-success-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Password Reset
          </h1>
          <p className="text-sm text-neutral-500">
            Your password has been updated. Sign in with your new password to continue.
          </p>
          <Button onClick={() => router.push('/login')} fullWidth>
            Continue to Sign In
          </Button>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 bg-surface">
      <Card className="animate-fade-in-up w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Set a New Password
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Choose a new password for your account.</p>
        </div>

        <form method="post" onSubmit={handleSubmit} className="space-y-4">
          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            placeholder="New password"
            aria-label="New password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <PasswordInput
            id="confirm"
            name="confirm"
            autoComplete="new-password"
            required
            placeholder="Confirm new password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />

          {error && <p className="text-sm font-medium text-center text-danger-600">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Resetting...
              </>
            ) : (
              <>
                <KeyRound className="w-5 h-5" />
                Reset Password
              </>
            )}
          </Button>
        </form>
      </Card>
    </main>
  );
}
