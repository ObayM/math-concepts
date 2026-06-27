'use client';

import { useState } from 'react';
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

export default function SignupPage() {
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

    if (password.length < 6) {
      setError('Password must be at least 6 characters long.');
      return;
    }

    setLoading(true);

    const { error: authError } = await authClient.signUp.email({
      email,
      password,
      name: email,
      callbackURL: '/onboarding',
    });

    if (authError) {
      setError(authError.message ?? 'Something went wrong. Please try again.');
      setLoading(false);
    } else {
      router.push(`/auth/email-confirm?email=${encodeURIComponent(email)}`);
    }
  }

  return (
    <main className="flex items-center justify-center min-h-[calc(100vh-var(--nav-h))] px-4 bg-surface">
      <Card className="animate-fade-in-up w-full max-w-md space-y-6 p-6 sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 sm:text-4xl">
            Create an Account
          </h1>
          <p className="mt-2 text-sm text-neutral-500">Join us and start your journey!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="Email address"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            icon={<Mail className="w-5 h-5" />}
          />

          <PasswordInput
            id="password"
            name="password"
            autoComplete="new-password"
            required
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && <p className="text-sm font-medium text-center text-danger-600">{error}</p>}

          <Button type="submit" fullWidth disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Signing Up...
              </>
            ) : (
              <>
                <LogIn className="w-5 h-5" />
                Create Account
              </>
            )}
          </Button>
        </form>

        <p className="text-sm text-center text-neutral-500">
          Already have an account?{' '}
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
