"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { Check, X, LoaderCircle } from "lucide-react";

const USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9-]{0,37}[a-z0-9])?$/;

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
  const [username, setUsername] = useState("");
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
      const res = await fetch(
        `/api/check-username?username=${encodeURIComponent(name)}`
      );
      const data = await res.json();
      setIsAvailable(data.available);
    } catch {
      setIsAvailable(null);
      setError("Could not check username availability. Please try again.");
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
      setError("This username is unavailable or invalid. Please choose another.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/user/username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: candidate }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error ?? "Failed to set username.");

      router.push("/dashboard");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const hasValidationError = username.length > 0 && !USERNAME_REGEX.test(username);

  return (
    <div className="w-full max-w-md mx-auto">
      <form
        onSubmit={handleSubmit}
        className="bg-white border border-slate-200 rounded-xl shadow-lg p-8 space-y-6"
      >
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-slate-700 mb-1">
            Choose a username
          </label>
          <div className="relative">
            <input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g obay :)"
              className="w-full pl-4 pr-10 py-2.5 bg-slate-50 border border-slate-300 rounded-lg text-slate-900 font-mono shadow-sm transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              maxLength={39}
              autoComplete="off"
              aria-describedby="username-hint"
            />
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              {isChecking && <LoaderCircle className="h-5 w-5 text-slate-400 animate-spin" />}
              {!isChecking && isAvailable === true && <Check className="h-6 w-6 text-green-500" />}
              {!isChecking && (isAvailable === false || hasValidationError) && username.length > 0 && (
                <X className="h-6 w-6 text-red-500" />
              )}
            </div>
          </div>
          <p id="username-hint" className="mt-2 text-xs text-slate-500">
            Lowercase letters, numbers, and hyphens. 3–39 characters.
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-red-400 text-red-700 p-4 rounded-md" role="alert">
            <p className="font-bold">Error</p>
            <p>{error}</p>
          </div>
        )}

        {!error && isAvailable === false && !isChecking && username.length > 0 && (
          <p className="text-sm text-red-600">This username has already been taken.</p>
        )}

        {!error && hasValidationError && (
          <p className="text-sm text-red-600">Invalid format. Please follow the rules above.</p>
        )}

        <button
          type="submit"
          disabled={loading || isChecking || !isAvailable || hasValidationError}
          className="w-full flex items-center justify-center px-6 py-3 font-semibold text-white bg-blue-600 rounded-lg shadow-sm transition-all duration-200 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-slate-400 disabled:cursor-not-allowed disabled:shadow-none"
        >
          {loading ? (
            <>
              <LoaderCircle className="h-5 w-5 mr-2 animate-spin" />
              Finalizing...
            </>
          ) : (
            "Complete Profile"
          )}
        </button>
      </form>
    </div>
  );
}
