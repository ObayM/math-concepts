import { prisma } from '@/lib/prisma';
import { ADMIN_ROLES } from '@/lib/permissions';
import Card from '@/components/admin/ui/Card';
import { requireAdmin } from '@/lib/authz';

async function getCounts() {
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

function StatCard({ label, value }) {
  return (
    <Card className="p-5">
      <p className="text-sm font-semibold text-neutral-500">{label}</p>
      <p className="mt-1 text-3xl font-bold text-neutral-900">{value}</p>
    </Card>
  );
}

export default async function AdminOverviewPage() {
  await requireAdmin();
  const counts = await getCounts();

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Overview</h1>
      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Total users" value={counts.totalUsers} />
        <StatCard label="Admins" value={counts.admins} />
        <StatCard label="Banned" value={counts.banned} />
        <StatCard label="New this week" value={counts.recentSignups} />
      </div>
    </div>
  );
}
