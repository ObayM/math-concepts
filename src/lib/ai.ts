import { createGoogle } from '@ai-sdk/google';
import { NextResponse } from 'next/server';

const googleProvider = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export const TUTOR_MODEL = googleProvider('gemini-2.5-flash');
export const SCENE_GEN_MODEL = googleProvider('gemini-2.5-flash');
export const LESSON_GEN_MODEL = googleProvider('gemini-2.5-flash');

export function isAiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY?.trim());
}

// without this an unset key surfaces as an empty 200 stream, which reads to a
// student as "the tutor had nothing to say" rather than a broken deployment.
export function aiNotConfigured() {
  return NextResponse.json(
    { error: 'AI is not configured on this server' },
    { status: 503, headers: { 'x-ai-configured': 'false' } }
  );
}
