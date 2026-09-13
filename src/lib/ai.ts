import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { NextResponse } from 'next/server';

const hackclub = createOpenRouter({
  apiKey: process.env.HACKCLUB_AI_KEY,
  baseURL: 'https://ai.hackclub.com/proxy/v1',
});

export const TUTOR_MODEL = hackclub.chat('~openai/gpt-luna-latest');
export const SCENE_GEN_MODEL = hackclub.chat('~openai/gpt-luna-latest');
export const LESSON_GEN_MODEL = hackclub.chat('~openai/gpt-luna-latest');

export function isAiConfigured(): boolean {
  return Boolean(process.env.HACKCLUB_AI_KEY?.trim());
}

export function aiNotConfigured() {
  return NextResponse.json(
    { error: 'AI is not configured on this server' },
    { status: 503, headers: { 'x-ai-configured': 'false' } }
  );
}
