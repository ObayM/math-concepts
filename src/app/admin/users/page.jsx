import { headers } from 'next/headers';
import { auth } from '@/lib/auth';
import { getFullSession, isAdmin, isSuperAdmin, requireAdmin } from '@/lib/authz';
import { getUsersCompletedCounts } from '@/lib/db/userService';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import Input from '@/components/admin/ui/Input';
import UserRowActions from '@/components/admin/UserRowActions';

const roleBadgeVariant = (role) => {
  if (role === 'super_admin') return 'accent';
  if (role === 'admin') return 'primary';
  return 'neutral';
};

export default async function AdminUsersPage({ searchParams }) {
  await requireAdmin();
  const { q } = await searchParams;
  const session = await getFullSession();
  const viewer = session?.user ?? null;
  const canManage = isSuperAdmin(viewer);
  const canImpersonate = isAdmin(viewer);

  const { users, total } = await auth.api.listUsers({
    headers: await headers(),
    query: {
      limit: 50,
      searchField: 'email',
      searchValue: q || undefined,
      sortBy: 'createdAt',
      sortDirection: 'desc',
    },
  });

  const completedCounts = await getUsersCompletedCounts(users.map((u) => u.id));

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Users</h1>

      <form className="mt-4">
        <Input
          type="search"
          name="q"
          defaultValue={q ?? ''}
          placeholder="Search by email"
          className="w-full max-w-sm"
        />
      </form>

      <Card className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs font-bold uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">User</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Lessons completed</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {users.map((user) => (
              <tr key={user.id}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-neutral-800">{user.name}</p>
                  <p className="text-neutral-500">{user.email}</p>
                </td>
                <td className="px-4 py-3">
                  <Badge variant={roleBadgeVariant(user.role)}>{user.role ?? 'student'}</Badge>
                </td>
                <td className="px-4 py-3">
                  {user.banned ? (
                    <Badge variant="warning">Banned</Badge>
                  ) : (
                    <Badge variant="success">Active</Badge>
                  )}
                </td>
                <td className="px-4 py-3">{completedCounts.get(user.id) ?? 0}</td>
                <td className="px-4 py-3">
                  <UserRowActions
                    user={user}
                    viewerId={viewer?.id}
                    canManage={canManage}
                    canImpersonate={canImpersonate}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {users.length === 0 && <p className="p-4 text-sm text-neutral-400">No users found.</p>}
      </Card>
      <p className="mt-2 text-xs text-neutral-400">{total} total users</p>
    </div>
  );
}
