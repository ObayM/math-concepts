import { streamText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { spendQuota, recordTokens, quotaExceeded } from '@/lib/ai-quota';
import { TUTOR_MODEL, aiNotConfigured, isAiConfigured } from '@/lib/ai';
import { getLessonByKey } from '@/lib/db/lessonService';
import { getMyMastery } from '@/lib/db/progressService';
import { lessonSchema } from '@/engine/ir/lesson';
import { DEFAULT_LOCALE, isLocale } from '@/lib/locale';
import {
  MAX_QUESTION_CHARS,
  MAX_HISTORY_TURNS,
  MAX_TURN_CHARS,
  buildTutorContext,
  buildTutorRequest,
} from '@/lib/tutor';

const bodySchema = z.object({
  lessonKey: z.string().min(1).max(200),
  slideId: z.string().min(1).max(200),
  question: z.string().trim().min(1).max(MAX_QUESTION_CHARS),
  checked: z.boolean().optional(),
  correct: z.boolean().optional(),
  answer: z.unknown().optional(),
  scope: z.record(z.string(), z.unknown()).optional(),
  history: z
    .array(
      z.object({
        role: z.enum(['user', 'assistant']),
        content: z.string().max(MAX_TURN_CHARS),
      })
    )
    .max(MAX_HISTORY_TURNS * 2)
    .optional(),
});

export async function POST(req: Request) {
  if (!isAiConfigured()) return aiNotConfigured();

  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const limit = await consume(user.id, 'chat');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const quota = await spendQuota(user.id, 'chat');
  if (!quota.ok) return quotaExceeded(quota);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { lessonKey, slideId, question, checked, correct, answer, scope, history } = parsed.data;

  const row = await getLessonByKey(lessonKey);
  const ir = lessonSchema.safeParse(row?.publishedData);
  if (!row || row.status !== 'published' || !ir.success) {
    return NextResponse.json({ error: 'Lesson not found' }, { status: 404 });
  }

  const slide = ir.data.slides.find((s) => s.id === slideId);
  if (!slide) return NextResponse.json({ error: 'Slide not found' }, { status: 404 });

  const skill = slide.exercise?.skill ?? slide.skill;
  const mastery = skill ? ((await getMyMastery(user.id))[skill] ?? null) : null;

  const ctx = buildTutorContext(ir.data, slideId, { checked, correct, answer, scope, mastery });
  if (!ctx) return NextResponse.json({ error: 'Slide not found' }, { status: 404 });

  const lang = isLocale(row.course?.lang) ? row.course.lang : DEFAULT_LOCALE;
  const { instructions, messages } = buildTutorRequest(ctx, history, question, lang);

  try {
    const result = streamText({
      model: TUTOR_MODEL,
      instructions,
      messages,
      maxOutputTokens: 1200,
      abortSignal: AbortSignal.timeout(30_000),
      onError: ({ error }) => console.error('tutor stream failed', error),
      onFinish: ({ usage }) =>
        recordTokens(user.id, 'chat', {
          inputTokens: usage?.inputTokens,
          outputTokens: usage?.outputTokens,
        }),
    });
    return result.toTextStreamResponse();
  } catch {
    return NextResponse.json({ error: 'Tutor is unavailable right now' }, { status: 502 });
  }
}
