import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume } from '@/lib/rate-limit';
import { SCENE_GEN_MODEL } from '@/lib/ai';
import { compile, CompileError, formatCompileError } from '@/engine';
import { toAIContext } from '@/engine/lang/docs';

const INSTRUCTIONS = toAIContext();

const bodySchema = z.object({
  concept: z.string().min(1).max(300),
  difficulty: z.string().max(50).optional().default('intermediate'),
  context: z.string().max(4000).optional().default(''),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!consume(user.id, 'generate'))
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { concept, difficulty, context } = parsed.data;

  let prism: string;
  try {
    const result = await generateText({
      model: SCENE_GEN_MODEL,
      instructions: INSTRUCTIONS,
      prompt: `Write a Prism scene that helps a learner understand: "${concept}".
Difficulty: ${difficulty}.${context ? `\nLesson context: ${context}` : ''}

Make it genuinely interactive — the learner should manipulate something and see math respond.
Return ONLY the Prism source. No markdown, no explanation.`,
      maxOutputTokens: 2048,
      abortSignal: AbortSignal.timeout(45_000),
    });
    prism = result.text;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'AI generation failed', detail: message }, { status: 502 });
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
