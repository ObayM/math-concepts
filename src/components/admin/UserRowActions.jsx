'use client';

import Button from '@/components/ui/Button';
import ConfirmSubmitButton from '@/components/admin/ConfirmSubmitButton';
import {
  setRoleAction,
  banUserAction,
  unbanUserAction,
  impersonateUserAction,
} from '@/app/admin/users/actions';

const ROLE_OPTIONS = ['student', 'admin', 'super_admin'];

export default function UserRowActions({ user, viewerId, canManage, canImpersonate }) {
  const isSelf = user.id === viewerId;

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {canImpersonate && !isSelf && (
        <form action={impersonateUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <Button type="submit" variant="outline" size="sm">
            Impersonate
          </Button>
        </form>
      )}
      {canManage && !isSelf && (
        <form action={setRoleAction} className="flex items-center gap-1">
          <input type="hidden" name="userId" value={user.id} />
          <select
            name="role"
            defaultValue={user.role ?? 'student'}
            className="rounded-lg border border-neutral-200 px-2 py-1.5 text-xs"
          >
            {ROLE_OPTIONS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
          <Button type="submit" variant="secondary" size="sm">
            Set role
          </Button>
        </form>
      )}
      {canManage && !isSelf && (
        <form action={user.banned ? unbanUserAction : banUserAction}>
          <input type="hidden" name="userId" value={user.id} />
          <ConfirmSubmitButton
            confirmText={user.banned ? `Unban ${user.email}?` : `Ban ${user.email}?`}
            variant="ghost"
            size="sm"
          >
            {user.banned ? 'Unban' : 'Ban'}
          </ConfirmSubmitButton>
        </form>
      )}
    </div>
  );
}
