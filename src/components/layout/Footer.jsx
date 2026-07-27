import Link from 'next/link';

const links = [
  { href: '/courses', label: 'Courses' },
  { href: '/prism', label: 'Prism' },
  { href: '/privacy', label: 'Privacy' },
  { href: '/terms', label: 'Terms' },
];

export default function Footer() {
  return (
    <footer className="border-t border-neutral-200/70 bg-white/60">
      <div className="mx-auto flex max-w-5xl flex-col gap-3 px-4 py-8 sm:flex-row sm:items-center sm:justify-between sm:px-6 lg:px-8">
        <p className="text-sm text-neutral-400">
          <span className="font-display font-bold text-neutral-600">Mathly</span> — make math click.
        </p>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm text-neutral-400 transition-colors hover:text-primary-600"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </div>
    </footer>
  );
}
