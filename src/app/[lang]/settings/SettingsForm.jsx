'use client';

import { useState } from 'react';
import Card from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { authClient, changePassword } from '@/lib/auth-client';
import { PASSWORD_MIN } from '@/lib/password';
import { useT } from '@/components/i18n/LocaleProvider';

export default function SettingsForm({ reminderEmails, emailVerified }) {
  const t = useT();
  const [reminders, setReminders] = useState(reminderEmails);
  const [savingReminders, setSavingReminders] = useState(false);
  const [reminderNote, setReminderNote] = useState('');
  const [resending, setResending] = useState(false);
  const [resendNote, setResendNote] = useState('');

  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [pwBusy, setPwBusy] = useState(false);
  const [pwNote, setPwNote] = useState('');
  const [pwError, setPwError] = useState('');

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState('');
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  const canDelete = deleteConfirm.trim().toLowerCase() === 'delete' && deletePassword.length > 0;

  const deleteAccount = async (e) => {
    e.preventDefault();
    if (!canDelete || deleteBusy) return;
    setDeleteBusy(true);
    setDeleteError('');
    try {
      const { error } = await authClient.deleteUser({ password: deletePassword });
      if (error) {
        setDeleteError(error.message ?? t('settings.deleteFailed'));
        setDeleteBusy(false);
        return;
      }
      window.location.href = '/';
    } catch {
      setDeleteError(t('error.generic'));
      setDeleteBusy(false);
    }
  };

  const toggleReminders = async () => {
    const value = !reminders;
    setReminders(value);
    setSavingReminders(true);
    setReminderNote('');
    try {
      const res = await fetch('/api/user/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminderEmails: value }),
      });
      if (!res.ok) throw new Error('failed');
      setReminderNote(t('settings.saved'));
    } catch {
      setReminders(!value);
      setReminderNote(t('settings.saveFailed'));
    } finally {
      setSavingReminders(false);
    }
  };

  const submitPassword = async (e) => {
    e.preventDefault();
    setPwBusy(true);
    setPwNote('');
    setPwError('');
    const { error } = await changePassword({
      currentPassword: current,
      newPassword: next,
      revokeOtherSessions: true,
    });
    setPwBusy(false);
    if (error) {
      setPwError(error.message ?? t('settings.wrongCurrent'));
      return;
    }
    setCurrent('');
    setNext('');
    setPwNote(t('settings.passwordChanged'));
  };

  async function resendVerification() {
    setResending(true);
    setResendNote('');
    try {
      const res = await fetch('/api/user/resend-verification', { method: 'POST' });
      const body = await res.json().catch(() => ({}));
      setResendNote(res.ok ? t('settings.resent') : (body.error ?? t('settings.resendFailed')));
    } catch {
      setResendNote(t('settings.offline'));
    } finally {
      setResending(false);
    }
  }

  return (
    <div className="mt-8 space-y-6">
      <Card className="card-soft p-6">
        <h2 className="font-display text-xl font-bold text-neutral-900">
          {t('settings.reminders')}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{t('settings.remindersBlurb')}</p>

        <div className="mt-5 flex items-center justify-between gap-4">
          <span className="font-semibold text-neutral-700">{t('settings.remindersLabel')}</span>
          <button
            type="button"
            role="switch"
            aria-checked={reminders}
            aria-label={t('settings.remindersLabel')}
            disabled={savingReminders}
            onClick={toggleReminders}
            className={`relative h-7 w-12 shrink-0 rounded-full transition-colors disabled:opacity-60 ${
              reminders ? 'bg-primary-500' : 'bg-neutral-300'
            }`}
          >
            <span
              className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
                reminders ? 'start-6' : 'start-1'
              }`}
            />
          </button>
        </div>

        {!emailVerified && (
          <div className="mt-4 rounded-xl bg-warning-50 px-4 py-3">
            <p className="text-sm text-warning-700">
              Your email isn&apos;t verified yet, so nothing will be sent either way.
            </p>
            <div className="mt-3 flex items-center gap-3">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                onClick={resendVerification}
                disabled={resending}
              >
                {resending ? t('settings.sending') : t('settings.resend')}
              </Button>
              {resendNote && <span className="text-sm text-neutral-600">{resendNote}</span>}
            </div>
          </div>
        )}
        {reminderNote && <p className="mt-3 text-sm text-neutral-500">{reminderNote}</p>}
      </Card>

      <Card className="card-soft p-6">
        <h2 className="font-display text-xl font-bold text-neutral-900">
          {t('settings.password')}
        </h2>
        <form method="post" onSubmit={submitPassword} className="mt-5 space-y-4">
          <div>
            <label htmlFor="current" className="text-sm font-semibold text-neutral-700">
              {t('settings.currentPasswordLabel')}
            </label>
            <input
              id="current"
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              autoComplete="current-password"
              required
              className="mt-1.5 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="next" className="text-sm font-semibold text-neutral-700">
              {t('settings.newPasswordLabel')}
            </label>
            <input
              id="next"
              type="password"
              value={next}
              onChange={(e) => setNext(e.target.value)}
              autoComplete="new-password"
              minLength={PASSWORD_MIN}
              required
              className="mt-1.5 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {pwError && <p className="text-sm font-semibold text-danger-600">{pwError}</p>}
          {pwNote && <p className="text-sm font-semibold text-success-600">{pwNote}</p>}

          <Button
            type="submit"
            variant="primary"
            disabled={pwBusy || !current || next.length < PASSWORD_MIN}
          >
            {pwBusy ? t('settings.changing') : t('settings.changePassword')}
          </Button>
        </form>
      </Card>

      <Card className="border-danger-200 p-6">
        <h2 className="font-display text-xl font-bold text-neutral-900">
          {t('settings.deleteTitle')}
        </h2>
        <p className="mt-1 text-sm text-neutral-500">{t('settings.deleteBlurb')}</p>

        {!deleteOpen ? (
          <Button
            type="button"
            variant="outline"
            className="mt-4 border-danger-300 text-danger-600 hover:bg-danger-50"
            onClick={() => setDeleteOpen(true)}
          >
            {t('settings.deleteCta')}
          </Button>
        ) : (
          <form onSubmit={deleteAccount} className="mt-4 space-y-4">
            <div>
              <label htmlFor="delete-password" className="text-sm font-semibold text-neutral-700">
                {t('settings.deletePassword')}
              </label>
              <input
                id="delete-password"
                type="password"
                value={deletePassword}
                onChange={(e) => setDeletePassword(e.target.value)}
                autoComplete="current-password"
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:ring-2 focus:ring-danger-500"
              />
            </div>

            <div>
              <label htmlFor="delete-confirm" className="text-sm font-semibold text-neutral-700">
                {t('settings.deleteConfirmLabel', { word: t('settings.deleteConfirmWord') })}
              </label>
              <input
                id="delete-confirm"
                type="text"
                value={deleteConfirm}
                onChange={(e) => setDeleteConfirm(e.target.value)}
                autoComplete="off"
                className="mt-1.5 w-full rounded-xl border border-neutral-200 px-4 py-3 outline-none focus:ring-2 focus:ring-danger-500"
              />
            </div>

            {deleteError && <p className="text-sm font-semibold text-danger-600">{deleteError}</p>}

            <div className="flex items-center gap-3">
              <Button
                type="submit"
                variant="primary"
                disabled={!canDelete || deleteBusy}
                className="bg-danger-600 border-danger-800 hover:bg-danger-500"
              >
                {deleteBusy ? t('settings.deleting') : t('settings.deleteGo')}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeletePassword('');
                  setDeleteConfirm('');
                  setDeleteError('');
                }}
              >
                {t('settings.deleteKeep')}
              </Button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
