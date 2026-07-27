import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertPermission } from '@/lib/authz';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { LESSON_GEN_MODEL, aiNotConfigured, isAiConfigured } from '@/lib/ai';
import { compileLesson, CompileError, formatCompileError } from '@/engine/lang';
import { toAIContext } from '@/engine/lang/docs';

const INSTRUCTIONS = toAIContext();

const bodySchema = z.object({
  topic: z.string().min(1).max(300),
  course: z.string().max(100).optional().default(''),
  difficulty: z.string().max(50).optional().default('intermediate'),
});

export async function POST(req: Request) {
  if (!isAiConfigured()) return aiNotConfigured();

  const { ok, status, user } = await assertPermission({ content: ['create'] });
  if (!ok || !user) return NextResponse.json({ error: 'Forbidden' }, { status: status ?? 403 });

  const limit = await consume(user.id, 'generate-lesson');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { topic, course, difficulty } = parsed.data;

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

Return ONLY the Prism source, starting with \`lesson "Title" { ... }\`. No markdown, no explanation.`,
      maxOutputTokens: 4096,
      abortSignal: AbortSignal.timeout(60_000),
    });
    prism = result.text;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'AI generation failed', detail: message }, { status: 502 });
  }

  try {
    const lesson = compileLesson(prism);
    return NextResponse.json({ lesson, prism });
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
