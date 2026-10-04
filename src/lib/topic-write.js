import { z } from 'zod';
import { NextResponse } from 'next/server';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { saveTopic } from '@/lib/db/contentService';
import { recordAudit, AUDIT } from '@/lib/db/auditService';
import { LOCALES } from '@/lib/locale';
import { originForLocale, hasLocaleOrigins } from '@/lib/origin';

const bodySchema = z
  .object({
    source: z.string().min(1).max(65_536),
    lang: z.enum(LOCALES).optional(),
    key: z.string().min(1).max(200).optional(),
    publish: z.boolean().optional().default(false),
  })
  .refine((b) => b.key || b.lang, { message: 'lang is required for a new topic' });

export function topicUrl(lesson) {
  const lang = lesson.lang ?? 'en';
  const query = !hasLocaleOrigins && lang !== 'en' ? `?lang=${lang}` : '';
  return `${originForLocale(lang)}/topics/${lesson.lessonKey}${query}`;
}

export async function writeTopic(request, { actor, rateKey }) {
  const limit = await consume(rateKey, 'content-save');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid request body', issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const result = await saveTopic({ ...parsed.data, authorId: actor?.id ?? null });
  if (result.notFound)
    return NextResponse.json({ error: 'No topic with that key' }, { status: 404 });
  if (result.error) {
    return NextResponse.json({ error: 'Compile failed', detail: result.error }, { status: 422 });
  }

  const { lesson } = result;
  const target = { type: 'lesson', id: lesson.id, label: lesson.title ?? lesson.lessonKey };
  const meta = { topic: true, lessonKey: lesson.lessonKey };
  if (result.created) await recordAudit({ action: AUDIT.LESSON_CREATED, target, meta, actor });
  if (result.published) await recordAudit({ action: AUDIT.LESSON_PUBLISHED, target, meta, actor });

  return NextResponse.json(
    {
      id: lesson.id,
      key: lesson.lessonKey,
      url: topicUrl(lesson),
      status: lesson.status,
      published: result.published,
      findings: result.findings,
      blocking: result.blocking ?? [],
    },
    { status: result.created ? 201 : 200 }
  );
}
