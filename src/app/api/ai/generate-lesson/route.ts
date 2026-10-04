import { randomUUID } from 'node:crypto';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertPermission } from '@/lib/authz';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { spendQuota, quotaExceeded } from '@/lib/ai-quota';
import { LESSON_GEN_MODEL, aiNotConfigured, isAiConfigured } from '@/lib/ai';
import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';
import { verifyLesson } from '@/engine/verify';
import { toAIContext } from '@/engine/lang/docs';
import { authoringDirective, REGISTERS, stripFence } from '@/lib/ai-authoring';
import { LOCALES } from '@/lib/locale';

const INSTRUCTIONS = toAIContext();

const bodySchema = z.object({
  // a revision or a fix-up retry carries the whole lesson source inside topic
  topic: z.string().min(1).max(72_000),
  course: z.string().max(100).optional().default(''),
  difficulty: z.string().max(50).optional().default('intermediate'),
  lang: z.enum(LOCALES).optional().default('en'),
  register: z.enum(REGISTERS).optional().default('msa-simple'),
  standalone: z.boolean().optional().default(false),
});

const STANDALONE = `

This is a standalone topic, not part of a course. Teach exactly one idea and
assume no earlier lesson: whatever it leans on gets a one-line reminder, not a
detour. Size it to the idea, short when the idea is small. Set \`unit:\` to the
broad subject it belongs under (e.g. "Calculus", "Algebra", "Trigonometry",
"Mechanics"), since the topics library groups by it.`;

export async function POST(req: Request) {
  if (!isAiConfigured()) return aiNotConfigured();

  const { ok, status, user } = await assertPermission({ content: ['create'] });
  if (!ok || !user) return NextResponse.json({ error: 'Forbidden' }, { status: status ?? 403 });

  const limit = await consume(user.id, 'generate-lesson');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const quota = await spendQuota(user.id, 'generate-lesson');
  if (!quota.ok) return quotaExceeded(quota);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { topic, course, difficulty, lang, register, standalone } = parsed.data;

  let prism: string;
  try {
    const result = await generateText({
      model: LESSON_GEN_MODEL,
      instructions: INSTRUCTIONS,
      prompt: `Write a full Prism lesson that teaches: "${topic}".
Difficulty: ${difficulty}.${course ? `\nCourse: ${course}` : ''}

Compose several slides (prose, an interactive scene, and at least one exercise)
that build understanding step by step, the way the cookbook patterns do. Every
slide with a scene should be genuinely interactive — the learner manipulates
something and sees math respond, not a static picture.

Return ONLY the Prism source, starting with \`lesson "Title" { ... }\`. No markdown, no explanation.${standalone ? STANDALONE : ''}${authoringDirective(lang, register)}`,
      maxOutputTokens: 4096,
      abortSignal: AbortSignal.timeout(60_000),
    });
    prism = stripFence(result.text);
  } catch (err: unknown) {
    const reference = randomUUID();
    console.error(`[ai/generate-lesson] %s`, reference, err);
    return NextResponse.json({ error: 'AI generation failed', reference }, { status: 502 });
  }

  try {
    const lesson = compileLesson(prism);
    return NextResponse.json({ lesson, prism, findings: verifyLesson(lesson) });
  } catch (err: unknown) {
    // a caret frame in the detail lets the model see exactly what broke and retry
    const detail =
      err instanceof CompileError
        ? formatCompileError(prism, err)
        : err instanceof Error
          ? err.message
          : String(err);
    return NextResponse.json({ error: 'Compile failed', detail, prism }, { status: 422 });
  }
}
