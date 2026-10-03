'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Eye } from 'lucide-react';
import { useAuth } from '@/components/auth/AuthProvider';
import Button from '@/components/admin/ui/Button';
import { stopImpersonatingAction } from '@/app/[lang]/admin/users/actions';

export default function ImpersonationBanner() {
  const { user, isImpersonating } = useAuth();
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);

  if (!isImpersonating) return null;

  async function handleExit() {
    await stopImpersonatingAction();
    router.push('/admin/users');
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="animate-fade-in-up fixed bottom-5 right-5 z-[60] flex w-48 flex-col gap-2 border border-neutral-900 bg-neutral-900 p-3 text-xs font-bold text-card">
        <span>Exit and go back to you?</span>
        <Button type="button" variant="danger" size="sm" onClick={handleExit} fullWidth>
          Yes, exit
        </Button>
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => setConfirming(false)}
          fullWidth
        >
          Cancel
        </Button>
      </div>
    );
  }

  return (
    <button
      onClick={() => setConfirming(true)}
      title="Exit impersonation"
      className="animate-fade-in-up fixed bottom-5 right-5 z-[60] flex items-center gap-2 border border-neutral-900 bg-neutral-900 px-3 py-2 text-xs font-bold text-card transition-colors hover:bg-neutral-800"
    >
      <Eye size={16} />
      <span>Viewing as {user?.username ?? user?.email ?? 'user'}</span>
    </button>
  );
}
