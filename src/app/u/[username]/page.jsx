import { notFound } from 'next/navigation';
import { Flame, BookOpen, Award } from 'lucide-react';
import { requireUser } from '@/lib/session';
import { getUserProfile } from '@/lib/db/userService';
import Card from '@/components/ui/Card';
import ProfileHeaderCard from '@/components/profile/ProfileHeaderCard';

export default async function ProfilePage({ params }) {
  const { username } = await params;

  const [profile, viewer] = await Promise.all([getUserProfile(username), requireUser()]);

  if (!profile) notFound();

  const isOwn = viewer?.id === profile.id;

  return (
    <div className="bg-grid-snow min-h-[calc(100vh-var(--nav-h))]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-12 space-y-6">
        <ProfileHeaderCard profile={profile} isOwn={isOwn} />

        <div className="grid grid-cols-2 gap-4">
          <StatCard
            icon={<Flame className="w-5 h-5 text-orange-500" />}
            value={profile.streak}
            label="day streak"
          />
          <StatCard
            icon={<BookOpen className="w-5 h-5 text-primary-500" />}
            value={profile.completedCount}
            label="lessons done"
          />
        </div>

        {profile.skillMastery.length > 0 ? (
          <Card className="p-6">
            <h2 className="text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-5">
              Skill Mastery
            </h2>
            <div className="space-y-4">
              {profile.skillMastery.map((s) => {
                const accuracy = s.attempts > 0 ? Math.round((s.correct / s.attempts) * 100) : 0;
                return (
                  <div key={s.skill}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-medium text-neutral-800 capitalize">
                        {s.skill.replace(/-/g, ' ')}
                      </span>
                      <span className="text-neutral-400">{accuracy}%</span>
                    </div>
                    <div className="h-2 bg-neutral-100 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-primary-500 rounded-full transition-all"
                        style={{ width: `${accuracy}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ) : (
          <Card className="p-8 text-center">
            <Award className="w-8 h-8 text-neutral-300 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">No skills tracked yet, keep learning!</p>
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
