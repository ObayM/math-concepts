'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, Send, MailCheck } from 'lucide-react';
import { authClient } from '@/lib/auth-client';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await authClient.requestPasswordReset({
      email,
      redirectTo: '/reset-password',
    });

    setLoading(false);
    if (authError) {
      setError(authError.message ?? 'Something went wrong. Please try again.');
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 bg-surface">
        <Card className="animate-fade-in-up w-full max-w-md space-y-4 p-6 text-center sm:p-8">
          <div className="flex justify-center">
            <div className="rounded-full bg-primary-50 p-4">
              <MailCheck className="h-10 w-10 text-primary-600" />
            </div>
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">
            Check Your Inbox
          </h1>
          <p className="text-sm text-neutral-500">
            If an account exists for <span className="font-semibold text-neutral-800">{email}</span>
            , we&apos;ve sent a link to reset your password. It expires in an hour.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-bold text-primary-600 hover:text-primary-500 hover:underline"
          >
            Back to Sign In
          </Link>
        </Card>
      </main>
    );
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100dvh-var(--nav-h))] px-4 bg-surface">
      <Card className="animate-fade-in-up w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Forgot Password?
          </h1>
          <p className="mt-2 text-sm text-neutral-500">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            aria-label="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5" />}
          />

          {error && <p className="text-sm font-medium text-center text-danger-600">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Send Reset Link
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-neutral-500">
          Remembered it?{' '}
          <Link
            href="/login"
            className="font-bold text-primary-600 hover:text-primary-500 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </Card>
    </main>
  );
}
