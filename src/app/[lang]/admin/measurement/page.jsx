import Card from '@/components/admin/ui/Card';
import Badge from '@/components/admin/ui/Badge';
import { getSkillMasteryDistribution, getLessonAccuracyStats } from '@/lib/db/measurementService';
import { requireAdmin } from '@/lib/authz';

function scoreBadgeVariant(score) {
  if (score >= 0.75) return 'success';
  if (score >= 0.5) return 'warning';
  return 'danger';
}

function pct(n) {
  return `${Math.round(n * 100)}%`;
}

export default async function AdminMeasurementPage() {
  await requireAdmin();
  const [skills, lessons] = await Promise.all([
    getSkillMasteryDistribution(),
    getLessonAccuracyStats(),
  ]);

  return (
    <div>
      <h1 className="text-2xl font-bold text-neutral-900">Measurement</h1>
      <p className="mt-1 text-sm text-neutral-500">
        Skill mastery uses a running confidence score (recent attempts weighted more). Sorted
        worst-first so the weakest spots surface.
      </p>

      <h2 className="mt-8 text-sm font-bold text-neutral-700">Skill mastery</h2>
      <Card className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs font-bold uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Skill</th>
              <th className="px-4 py-3">Mastery</th>
              <th className="px-4 py-3">Learners</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Correct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {skills.map((s) => (
              <tr key={s.skill}>
                <td className="px-4 py-3 font-semibold text-neutral-800">{s.skill}</td>
                <td className="px-4 py-3">
                  <Badge variant={scoreBadgeVariant(s.avgScore)}>{pct(s.avgScore)}</Badge>
                </td>
                <td className="px-4 py-3">{s.learners}</td>
                <td className="px-4 py-3">{s.attempts}</td>
                <td className="px-4 py-3">{s.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {skills.length === 0 && (
          <p className="p-4 text-sm text-neutral-400">
            No skill-tagged attempts yet — tag exercises with `skill:` to see data here.
          </p>
        )}
      </Card>

      <h2 className="mt-8 text-sm font-bold text-neutral-700">Lesson accuracy</h2>
      <Card className="mt-2 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-neutral-50 text-xs font-bold uppercase text-neutral-500">
            <tr>
              <th className="px-4 py-3">Lesson</th>
              <th className="px-4 py-3">Accuracy</th>
              <th className="px-4 py-3">Attempts</th>
              <th className="px-4 py-3">Correct</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100">
            {lessons.map((l) => (
              <tr key={l.lessonId}>
                <td className="px-4 py-3">
                  <p className="font-semibold text-neutral-800">{l.title}</p>
                  {l.lessonKey && <p className="text-neutral-500">{l.lessonKey}</p>}
                </td>
                <td className="px-4 py-3">
                  <Badge variant={scoreBadgeVariant(l.accuracy)}>{pct(l.accuracy)}</Badge>
                </td>
                <td className="px-4 py-3">{l.attempts}</td>
                <td className="px-4 py-3">{l.correct}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {lessons.length === 0 && (
          <p className="p-4 text-sm text-neutral-400">No attempts recorded yet.</p>
        )}
      </Card>
    </div>
  );
}
