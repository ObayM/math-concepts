'use client';

import { useActionState } from 'react';
import Button from '@/components/admin/ui/Button';

export default function PublishLessonButton({ lessonId, action }) {
  const [state, formAction, pending] = useActionState(action, null);
  const blocked = state?.ok === false && state.findings?.length > 0;

  return (
    <div className="flex flex-col items-end gap-2">
      <form action={formAction}>
        <input type="hidden" name="id" value={lessonId} />
        <Button type="submit" variant="outline" size="sm" isLoading={pending}>
          Publish
        </Button>
      </form>

      {state?.ok === false && state.error && (
        <p className="max-w-md text-right text-xs text-danger-600">{state.error}</p>
      )}

      {blocked && (
        <div className="max-w-md border border-warning-500 bg-warning-50 p-3 text-left">
          <p className="text-xs font-bold uppercase tracking-wide text-warning-600">
            Not published: {state.findings.length} content problem
            {state.findings.length === 1 ? '' : 's'}
          </p>
          <ul className="mt-2 space-y-1">
            {state.findings.map((f, i) => (
              <li key={i} className="text-xs text-neutral-700">
                <span className="font-mono text-neutral-400">{f.code}</span> {f.message}
              </li>
            ))}
          </ul>
          <form action={formAction} className="mt-3">
            <input type="hidden" name="id" value={lessonId} />
            <input type="hidden" name="force" value="1" />
            <Button type="submit" variant="danger" size="sm" isLoading={pending}>
              Publish anyway
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}
