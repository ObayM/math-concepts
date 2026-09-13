import { notFound } from 'next/navigation';
import { Flame, BookOpen, Award, Zap } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { getUserProfile } from '@/lib/db/userService';
import Card from '@/components/ui/Card';
import ProfileHeaderCard from '@/components/profile/ProfileHeaderCard';
import ActivityGraph from '@/components/dashboard/ActivityGraph';
import { getT } from '@/lib/i18n/server';

const MAX_SKILLS = 12;

const band = (score) =>
  score >= 0.75
    ? { label: 'profile.solid', bar: 'bg-success-500', text: 'text-success-600' }
    : score >= 0.4
      ? { label: 'profile.gettingThere', bar: 'bg-primary-500', text: 'text-primary-600' }
      : { label: 'profile.shaky', bar: 'bg-warning-500', text: 'text-warning-600' };

export default async function ProfilePage({ params }) {
  const { username } = await params;
  const t = await getT();

  const [profile, viewer] = await Promise.all([getUserProfile(username), requireUser()]);

  if (!profile) notFound();

  const isOwn = viewer?.id === profile.id;
  const skills = profile.skillMastery.slice(0, MAX_SKILLS);

  return (
    <div className="min-h-[calc(100dvh-var(--nav-h))]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <ProfileHeaderCard profile={profile} isOwn={isOwn} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            value={profile.streak}
            label={t('profile.dayStreak')}
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-primary-500" />}
            value={profile.completedCount}
            label={t('profile.lessonsDone')}
          />
          <StatCard
            icon={<Zap className="w-5 h-5 text-warning-500" />}
            value={profile.totalXp}
            label={t('profile.totalXp')}
          />
        </div>

        {profile.heatmap.length > 0 && (
          <Card className="p-6">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-5">
              {t('profile.activity')}
            </h2>
            <ActivityGraph
              activityData={profile.heatmap}
              streak={profile.streak}
              showCaption={false}
              timezone={profile.timezone}
            />
          </Card>
        )}

        {skills.length > 0 ? (
          <Card className="p-6">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-1">
              Skill Mastery
            </h2>
            <p className="mb-5 text-xs text-neutral-400">
              How confident we are right now, which leans on your recent answers more than your old
              ones.
            </p>
            <div className="space-y-4">
              {skills.map((s) => {
                const mastery = Math.round(s.score * 100);
                const accuracy = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0;
                const tone = band(s.score);
                return (
                  <div key={s.skill}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-neutral-800 capitalize">
                        {s.skill.replace(/-/g, ' ')}
                      </span>
                      <span className={`font-semibold ${tone.text}`}>
                        {mastery}%
                        <span className="ms-2 font-normal text-neutral-400">{t(tone.label)}</span>
                      </span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${tone.bar}`}
                        style={{ width: `${Math.max(mastery, 2)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-xs text-neutral-400">
                      {s.correct} of {s.attempts} right all time ({accuracy}%)
                    </p>
                  </div>
                );
              })}
            </div>
            {profile.skillMastery.length > MAX_SKILLS && (
              <p className="mt-5 text-xs text-neutral-400">
                and {profile.skillMastery.length - MAX_SKILLS} more
              </p>
            )}
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <Award className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">{t('profile.noSkills')}</p>
          </Card>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }) {
  return (
    <Card className="p-5 flex items-center gap-3">
      {icon}
      <div>
        <p className="text-2xl font-bold text-neutral-900">{value ?? 0}</p>
        <p className="text-xs text-neutral-400">{label}</p>
      </div>
    </Card>
  );
}
