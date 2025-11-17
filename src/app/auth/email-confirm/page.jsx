'use client';

import { useSearchParams } from 'next/navigation';
import { Mail } from 'lucide-react';

export default function AuthConfirmPage() {
  const searchParams = useSearchParams();
  const email = searchParams.get('email');

  return (
    <div className="min-h-[calc(100vh-73px)] flex items-center justify-center p-4">
      
      <div className="max-w-md w-full text-center bg-white border border-neutral-200 rounded-lg p-8 shadow-lg">
        
        <div className="flex justify-center mb-6">
          <div className="bg-blue-100 p-4 rounded-full">
            <Mail className="w-12 h-12 text-blue-600" />
          </div>
        </div>
        
        <h1 className="text-3xl fon hjg  jggn jhnt-bold text-neutral-900">
          Check Your Inbox
        </h1>
        
        <p className="mt-4 text-neutral-600">
          We've sent a confirmation link to your email address:
        </p>
        
        {email && (
          <p className="mt-2 text-lg font-semibold text-neutral-800">
            {email}
          </p>
        )}
        
        <p className="mt-6 text-sm text-neutral-500">
          Click the link in the email to complete your sign-up. If you don't see it, please check your spam folder.
        </p>
      </div>
    </div>
  );
}