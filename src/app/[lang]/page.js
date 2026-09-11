import Link from 'next/link';
import { ArrowRight, MousePointerClick, GitBranch, Sparkles, BookOpen } from 'lucide-react';
import Button from '@/components/ui/Button';
import Card from '@/components/ui/Card';
import Hero from '@/components/home/Hero';
import LiveDemo from '@/components/home/LiveDemo';
import BetaBanner from '@/components/i18n/BetaBanner';
import { getT } from '@/lib/i18n/server';
import { getCourses, courseUrlSlug } from '@/lib/db/courseService';
import { compileAny } from '@/components/prism/compileAny';
import { DEFAULT_LOCALE, isLocale } from '@/lib/locale';

const DEMO = `scene plane {
  x: [-5, 5]
  y: [-5, 5]
  grid
  axes

  param t = 1 { range: [-3, 3] }
  bool show = true

  curve f = x^2 { color: primary }
  point p = (t, t^2) { drag: x -> t, color: accent }
  line tangent { through: p, slope: 2*t, style: dashed, show: show }

  label at (t, t^2+0.7) = "slope = \${2*t}" { show: show }

  slider t { label: "drag me" }
  toggle show { label: "tangent line" }
}`;

export async function generateMetadata({ params }) {
  const { lang } = await params;
  const t = await getT();
  return {
    alternates: { canonical: '/' },
    description: t('home.heroBlurb'),
    openGraph: { type: 'website', locale: isLocale(lang) ? lang : DEFAULT_LOCALE },
  };
}

const eyebrow = 'text-xs font-bold uppercase tracking-[0.14em] text-neutral-400';

function Feature({ icon: Icon, title, body }) {
  return (
    <Card className="card-soft p-6 sm:p-7">
      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
        <Icon className="h-5 w-5" aria-hidden />
      </div>
      <h3 className="font-display mt-4 text-xl font-bold text-neutral-900">{title}</h3>
      <p className="mt-2 leading-relaxed text-neutral-500">{body}</p>
    </Card>
  );
}

export default async function Home({ params }) {
  const { lang } = await params;
  const t = await getT();

  const { lesson } = compileAny(DEMO);
  const courses = (await getCourses({ lang, publishedOnly: true }).catch(() => []))
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="bg-app -mt-[var(--nav-h)] pt-[var(--nav-h)]">
      <Hero />

      <main className="container mx-auto px-6 pb-24">
        <BetaBanner className="mx-auto mb-16 max-w-3xl" />

        <section className="mx-auto max-w-3xl">
          <p className={eyebrow}>{t('home.demoEyebrow')}</p>
          <h2 className="font-display mt-2 text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
            {t('home.demoTitle')}
          </h2>
          <p className="mt-3 text-lg text-neutral-500">{t('home.demoBlurb')}</p>

          <div className="mt-8">
            {lesson ? (
              <LiveDemo lesson={lesson} />
            ) : (
              <Card className="card-soft p-8 text-center text-neutral-400">
                {t('home.demoLoading')}
              </Card>
            )}
          </div>
        </section>

        <section className="mx-auto mt-24 max-w-5xl">
          <p className={`${eyebrow} text-center`}>{t('home.featuresEyebrow')}</p>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            <Feature icon={MousePointerClick} title={t('home.f1Title')} body={t('home.f1Body')} />
            <Feature icon={GitBranch} title={t('home.f2Title')} body={t('home.f2Body')} />
            <Feature icon={Sparkles} title={t('home.f3Title')} body={t('home.f3Body')} />
          </div>
        </section>

        {courses.length > 0 && (
          <section className="mx-auto mt-24 max-w-3xl">
            <p className={eyebrow}>{t('home.coursesEyebrow')}</p>
            <div className="mt-6 space-y-3">
              {courses.map((course) => (
                <Link
                  key={course.id}
                  href={`/courses/${courseUrlSlug(course)}`}
                  className="group block"
                >
                  <Card className="card-soft flex items-center gap-4 p-5 transition-colors hover:border-primary-200">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary-50 text-primary-600">
                      <BookOpen className="h-5 w-5" aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="font-display text-lg font-bold text-neutral-900">
                        {course.name}
                      </h3>
                      {course.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-neutral-500">
                          {course.description}
                        </p>
                      )}
                    </div>
                    <ArrowRight className="hidden h-4 w-4 shrink-0 text-neutral-300 transition-all group-hover:translate-x-0.5 group-hover:text-primary-500 sm:block rtl:rotate-180" />
                  </Card>
                </Link>
              ))}
            </div>
            <Link
              href="/courses"
              className="mt-5 inline-flex items-center gap-1.5 text-sm font-bold text-neutral-500 hover:text-neutral-800"
            >
              {t('home.coursesAll')}
              <ArrowRight className="h-3.5 w-3.5 rtl:rotate-180" />
            </Link>
          </section>
        )}

        <section className="mx-auto mt-24 max-w-3xl text-center">
          <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900">
            {t('home.pricingTitle')}
          </h2>
          <p className="mx-auto mt-3 max-w-xl text-lg text-neutral-500">{t('home.pricingBlurb')}</p>
        </section>

        <section className="mx-auto mt-20 max-w-3xl">
          <Card className="card-soft p-10 text-center sm:p-14">
            <h2 className="font-display text-3xl font-bold tracking-tight text-neutral-900 sm:text-4xl">
              {t('home.ctaTitle')}
            </h2>
            <p className="mx-auto mt-3 max-w-lg text-neutral-500">{t('home.ctaBlurb')}</p>
            <Button as={Link} href="/signup" size="lg" className="mt-8">
              {t('home.startFree')}
              <ArrowRight className="h-5 w-5 rtl:rotate-180" />
            </Button>
          </Card>
        </section>
      </main>
    </div>
  );
}
