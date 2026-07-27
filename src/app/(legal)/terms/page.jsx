export const metadata = {
  title: 'Terms — Mathly',
  description: 'The deal between you and Mathly.',
};

export default function TermsPage() {
  return (
    <>
      <h1 className="font-display text-4xl font-bold tracking-tight text-neutral-900">Terms</h1>
      <p className="mt-2 text-sm text-neutral-400">Last updated 27 July 2026</p>

      <Section title="The short version">
        Use Mathly to learn math. Do not abuse it, do not try to break it, and do not scrape it. We
        will do our best to keep it working and to teach you something true.
      </Section>

      <Section title="Your account">
        You are responsible for what happens under your login, so pick a real password. One account
        per person. We can suspend an account that is being used to attack the service or harass
        anyone.
      </Section>

      <Section title="The content">
        The lessons, the Prism language and the engine behind them are ours. You are welcome to
        learn from them, quote them, and tell people about them. You may not republish the course as
        your own.
      </Section>

      <Section title="What we promise">
        Honestly: this is a young product. Things will change and occasionally break. We do not
        guarantee uptime, and we are not liable if a lesson is wrong. If you find something wrong,
        tell us and we will fix it, because getting the math right is the whole point.
      </Section>

      <Section title="Ending it">
        You can stop using Mathly whenever you like and ask us to delete your account. We can close
        an account that breaks these terms.
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
