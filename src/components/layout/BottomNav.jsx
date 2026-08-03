'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, BookOpen, User, Zap } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '@/components/auth/AuthProvider';

function ownsTheBottom(pathname) {
  return /^\/courses\/[^/]+\/[^/]+/.test(pathname) || /^\/warmup\/\d+$/.test(pathname);
}

export default function BottomNav() {
  const pathname = usePathname() ?? '';
  const { user } = useAuth();

  if (!user || ownsTheBottom(pathname)) return null;

  const tabs = [
    { name: 'Learn', href: '/dashboard', icon: Home },
    { name: 'Courses', href: '/courses', icon: BookOpen },
    { name: 'Warm up', href: '/warmup', icon: Zap },
    {
      name: 'You',
      href: user.username ? `/@${user.username}` : '/settings',
      icon: User,
      match: ['/u/', '/settings'],
    },
  ];

  return (
    <>
      <div className="h-[calc(var(--tab-h)+var(--safe-b))] md:hidden" aria-hidden />
      <nav
        aria-label="Primary"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-neutral-200 bg-white pb-safe md:hidden"
      >
        <ul className="flex">
          {tabs.map((tab) => {
            const active =
              pathname === tab.href ||
              pathname.startsWith(`${tab.href}/`) ||
              (tab.match ?? []).some((m) => pathname.startsWith(m));
            const Icon = tab.icon;
            return (
              <li key={tab.name} className="flex-1">
                <Link
                  href={tab.href}
                  aria-current={active ? 'page' : undefined}
                  className={clsx(
                    'flex h-[var(--tab-h)] flex-col items-center justify-center gap-1 text-xs font-bold transition-colors',
                    active ? 'text-primary-600' : 'text-neutral-400'
                  )}
                >
                  <Icon className="h-5 w-5" aria-hidden />
                  {tab.name}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
}
