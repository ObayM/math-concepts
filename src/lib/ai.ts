import { createGoogle } from '@ai-sdk/google';

const googleProvider = createGoogle({ apiKey: process.env.GEMINI_API_KEY });

export const TUTOR_MODEL = googleProvider('gemini-2.5-flash');
export const SCENE_GEN_MODEL = googleProvider('gemini-2.5-flash');
