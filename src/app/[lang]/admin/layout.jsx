import Link from 'next/link';
import { requireAdmin, isSuperAdmin } from '@/lib/authz';
import Badge from '@/components/admin/ui/Badge';

const navLinks = [
  { name: 'Overview', href: '/admin' },
  { name: 'Users', href: '/admin/users' },
  { name: 'Content', href: '/admin/content' },
  { name: 'Measurement', href: '/admin/measurement' },
  { name: 'Audit log', href: '/admin/audit', superAdminOnly: true },
];

export default async function AdminLayout({ children }) {
  const user = await requireAdmin();
  const superAdmin = isSuperAdmin(user);

  return (
    <div className="mx-auto flex max-w-7xl gap-8 px-4 py-8 lg:px-8">
      <aside className="hidden w-56 flex-shrink-0 border-r border-neutral-200 pr-6 lg:block">
        <div className="mb-6">
          <p className="text-xs font-bold uppercase tracking-wide text-neutral-500">Mathly</p>
          <p className="text-lg font-bold text-primary-900">Admin</p>
        </div>
        <nav className="flex flex-col">
          {navLinks
            .filter((link) => superAdmin || !link.superAdminOnly)
            .map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="border-l-2 border-transparent px-3 py-2 text-sm font-semibold text-neutral-700 transition-colors hover:border-primary-600 hover:bg-neutral-50 hover:text-primary-700"
              >
                {link.name}
              </Link>
            ))}
        </nav>
        <div className="mt-8">
          <Badge variant={superAdmin ? 'accent' : 'primary'}>
            {superAdmin ? 'super_admin' : 'admin'}
          </Badge>
        </div>
      </aside>
      <main className="min-w-0 flex-1">{children}</main>
    </div>
  );
}
