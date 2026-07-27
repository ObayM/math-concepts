import Link from 'next/link';
import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES } from '@/lib/permissions';
import Card from '@/components/admin/ui/Card';
import { requireAdmin } from '@/lib/authz';
import { getSiteStats } from '@/lib/db/measurementService';

async function getUserCounts() {
  const [totalUsers, admins, banned, recentSignups] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { role: { in: ADMIN_ROLES } } }),
    prisma.user.count({ where: { banned: true } }),
    prisma.user.count({
      where: { createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
  ]);
  return { totalUsers, admins, banned, recentSignups };
}

function StatCard({ label, value, hint }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900">{value}</p>
      {hint && <p className="mt-1 text-xs text-neutral-400">{hint}</p>}
    </Card>
  );
}

function Section({ title, href, linkLabel, children }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-neutral-500">{title}</h2>
        <Link href={href} className="text-sm font-semibold text-primary-700 hover:underline">
          {linkLabel} →
        </Link>
      </div>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">{children}</div>
    </section>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const [users, site] = await Promise.all([getUserCounts(), getSiteStats()]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Overview</h1>

      <Section title="People" href="/admin/users" linkLabel="Manage users">
        <StatCard label="Total users" value={users.totalUsers} />
        <StatCard label="New this week" value={users.recentSignups} />
        <StatCard label="Admins" value={users.admins} />
        <StatCard label="Banned" value={users.banned} />
      </Section>

      <Section title="Engagement" href="/admin/measurement" linkLabel="Measurement">
        <StatCard label="Active today" value={site.activeToday} />
        <StatCard label="Active this week" value={site.activeThisWeek} />
        <StatCard label="Answers" value={site.attempts} hint="last 7 days" />
        <StatCard label="Lessons completed" value={site.lessonsCompleted} hint="all time" />
      </Section>

      <Section title="Catalog" href="/admin/content" linkLabel="Edit content">
        <StatCard label="Published courses" value={site.courses} />
        <StatCard label="Published lessons" value={site.publishedLessons} />
      </Section>
    </div>
  );
}
