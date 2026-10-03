import Link from 'next/link';
import { requireSuperAdmin } from '@/lib/authz';
import { AUDIT_ACTIONS, listAuditActors, listAuditLog } from '@/lib/db/auditService';
import Badge from '@/components/admin/ui/Badge';
import Card from '@/components/admin/ui/Card';

const DESTRUCTIVE = /deleted|banned|role\.set|impersonation\.started|published_with_findings/;

function when(date) {
  return date.toISOString().replace('T', ' ').slice(0, 16);
}

export default async function AuditPage({ searchParams }) {
  await requireSuperAdmin();
  const params = await searchParams;
  const action = params?.action || undefined;
  const actorId = params?.actorId || undefined;
  const cursor = params?.cursor || undefined;

  const [{ rows, nextCursor }, actors] = await Promise.all([
    listAuditLog({ action, actorId, cursor }),
    listAuditActors(),
  ]);

  const link = (extra) => {
    const q = new URLSearchParams();
    if (action) q.set('action', action);
    if (actorId) q.set('actorId', actorId);
    for (const [k, v] of Object.entries(extra)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    const s = q.toString();
    return `/admin/audit${s ? `?${s}` : ''}`;
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Audit log</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Every privileged action, append only. Rows outlive the thing they describe.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Action</span>
          <select
            name="action"
            defaultValue={action ?? ''}
            className="rounded-none border border-neutral-300 bg-card px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            {AUDIT_ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-bold uppercase tracking-wide text-neutral-500">Actor</span>
          <select
            name="actorId"
            defaultValue={actorId ?? ''}
            className="rounded-none border border-neutral-300 bg-card px-3 py-1.5 text-sm"
          >
            <option value="">Anyone</option>
            {actors.map((a) => (
              <option key={a.actorId} value={a.actorId}>
                {a.actorEmail}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="rounded-none border border-neutral-300 bg-card px-4 py-1.5 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
        >
          Filter
        </button>
        {(action || actorId) && (
          <Link href="/admin/audit" className="py-1.5 text-sm font-semibold text-primary-700">
            Clear
          </Link>
        )}
      </form>

      <Card className="mt-6 overflow-x-auto">
        {rows.length === 0 ? (
          <p className="p-6 text-sm text-neutral-400">Nothing recorded yet.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 bg-neutral-50 text-left">
                <th className="px-4 py-2 font-bold text-neutral-600">When (UTC)</th>
                <th className="px-4 py-2 font-bold text-neutral-600">Actor</th>
                <th className="px-4 py-2 font-bold text-neutral-600">Action</th>
                <th className="px-4 py-2 font-bold text-neutral-600">Target</th>
                <th className="px-4 py-2 font-bold text-neutral-600">Details</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-b border-neutral-100 last:border-0 align-top">
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-neutral-500">
                    {when(row.createdAt)}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">{row.actorEmail}</td>
                  <td className="px-4 py-2">
                    <Badge variant={DESTRUCTIVE.test(row.action) ? 'danger' : 'neutral'}>
                      {row.action}
                    </Badge>
                  </td>
                  <td className="px-4 py-2 text-neutral-700">
                    {row.targetLabel ?? row.targetId ?? '—'}
                    {row.targetType && (
                      <span className="ml-1 text-xs text-neutral-400">({row.targetType})</span>
                    )}
                  </td>
                  <td className="max-w-sm px-4 py-2">
                    {row.meta && Object.keys(row.meta).length > 0 && (
                      <pre className="overflow-x-auto whitespace-pre-wrap break-all font-mono text-xs text-neutral-500">
                        {JSON.stringify(row.meta)}
                      </pre>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {nextCursor && (
        <div className="mt-4">
          <Link
            href={link({ cursor: nextCursor })}
            className="rounded-none border border-neutral-300 bg-card px-4 py-2 text-sm font-semibold text-neutral-700 hover:bg-neutral-50"
          >
            Older
          </Link>
        </div>
      )}
    </div>
  );
}
