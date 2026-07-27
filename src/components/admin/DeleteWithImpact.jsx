'use client';

import { useActionState } from 'react';
import Button from '@/components/admin/ui/Button';

export default function DeleteWithImpact({ id, action, label, noun = 'lesson' }) {
  const [state, formAction, pending] = useActionState(action, null);
  const impact = state?.ok === false ? state.impact : null;

  return (
    <div className="flex flex-col items-end gap-2">
      <form
        action={formAction}
        onSubmit={(e) => {
          if (!confirm(`Delete "${label}"?`)) e.preventDefault();
        }}
      >
        <input type="hidden" name="id" value={id} />
        <Button type="submit" variant="ghost" size="sm" isLoading={pending}>
          Delete
        </Button>
      </form>

      {state?.ok === false && state.error && (
        <p className="max-w-xs text-right text-xs text-danger-600">{state.error}</p>
      )}

      {impact && (
        <div className="max-w-sm border border-danger-600 bg-danger-50 p-3 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-danger-700">
            Not deleted: this has student history
          </p>
          <p className="mt-1 text-xs text-neutral-700">
            {impact.lessons !== undefined && `${impact.lessons} lessons, `}
            {impact.attempts} attempts and {impact.progress} progress records would be erased, and
            the measurement dashboard would lose them. To take it off the site instead, unpublish
            it.
          </p>
          <form
            action={formAction}
            className="mt-3"
            onSubmit={(e) => {
              if (!confirm(`Permanently delete "${label}" and ${impact.attempts} attempts?`)) {
                e.preventDefault();
              }
            }}
          >
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="force" value="1" />
            <Button type="submit" variant="danger" size="sm" isLoading={pending}>
              Delete permanently
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
