'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import Button from '@/components/ui/Button';
import { useCallback, useRef } from 'react';

export default function Home() {
  const { user } = useAuth();
  const heroRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const el = heroRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    el.style.setProperty('--mx', `${e.clientX - rect.left}px`);
    el.style.setProperty('--my', `${e.clientY - rect.top}px`);
  }, []);

  return (
    <div
      ref={heroRef}
      onMouseMove={handleMouseMove}
      className="bg-grid-interactive min-h-[calc(100dvh-var(--nav-h))] text-neutral-900"
    >
      <main className="relative z-10">
        <section className="container mx-auto px-6 pt-32 pb-20 md:pt-48 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="animate-fade-in-up [animation-delay:100ms] opacity-0 text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-neutral-900">
              Master Math with <span className="text-primary-600">Visual Intuition</span>
            </h1>

            <p className="animate-fade-in-up [animation-delay:200ms] opacity-0 text-lg md:text-xl text-neutral-500 mb-10 max-w-2xl mx-auto leading-relaxed">
              Stop memorizing formulas. Start seeing the patterns. Interactive lessons that actually
              make math click.
            </p>

            <div className="animate-fade-in-up [animation-delay:300ms] opacity-0 flex flex-col sm:flex-row items-center justify-center gap-4">
              {user ? (
                <Button as={Link} href="/dashboard" size="lg">
                  Continue Learning
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Button>
              ) : (
                <>
                  <Button as={Link} href="/signup" size="lg">
                    Start Learning Free
                    <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                  </Button>
                  <Button as={Link} href="/login" variant="outline" size="lg">
                    Log In
                  </Button>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
