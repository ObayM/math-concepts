'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Search, Check, ChevronRight } from 'lucide-react';
import { iconMap } from '@/components/lib/IconMap';
import Input from '@/components/ui/Input';
import Card from '@/components/ui/Card';
import Badge from '@/components/ui/Badge';
import { useT } from '@/components/i18n/LocaleProvider';

export default function TopicList({ groups, completed }) {
  const t = useT();
  const [query, setQuery] = useState('');
  const done = new Set(completed);
  const q = query.trim().toLowerCase();

  const shown = groups
    .map((g) => ({
      ...g,
      lessons: q
        ? g.lessons.filter((l) =>
            [l.title, l.description, g.unit].some((s) => s?.toLowerCase().includes(q))
          )
        : g.lessons,
    }))
    .filter((g) => g.lessons.length);

  if (!groups.length) {
    return (
      <Card className="card-soft mt-10 p-8 text-center">
        <p className="text-neutral-400">{t('topics.empty')}</p>
      </Card>
    );
  }

  return (
    <>
      <div className="mt-8 max-w-md">
        <Input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('topics.search')}
          aria-label={t('topics.search')}
          icon={<Search className="h-4 w-4" />}
        />
      </div>

      <div className="mt-10 space-y-10">
        {shown.map((group) => (
          <section key={group.unit ?? ''}>
            <h2 className="mb-4 font-display text-xl font-bold text-neutral-900">
              {group.unit ?? t('topics.other')}
            </h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {group.lessons.map((lesson) => {
                const Icon = iconMap[lesson.iconName] || iconMap['FunctionSquare'];
                const isDone = done.has(lesson.lessonKey);
                return (
                  <Link
                    key={lesson.lessonKey}
                    href={`/topics/${lesson.lessonKey}`}
                    className="group block"
                  >
                    <Card className="card-soft flex h-full items-start gap-3 p-4 transition-colors group-hover:border-primary-200 group-hover:bg-primary-50">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary-50 text-primary-600">
                        <Icon size={18} />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold leading-tight text-neutral-900">{lesson.title}</p>
                        {lesson.description && (
                          <p className="mt-1 text-sm text-neutral-500 line-clamp-2">
                            {lesson.description}
                          </p>
                        )}
                      </div>
                      {isDone ? (
                        <Badge variant="success" className="shrink-0 text-xs">
                          <Check size={12} strokeWidth={3} /> {t('topics.done')}
                        </Badge>
                      ) : (
                        <ChevronRight
                          size={16}
                          className="mt-1 shrink-0 text-neutral-300 transition-all group-hover:text-primary-500"
                        />
                      )}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
        {!shown.length && <p className="text-neutral-400">{t('topics.noResults')}</p>}
      </div>
    </>
  );
}
