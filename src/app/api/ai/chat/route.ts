import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume } from '@/lib/rate-limit';
import { TUTOR_MODEL } from '@/lib/ai';

const bodySchema = z.object({
  context: z.string().max(4000),
  question: z.string().min(1).max(500),
});

export async function POST(req: Request) {
  const user = await requireUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (!consume(user.id, 'chat'))
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });

  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }
  const { context, question } = parsed.data;

  try {
    const { text } = await generateText({
      model: TUTOR_MODEL,
      instructions:
        'You are a friendly, encouraging math tutor. Explain concepts simply. Keep responses under 80 words.',
      prompt: `Context: ${context}\n\nUser Question: ${question}`,
      maxOutputTokens: 512,
      abortSignal: AbortSignal.timeout(30_000),
    });
    return NextResponse.json({ answer: text });
  } catch (err: unknown) {
    const detail = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: 'Tutor is unavailable right now', detail }, { status: 502 });
  }
}
