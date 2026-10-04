'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import clsx from 'clsx';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/components/auth/AuthProvider';
import { useT } from '@/components/i18n/LocaleProvider';
import { authClient } from '@/lib/auth-client';
import { useRouter } from 'next/navigation';
import { Menu, X } from 'lucide-react';
import { Avatar } from '@/components/profile/ProfileHeaderCard';
import ThemeToggle from '@/components/theme/ThemeToggle';

const useOutsideClick = (ref, callback) => {
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (ref.current && !ref.current.contains(event.target)) {
        callback();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [ref, callback]);
};

export default function Navbar() {
  const { user } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await authClient.signOut({
      fetchOptions: {
        onSuccess: () => {
          router.push('/');
          router.refresh();
        },
      },
    });
  }

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const profileRef = useRef(null);
  const drawerRef = useRef(null);
  const closeRef = useRef(null);
  useOutsideClick(profileRef, () => setIsProfileOpen(false));

  useEffect(() => {
    if (!isMobileMenuOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setIsMobileMenuOpen(false);
        return;
      }
      if (e.key !== 'Tab') return;
      const focusable = drawerRef.current?.querySelectorAll(
        'a[href], button:not([disabled]), input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener('keydown', onKey);
    };
  }, [isMobileMenuOpen]);

  const t = useT();
  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';

  const navLinks = [
    { name: t('nav.dashboard'), href: '/dashboard' },
    { name: t('nav.courses'), href: '/courses' },
    { name: t('nav.warmup'), href: '/warmup' },
    { name: t('nav.topics'), href: '/topics' },
    { name: t('nav.sandbox'), href: '/prism/play' },
    ...(isAdmin ? [{ name: t('nav.admin'), href: '/admin' }] : []),
  ];

  return (
    <>
      <header className="sticky top-0 z-50 w-full px-4 pt-3 sm:pt-4">
        <nav
          className="mx-auto flex max-w-6xl items-center justify-between rounded-full border border-neutral-200/80 bg-card px-4 py-2.5 shadow-[0_4px_16px_-6px_rgb(var(--shadow-rgb)/0.12)] lg:px-5"
          aria-label={t('nav.global')}
        >
          <div className="flex lg:flex-1">
            <Link href="/" className="-m-1.5 p-1.5">
              <span className="font-display text-2xl font-bold tracking-tight text-neutral-900">
                Mathly
              </span>
            </Link>
          </div>

          <div className="flex lg:hidden">
            <button
              type="button"
              className="-m-2.5 inline-flex items-center justify-center rounded-md p-2.5 text-neutral-700"
              aria-expanded={isMobileMenuOpen}
              aria-haspopup="dialog"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <span className="sr-only">{t('nav.open')}</span>
              <Menu className="h-6 w-6" aria-hidden="true" />
            </button>
          </div>

          <div className="hidden lg:flex lg:items-center lg:gap-x-1">
            {navLinks.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={clsx(
                    'rounded-full px-4 py-2 text-sm font-semibold transition-colors',
                    active
                      ? 'bg-primary-50 text-primary-700'
                      : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
                  )}
                >
                  {link.name}
                </Link>
              );
            })}
          </div>

          <div className="hidden lg:flex lg:flex-1 lg:justify-end">
            {user ? (
              <div className="relative" ref={profileRef}>
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  aria-label={t('nav.account')}
                  aria-expanded={isProfileOpen}
                  aria-haspopup="menu"
                  className="flex items-center justify-center w-9 h-9 rounded-full transition-opacity hover:opacity-80"
                >
                  <Avatar
                    name={user.name || user.displayUsername || user.username}
                    image={user.image}
                    size="sm"
                  />
                </button>

                {isProfileOpen && (
                  <div className="absolute end-0 mt-2 w-56 origin-top-end rounded-xl bg-card shadow-lg ring-1 ring-neutral-900/5 focus:outline-none dark:ring-neutral-200 overflow-hidden">
                    <div className="py-1">
                      <div className="px-4 py-3 border-b border-neutral-100">
                        <p className="text-sm font-semibold text-neutral-900 truncate">
                          {user.name || user.displayUsername}
                        </p>
                        {user.username && (
                          <p className="text-xs text-neutral-400">
                            @{user.displayUsername || user.username}
                          </p>
                        )}
                      </div>
                      {user.username && (
                        <Link
                          href={`/@${user.username}`}
                          onClick={() => setIsProfileOpen(false)}
                          className="block w-full px-4 py-2 text-start text-sm text-neutral-700 hover:bg-neutral-50"
                        >
                          {t('nav.profile')}
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setIsProfileOpen(false)}
                        className="block w-full px-4 py-2 text-start text-sm text-neutral-700 hover:bg-neutral-50"
                      >
                        {t('nav.settings')}
                      </Link>
                      <ThemeToggle className="px-4 py-1.5" />
                      <button
                        onClick={handleLogout}
                        className="text-danger-600 block w-full px-4 py-2 text-start text-sm hover:bg-neutral-50"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center gap-x-2">
                <Link
                  href="/login"
                  className="rounded-full px-4 py-2 text-sm font-semibold text-neutral-500 transition-colors hover:bg-neutral-50 hover:text-neutral-900"
                >
                  {t('nav.login')}
                </Link>

                <Link
                  href="/signup"
                  className="rounded-full bg-primary-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-primary-700"
                >
                  {t('nav.signup')}
                </Link>
              </div>
            )}
          </div>
        </nav>
      </header>

      {isMobileMenuOpen && (
        <div className="lg:hidden" role="dialog" aria-modal="true" ref={drawerRef}>
          <div
            className="fixed inset-0 z-50 bg-black/30 dark:bg-black/60"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 end-0 z-50 w-full overflow-y-auto bg-card px-6 py-6 sm:max-w-sm sm:ring-1 sm:ring-black/5 sm:dark:ring-neutral-200">
            <div className="flex items-center justify-between">
              <Link href="/" className="-m-1.5 p-1.5" onClick={() => setIsMobileMenuOpen(false)}>
                <span className="font-display text-2xl font-bold tracking-tight text-neutral-900">
                  Mathly
                </span>
              </Link>
              <button
                type="button"
                ref={closeRef}
                className="-m-2.5 rounded-md p-2.5 text-neutral-700"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <span className="sr-only">{t('nav.close')}</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-6 flow-root">
              <div className="-my-6 divide-y divide-neutral-200">
                <div className="space-y-2 py-6">
                  {navLinks.map((link) => (
                    <Link
                      key={link.name}
                      href={link.href}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={`-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 transition-colors ${
                        pathname === link.href
                          ? 'text-primary-600 bg-primary-50'
                          : 'text-neutral-900 hover:bg-neutral-100'
                      }`}
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>

                <div className="py-4">
                  <ThemeToggle />
                </div>

                <div className="py-6">
                  {user ? (
                    <div className="space-y-3">
                      {user.username && (
                        <Link
                          href={`/@${user.username}`}
                          onClick={() => setIsMobileMenuOpen(false)}
                          className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-neutral-900 hover:bg-neutral-100"
                        >
                          {t('nav.profile')}
                        </Link>
                      )}
                      <Link
                        href="/settings"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="-mx-3 block rounded-lg px-3 py-2 text-base font-semibold leading-7 text-neutral-900 hover:bg-neutral-100"
                      >
                        {t('nav.settings')}
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full rounded-md bg-danger-600 px-3.5 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-danger-500"
                      >
                        {t('nav.logout')}
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <Link
                        href="/login"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="-mx-3 block rounded-lg px-3 py-2.5 text-base font-semibold leading-7 text-neutral-900 hover:bg-neutral-100"
                      >
                        {t('nav.login')}
                      </Link>

                      <Link
                        href="/signup"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="block w-full rounded-md bg-primary-600 px-3.5 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition-colors hover:bg-primary-700"
                      >
                        {t('nav.signup')}
                      </Link>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
