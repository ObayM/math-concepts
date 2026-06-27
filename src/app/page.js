'use client';

import { useAuth } from '@/components/auth/AuthProvider';
import Link from 'next/link';
import { ArrowRight, Zap } from 'lucide-react';
import Button from '@/components/ui/Button';

export default function Home() {
  const { user } = useAuth();

  return (
    <div className="min-h-[calc(100vh-73px)] bg-slate-50 text-slate-900 selection:bg-blue-100 selection:text-blue-900">
      <main>
        {/* Hero */}
        <section className="container mx-auto px-6 pt-32 pb-20 md:pt-48 md:pb-32">
          <div className="max-w-4xl mx-auto text-center">
            <div className="animate-fade-in-up inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-sm font-semibold mb-8">
              <Zap className="w-3.5 h-3.5" />
              Interactive · AI-Powered · Free to start
            </div>

            <h1 className="animate-fade-in-up [animation-delay:100ms] opacity-0 text-5xl md:text-7xl font-extrabold tracking-tight mb-6 leading-tight text-slate-900">
              Master Math with{' '}
              <span className="bg-linear-to-r from-blue-600 via-cyan-500 to-indigo-600 bg-clip-text text-transparent">
                Visual Intuition
              </span>
            </h1>

            <p className="animate-fade-in-up [animation-delay:200ms] opacity-0 text-lg md:text-xl text-slate-500 mb-10 max-w-2xl mx-auto leading-relaxed">
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
