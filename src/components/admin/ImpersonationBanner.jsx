'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { authClient } from '@/lib/auth-client';

export default function ImpersonationBanner() {
  const { user, isImpersonating } = useAuth();
  const router = useRouter();

  if (!isImpersonating) return null;

  async function handleExit() {
    await authClient.admin.stopImpersonating();
    router.push('/admin/users');
    router.refresh();
  }

  return (
    <div className="sticky top-0 z-[60] flex items-center justify-center gap-3 bg-warning-100 px-4 py-2 text-sm font-semibold text-warning-600">
      <span>Viewing Mathly as {user?.username ?? user?.email ?? 'this user'}</span>
      <button
        onClick={handleExit}
        className="rounded-lg border-b-[2px] border-warning-600 bg-white px-2.5 py-1 text-xs font-bold text-warning-600 transition-all active:border-b-0 active:translate-y-[2px]"
      >
        Exit impersonation
      </button>
    </div>
  );
}
