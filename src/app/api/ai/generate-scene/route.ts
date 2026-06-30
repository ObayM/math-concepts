import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { requireUser } from '@/lib/session';
import { consume } from '@/lib/rate-limit';
import { SCENE_GEN_MODEL } from '@/lib/ai';
import { compile } from '@/engine';
import { toAIContext } from '@/engine/lang/docs';

const INSTRUCTIONS = toAIContext();

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!consume(user.id, 'generate'))
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const { concept, difficulty = 'intermediate', context = '' } = await req.json();

  const { text: prism } = await generateText({
    model: SCENE_GEN_MODEL,
    instructions: INSTRUCTIONS,
    prompt: `Write a Prism scene that helps a learner understand: "${concept}".
Difficulty: ${difficulty}.${context ? `\nLesson context: ${context}` : ''}

Make it genuinely interactive — the learner should manipulate something and see math respond.
Return ONLY the Prism source. No markdown, no explanation.`,
  });

  try {
    const scene = compile(prism);
    return NextResponse.json({ scene, prism });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Compile failed', detail: message }, { status: 422 });
  }
}
