'use client';

import { useActionState, useState } from 'react';
import Badge from '@/components/admin/ui/Badge';
import Button from '@/components/admin/ui/Button';
import Input from '@/components/admin/ui/Input';

function Reorder({ id, action }) {
  return (
    <div className="flex">
      {['up', 'down'].map((direction) => (
        <form key={direction} action={action}>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="direction" value={direction} />
          <button
            type="submit"
            aria-label={`Move ${direction}`}
            className="border border-neutral-200 bg-white px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-50"
          >
            {direction === 'up' ? '▲' : '▼'}
          </button>
        </form>
      ))}
    </div>
  );
}

export default function CourseHeaderRow({
  course,
  updateAction,
  publishAction,
  unpublishAction,
  moveAction,
  children,
}) {
  const [editing, setEditing] = useState(false);
  const [updateState, update, updating] = useActionState(updateAction, null);
  const [publishState, publish, publishing] = useActionState(
    course.status === 'published' ? unpublishAction : publishAction,
    null
  );

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        {editing ? (
          <form
            action={async (formData) => {
              await update(formData);
              setEditing(false);
            }}
            className="flex flex-wrap items-center gap-2"
          >
            <input type="hidden" name="id" value={course.id} />
            <Input
              name="name"
              defaultValue={course.name}
              className="w-48"
              aria-label="Course name"
            />
            <Input
              name="description"
              defaultValue={course.description ?? ''}
              placeholder="Description"
              className="w-72"
              aria-label="Course description"
            />
            <Button type="submit" variant="primary" size="sm" isLoading={updating}>
              Save
            </Button>
            <Button type="button" variant="ghost" size="sm" onClick={() => setEditing(false)}>
              Cancel
            </Button>
          </form>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-neutral-900">{course.name}</h2>
              <Badge variant={course.status === 'published' ? 'success' : 'neutral'}>
                {course.status}
              </Badge>
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-xs font-semibold text-primary-700 hover:underline"
              >
                Edit
              </button>
            </div>
            {course.description && (
              <p className="mt-1 max-w-2xl text-sm text-neutral-500">{course.description}</p>
            )}
          </>
        )}
        {updateState?.ok === false && updateState.error && (
          <p className="mt-1 text-xs text-danger-600">{updateState.error}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-2">
        <div className="flex items-center gap-2">
          <Reorder id={course.id} action={moveAction} />
          <form action={publish}>
            <input type="hidden" name="id" value={course.id} />
            <input type="hidden" name="name" value={course.name} />
            <Button type="submit" variant="outline" size="sm" isLoading={publishing}>
              {course.status === 'published' ? 'Unpublish' : 'Publish course'}
            </Button>
          </form>
          {children}
        </div>
        {publishState?.ok === false && publishState.error && (
          <p className="max-w-xs text-right text-xs text-danger-600">{publishState.error}</p>
        )}
      </div>
    </div>
  );
}
