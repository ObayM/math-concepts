'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Check, X, LoaderCircle } from 'lucide-react';
import Button from '@/components/ui/Button';
import { USERNAME_REGEX, USERNAME_MIN, USERNAME_MAX } from '@/lib/username';

function useDebounce(value, delay) {
  const [debouncedValue, setDebouncedValue] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debouncedValue;
}

export default function OnboardingForm() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [isAvailable, setIsAvailable] = useState(null);

  const debouncedUsername = useDebounce(username, 500);

  const checkAvailability = useCallback(async (name) => {
    if (!USERNAME_REGEX.test(name)) {
      setIsChecking(false);
      setIsAvailable(false);
      return;
    }
    setIsChecking(true);
    try {
      const res = await fetch(`/api/check-username?username=${encodeURIComponent(name)}`);
      const data = await res.json();
      setIsAvailable(data.available);
    } catch {
      setIsAvailable(null);
      setError('Could not check username availability. Please try again.');
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    const name = debouncedUsername.trim().toLowerCase();
    if (name) {
      checkAvailability(name);
    } else {
      setIsAvailable(null);
    }
  }, [debouncedUsername, checkAvailability]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(null);

    const candidate = username.trim().toLowerCase();

    if (!isAvailable) {
      setError('This username is unavailable or invalid. Please choose another.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/user/username', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: candidate,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? 'Failed to set username.');

      router.push('/dashboard');
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasValidationError = username.length > 0 && !USERNAME_REGEX.test(username);

  return (
    <div className="animate-fade-in-up w-full max-w-md mx-auto">
      <form
        method="post"
        onSubmit={handleSubmit}
        className="bg-white border border-neutral-200 rounded-2xl p-8 space-y-6"
      >
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-neutral-700 mb-1">
            Choose a username
          </label>
          <div className="relative">
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="yourname"
              className="w-full ps-4 pe-10 py-2.5 bg-surface border border-neutral-200 rounded-xl text-neutral-900 font-mono transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              maxLength={USERNAME_MAX}
              autoComplete="off"
              aria-describedby="username-hint"
            />
            <div className="absolute inset-y-0 end-0 pe-3 flex items-center pointer-events-none">
              {isChecking && <LoaderCircle className="h-5 w-5 text-neutral-400 animate-spin" />}
              {!isChecking && isAvailable === true && (
                <Check className="h-6 w-6 text-success-500" />
              )}
              {!isChecking &&
                (isAvailable === false || hasValidationError) &&
                username.length > 0 && <X className="h-6 w-6 text-danger-500" />}
            </div>
          </div>
          <p id="username-hint" className="mt-2 text-xs text-neutral-500">
            Lowercase letters, numbers and hyphens. {USERNAME_MIN} to {USERNAME_MAX} characters.
          </p>
        </div>

        {error && (
          <div
            className="bg-danger-50 border-s-4 border-danger-400 text-danger-700 p-4 rounded-xl"
            role="alert"
          >
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!error && isAvailable === false && !isChecking && username.length > 0 && (
          <p className="text-sm text-danger-600">This username has already been taken.</p>
        )}

        {!error && hasValidationError && (
          <p className="text-sm text-danger-600">Invalid format. Please follow the rules above.</p>
        )}

        <Button
          type="submit"
          fullWidth
          disabled={loading || isChecking || !isAvailable || hasValidationError}
        >
          {loading ? (
            <>
              <LoaderCircle className="h-5 w-5 animate-spin" />
              Finalizing...
            </>
          ) : (
            'Complete Profile'
          )}
        </Button>
      </form>
    </div>
  );
}
