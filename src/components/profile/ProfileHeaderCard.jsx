'use client';

import { useState } from 'react';
import { Edit2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { displayName as nameFor } from '@/lib/user-name';

export function avatarColor(str) {
  const colors = [
    'bg-primary-500',
    'bg-emerald-500',
    'bg-violet-500',
    'bg-amber-500',
    'bg-sky-500',
    'bg-rose-500',
  ];
  let hash = 0;
  for (let i = 0; i < str.length; i++) hash = (hash * 31 + str.charCodeAt(i)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

export function Avatar({ name, image, size = 'lg' }) {
  const initials = (name || '?')
    .split(' ')
    .map((w) => w[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const sizeClass = size === 'lg' ? 'w-20 h-20 text-2xl' : 'w-8 h-8 text-sm';
  const color = avatarColor(name || '?');

  if (image) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border border-neutral-200`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} ${color} rounded-full flex items-center justify-center font-bold text-white shrink-0`}
    >
      {initials}
    </div>
  );
}

export default function ProfileHeaderCard({ profile, isOwn }) {
  const [editing, setEditing] = useState(false);
  const [nameVal, setNameVal] = useState(profile.name || '');
  const [imageVal, setImageVal] = useState(profile.image || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  function cancel() {
    setEditing(false);
    setNameVal(profile.name || '');
    setImageVal(profile.image || '');
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nameVal.trim() || null,
          image: imageVal.trim() || null,
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error || 'Failed to save');
        return;
      }
      setEditing(false);
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setSaving(false);
    }
  }

  const displayName = editing
    ? nameVal || profile.displayUsername
    : nameFor(profile, profile.displayUsername ?? '');
  const displayImage = editing ? imageVal || null : profile.image;

  return (
    <Card className="p-6">
      <div className="flex items-start gap-5">
        <Avatar name={displayName} image={displayImage} />
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-neutral-900 truncate">{displayName}</h1>
          <p className="text-neutral-400 text-sm">@{profile.displayUsername}</p>
          <p className="text-neutral-400 text-xs mt-1">
            Member since{' '}
            {new Date(profile.createdAt).toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </p>
        </div>
        {isOwn && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="shrink-0 flex items-center gap-1.5 text-xs text-neutral-400 hover:text-neutral-700 transition-colors px-2 py-1.5 rounded-md hover:bg-neutral-100"
          >
            <Edit2 className="w-3.5 h-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing && (
        <div className="mt-5 pt-5 border-t border-neutral-100 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
                Display Name
              </label>
              <Input
                value={nameVal}
                onChange={(e) => setNameVal(e.target.value)}
                placeholder="Your name"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-500 mb-1.5">
                Avatar URL
              </label>
              <Input
                value={imageVal}
                onChange={(e) => setImageVal(e.target.value)}
                placeholder="https://..."
              />
            </div>
          </div>
          {error && <p className="text-xs text-danger-600">{error}</p>}
          <div className="flex items-center gap-2">
            <Button variant="primary" size="sm" onClick={handleSave} isLoading={saving}>
              Save
            </Button>
            <Button variant="ghost" size="sm" onClick={cancel}>
              Cancel
            </Button>
          </div>
        </div>
      )}
    </Card>
  );
}
