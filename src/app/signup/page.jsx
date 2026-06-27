'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Mail, KeyRound, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/auth-client';
import { redirect } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function SignupPage() {
  const { user } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
    <main className="flex items-center justify-center min-h-[calc(100vh-70px)] px-4 bg-slate-50">
      <div className="animate-fade-in-up w-full max-w-md p-6 space-y-6 bg-white border border-gray-200 rounded-2xl sm:p-8">
        <div className="text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
            Create an Account
          </h1>
          <p className="mt-2 text-sm text-gray-500">Join us and start your journey!</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Mail className="absolute w-5 h-5 text-gray-400 top-3.5 left-3" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full py-3 pl-10 pr-3 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute w-5 h-5 text-gray-400 top-3.5 left-3" />
            <input
              id="password"
              name="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="block w-full py-3 pl-10 pr-10 text-gray-900 bg-gray-50 border border-gray-200 rounded-xl placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          {error && <p className="text-sm font-medium text-center text-red-600">{error}</p>}

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

        <p className="text-sm text-center text-gray-500">
          Already have an account?{' '}
          <Link
            href="/login"
            className="font-bold text-blue-600 hover:text-blue-500 hover:underline"
          >
            Sign In
          </Link>
        </p>
      </div>
    </main>
  );
}
