"use client";

import { useState } from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { signup } from '@/components/auth/actions';
import Link from 'next/link';
import { useAuth } from '@/components/auth/AuthProvider';
import { Mail, KeyRound, Eye, EyeOff, Loader2, LogIn } from 'lucide-react';
import { redirect } from 'next/navigation';

function SubmitButton() {
  const { pending } = useFormStatus(); 

  return (
    <button
      type="submit"
      disabled={pending}
      className="flex items-center justify-center w-full px-4 py-3 text-sm font-semibold text-white
       transition-all duration-300 ease-in-out bg-blue-600 rounded-lg shadow-md
        hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 
        focus:ring-offset-2 disabled:bg-blue-400 disabled:cursor-not-allowed"
    >
      {pending ? (
        <>
          <Loader2 className="w-5 h-5 mr-2 animate-spin" />
          <span>Signing Up...</span>
        </>
      ) : (
        <>
          <LogIn className="w-5 h-5 mr-2" />
          <span>Create Account</span>
        </>
      )}
    </button>
  );
}

export default function SignupPage() {
  const { user } = useAuth();
  const initialState = { message: '' };
  const [state, dispatch] = useFormState(signup, initialState);
  const [showPassword, setShowPassword] = useState(false);

  if (user) return redirect("/");
  return (
    <main className="flex items-center justify-center min-h-screen px-4 ">
      <div 
        className="w-full max-w-md p-6 space-y-6 bg-white border rounded-2xl shadow-xl border-neutral-200/70 sm:p-8"

      >
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 sm:text-4xl">
            Create an Account
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Join us and start your journey!
          </p>
        </div>

        <form action={dispatch} className="space-y-6">

          <div className="relative">
            <Mail className="absolute w-5 h-5 text-gray-400 top-3.5 left-3" />
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              className="block w-full py-3 pl-10 pr-3 text-gray-900 bg-gray-50 border
               border-gray-300 rounded-lg shadow-sm appearance-none placeholder:text-gray-400
                focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>

          <div className="relative">
            <KeyRound className="absolute w-5 h-5 text-gray-400 top-3.5 left-3" />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              required
              placeholder="Password"
              className="block w-full py-3 pl-10 pr-10 text-gray-900 bg-gray-50 border
               border-gray-300 rounded-lg shadow-sm appearance-none placeholder:text-gray-400 
               focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-gray-500 hover:text-blue-600"
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          
          {state?.message && (
             <p 
              className="text-sm font-medium text-center text-red-600"
            >
              {state.message}
            </p>
          )}

          <div>
            <SubmitButton />
          </div>
        </form>

        <p className="mt-8 text-sm text-center text-gray-600">
          Already have an account?{' '}
          <Link href="/login" className="font-semibold text-blue-600 hover:text-blue-500 hover:underline">
            Sign In
          </Link>
        </p>
      </div>
    </main>
  )
}

