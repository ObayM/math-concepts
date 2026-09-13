import { supportEmail } from '@/lib/support';

export const metadata = {
  title: 'Privacy — Mathly',
  description: 'What Mathly stores about you, and why.',
};

export default function PrivacyPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900">Privacy</h1>
      <p className="mt-2 text-sm text-neutral-400">Last updated 27 July 2026</p>

      <Section title="What we store">
        Your email and password (hashed, never in plain text), the username you pick, and an
        optional display name and avatar URL. If you use the app we also store which lessons you
        have played, the answers you submitted, how confident we are in each skill, and a per-day
        count of the XP you earned. We record your browser&apos;s timezone so streaks roll over at
        your midnight rather than ours.
      </Section>

      <Section title="What we do with it">
        We use it to run the product: show your progress, pick what to practice next, and keep your
        streak honest. Nothing is sold, and nothing is shared with advertisers.
      </Section>

      <Section title="The AI tutor">
        When you ask the tutor a question, we send that question, the slide you are on, and your
        answer to Hack Club AI so it can reply. We do not send your email, name, or anything from
        other lessons.
      </Section>

      <Section title="Email">
        We send you a verification email when you sign up, a reset link if you ask for one, and
        streak reminders. You can turn reminders off in settings at any time.
      </Section>

      <Section title="Your data">
        Your public profile shows your display name, username, streak, lessons completed and skill
        mastery. Everything else is private to you. Ask us and we will delete your account and
        everything attached to it.
      </Section>

      <Section title="Contact">
        Questions about any of this, or you want your account and data deleted: email{' '}
        <a href={`mailto:${supportEmail()}`} className="font-semibold text-primary-600 underline">
          {supportEmail()}
        </a>{' '}
        and we will answer properly.
      </Section>
    </>
  );
}

function Section({ title, children }) {
  return (
    <section className="mt-10">
      <h2 className="text-lg font-bold text-neutral-900">{title}</h2>
      <p className="mt-2 leading-relaxed text-neutral-600">{children}</p>
    </section>
  );
}
