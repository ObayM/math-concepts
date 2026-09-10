import { randomUUID } from 'node:crypto';
import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { assertPermission } from '@/lib/authz';
import { consume, tooManyRequests } from '@/lib/rate-limit';
import { spendQuota, quotaExceeded } from '@/lib/ai-quota';
import { SCENE_GEN_MODEL, aiNotConfigured, isAiConfigured } from '@/lib/ai';
import { compile, CompileError, formatCompileError } from '@/engine';
import { toAIContext } from '@/engine/lang/docs';
import { authoringDirective, REGISTERS } from '@/lib/ai-authoring';
import { LOCALES } from '@/lib/locale';

const INSTRUCTIONS = toAIContext();

const bodySchema = z.object({
  concept: z.string().min(1).max(300),
  difficulty: z.string().max(50).optional().default('intermediate'),
  context: z.string().max(4000).optional().default(''),
  lang: z.enum(LOCALES).optional().default('en'),
  register: z.enum(REGISTERS).optional().default('msa-simple'),
});

export async function POST(req: Request) {
  if (!isAiConfigured()) return aiNotConfigured();

  const { ok, status, user } = await assertPermission({ content: ['create'] });
  if (!ok || !user) return NextResponse.json({ error: 'Forbidden' }, { status: status ?? 403 });

  const limit = await consume(user.id, 'generate');
  if (!limit.ok) return tooManyRequests(limit.retryAfterMs);

  const quota = await spendQuota(user.id, 'generate-scene');
  if (!quota.ok) return quotaExceeded(quota);

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { concept, difficulty, context, lang, register } = parsed.data;

  let prism: string;
  try {
    const result = await generateText({
      model: SCENE_GEN_MODEL,
      instructions: INSTRUCTIONS,
      prompt: `Write a Prism scene that helps a learner understand: "${concept}".
Difficulty: ${difficulty}.${context ? `\nLesson context: ${context}` : ''}

Make it genuinely interactive — the learner should manipulate something and see math respond.
Return ONLY the Prism source. No markdown, no explanation.${authoringDirective(lang, register)}`,
      maxOutputTokens: 2048,
      abortSignal: AbortSignal.timeout(45_000),
    });
    prism = result.text;
  } catch (err: unknown) {
    const reference = randomUUID();
    console.error(`[ai/generate-scene] %s`, reference, err);
    return NextResponse.json({ error: 'AI generation failed', reference }, { status: 502 });
  }

  try {
    const scene = compile(prism);
    return NextResponse.json({ scene, prism });
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
