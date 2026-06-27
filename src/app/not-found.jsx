import Link from 'next/link';
import Button from '@/components/ui/Button';

export default function NotFound() {
  return (
    <div className="min-h-[calc(100vh-var(--nav-h))] bg-surface flex items-center justify-center px-6">
      <div className="animate-fade-in-up max-w-md w-full text-center">
        <p className="text-xs font-bold tracking-widest text-neutral-400 uppercase mb-6">404</p>

        <div className="font-mono font-bold tracking-tight mb-8 text-5xl md:text-6xl leading-none">
          <span className="text-neutral-400">f(</span>
          <span className="text-neutral-900">404</span>
          <span className="text-neutral-400">) =</span>
          <br />
          <span className="text-primary-500">undefined</span>
        </div>

        <div className="w-10 h-px bg-neutral-200 mx-auto mb-8" />

        <p className="text-lg font-semibold text-neutral-900 mb-2">This page doesn&apos;t exist.</p>
        <p className="text-sm text-neutral-500 mb-10 leading-relaxed">
          Looks like it was moved, deleted, or never existed. Try browsing courses instead.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Button as={Link} href="/courses" variant="primary">
            Browse Courses
          </Button>
          <Button as={Link} href="/" variant="outline">
            Go Home
          </Button>
        </div>
      </div>
    </div>
  );
}
