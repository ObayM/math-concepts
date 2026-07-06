import { generateText } from 'ai';
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { requireUser } from '@/lib/session';
import { consume } from '@/lib/rate-limit';
import { TUTOR_MODEL } from '@/lib/ai';

const bodySchema = z.object({
  context: z.string(),
  question: z.string().min(1),
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

  const { text } = await generateText({
    model: TUTOR_MODEL,
    instructions:
      'You are a friendly, encouraging math tutor. Explain concepts simply. Keep responses under 80 words.', // Need to change this later
    prompt: `Context: ${context}\n\nUser Question: ${question}`,
  });

  return NextResponse.json({ answer: text });
}
