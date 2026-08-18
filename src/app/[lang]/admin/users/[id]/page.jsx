import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireAdmin, isSuperAdmin } from '@/lib/authz';
import { getStudentDetail } from '@/lib/db/measurementService';
import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import ConfirmSubmitButton from '@/components/admin/ConfirmSubmitButton';
import { resetStudentLessonAction } from './actions';

const masteryVariant = (score) => (score >= 0.75 ? 'success' : score >= 0.5 ? 'warning' : 'danger');
const pct = (n) => `${Math.round(n * 100)}%`;

function Stat({ label, value }) {
  return (
    <Card className="p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-neutral-900">{value}</p>
    </Card>
  );
}

export default async function StudentDetailPage({ params }) {
  const viewer = await requireAdmin();
  const { id } = await params;
  const detail = await getStudentDetail(id);
  if (!detail) notFound();

  const { user, progress, recentAttempts, totalXp } = detail;
  const canReset = isSuperAdmin(viewer);
  const completed = progress.filter((p) => p.completed).length;

  return (
    <div>
      <Link href="/admin/users" className="text-sm font-semibold text-primary-700 hover:underline">
        ← Users
      </Link>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <h1 className="text-2xl font-bold text-neutral-900">{user.name}</h1>
        <Badge variant={user.role === 'student' ? 'neutral' : 'primary'}>
          {user.role ?? 'student'}
        </Badge>
        {user.banned && <Badge variant="warning">Banned</Badge>}
      </div>
      <p className="text-sm text-neutral-500">
        {user.email}
        {user.username && ` · @${user.username}`} · joined{' '}
        {user.createdAt.toISOString().slice(0, 10)}
        {user.timezone && ` · ${user.timezone}`}
      </p>

      <div className="mt-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <Stat label="Lessons completed" value={completed} />
        <Stat label="Lessons touched" value={progress.length} />
        <Stat label="Skills tracked" value={user.skillMastery.length} />
        <Stat label="Lifetime XP" value={totalXp} />
      </div>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">
        Skill mastery
      </h2>
      <Card className="mt-3 overflow-x-auto">
        {user.skillMastery.length === 0 ? (
          <p className="p-4 text-sm text-neutral-400">No skill-tagged attempts yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-bold uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Skill</th>
                <th className="px-4 py-2">Mastery</th>
                <th className="px-4 py-2">Attempts</th>
                <th className="px-4 py-2">Correct</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {user.skillMastery.map((s) => (
                <tr key={s.skill}>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-700">{s.skill}</td>
                  <td className="px-4 py-2">
                    <Badge variant={masteryVariant(s.score)}>{pct(s.score)}</Badge>
                  </td>
                  <td className="px-4 py-2">{s.attempts}</td>
                  <td className="px-4 py-2">{s.correct}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">Progress</h2>
      <Card className="mt-3 overflow-x-auto">
        {progress.length === 0 ? (
          <p className="p-4 text-sm text-neutral-400">Hasn&apos;t started a lesson yet.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-bold uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">Lesson</th>
                <th className="px-4 py-2">State</th>
                <th className="px-4 py-2">Last played</th>
                {canReset && <th className="px-4 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {progress.map((p) => (
                <tr key={p.lesson.id}>
                  <td className="px-4 py-2 text-neutral-800">
                    {p.lesson.title ?? p.lesson.lessonKey}
                  </td>
                  <td className="px-4 py-2">
                    {p.completed ? (
                      <Badge variant="success">completed</Badge>
                    ) : (
                      <Badge variant="neutral">step {p.currentStep}</Badge>
                    )}
                  </td>
                  <td className="px-4 py-2 text-neutral-500">
                    {p.lastPlayedAt.toISOString().slice(0, 10)}
                  </td>
                  {canReset && (
                    <td className="px-4 py-2 text-right">
                      <form action={resetStudentLessonAction}>
                        <input type="hidden" name="userId" value={user.id} />
                        <input type="hidden" name="lessonKey" value={p.lesson.lessonKey} />
                        <ConfirmSubmitButton
                          confirmText={`Reset ${user.name}'s progress on "${p.lesson.title ?? p.lesson.lessonKey}"? Their attempts on it are deleted and their mastery is rebuilt from what is left.`}
                          variant="ghost"
                          size="sm"
                        >
                          Reset
                        </ConfirmSubmitButton>
                      </form>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      <h2 className="mt-8 text-sm font-bold uppercase tracking-wide text-neutral-500">
        Recent answers
      </h2>
      <Card className="mt-3 overflow-x-auto">
        {recentAttempts.length === 0 ? (
          <p className="p-4 text-sm text-neutral-400">No answers recorded.</p>
        ) : (
          <table className="w-full text-left text-sm">
            <thead className="bg-neutral-50 text-xs font-bold uppercase text-neutral-500">
              <tr>
                <th className="px-4 py-2">When</th>
                <th className="px-4 py-2">Lesson</th>
                <th className="px-4 py-2">Skill</th>
                <th className="px-4 py-2">Question</th>
                <th className="px-4 py-2">Result</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100">
              {recentAttempts.map((a) => (
                <tr key={a.id}>
                  <td className="whitespace-nowrap px-4 py-2 font-mono text-xs text-neutral-500">
                    {a.createdAt.toISOString().slice(0, 16).replace('T', ' ')}
                  </td>
                  <td className="px-4 py-2 text-neutral-700">
                    {a.lesson.title ?? a.lesson.lessonKey}
                  </td>
                  <td className="px-4 py-2 font-mono text-xs text-neutral-500">{a.skill ?? '—'}</td>
                  <td dir="auto" className="max-w-md truncate px-4 py-2 text-neutral-600">
                    {a.question}
                  </td>
                  <td className="px-4 py-2">
                    <Badge variant={a.correct ? 'success' : 'danger'}>
                      {a.correct ? 'correct' : 'wrong'}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
