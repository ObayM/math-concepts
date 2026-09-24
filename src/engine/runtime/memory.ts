import type { SlideIR } from '@/engine/ir/lesson';
import { parseNumber } from '@/engine/checks/number';
import { shortNum } from '@/engine/format';

export type LessonMemory = {
  answers: Record<string, string>;
  kept: Record<string, number>;
};

export const emptyMemory = (): LessonMemory => ({ answers: {}, kept: {} });

export const MEMORY_REF = /\$\{(answer|recall)\("([^"]+)"(?:,\s*"([^"]*)")?\)\}/g;

export function memoryRefs(text: string): { fn: 'answer' | 'recall'; name: string }[] {
  const out: { fn: 'answer' | 'recall'; name: string }[] = [];
  const re = new RegExp(MEMORY_REF.source, 'g');
  for (let m = re.exec(text); m; m = re.exec(text)) {
    out.push({ fn: m[1] as 'answer' | 'recall', name: m[2] });
  }
  return out;
}

const shown = shortNum;

export function fillMemory(text: string, memory: LessonMemory): string {
  return text.replace(MEMORY_REF, (_, fn: string, name: string, fallback?: string) => {
    const v = fn === 'answer' ? memory.answers[name] : memory.kept[name];
    if (v === undefined) return fallback ?? '?';
    return typeof v === 'number' ? shown(v) : v;
  });
}

export function answerText(slide: SlideIR, value: unknown): string | undefined {
  const ex = slide.exercise;
  if (!ex) return undefined;
  if (ex.kind === 'quiz') return typeof value === 'number' ? ex.options[value]?.text : undefined;
  if (ex.kind === 'numeric') {
    const n = parseNumber(value);
    return Number.isNaN(n) ? undefined : String(n);
  }
  return undefined;
}

export function remember(memory: LessonMemory, slide: SlideIR, value: unknown): LessonMemory {
  const text = answerText(slide, value);
  if (text === undefined) return memory;
  return { ...memory, answers: { ...memory.answers, [slide.id]: text } };
}

export function keepFromScope(
  memory: LessonMemory,
  slide: SlideIR | null | undefined,
  scope: Record<string, unknown>
): LessonMemory {
  const state = slide?.scene?.state ?? {};
  let kept = memory.kept;
  for (const [name, def] of Object.entries(state)) {
    if (def.type !== 'number' || !def.keep || typeof scope[name] !== 'number') continue;
    if (kept[name] === scope[name]) continue;
    kept = { ...kept, [name]: scope[name] as number };
  }
  return kept === memory.kept ? memory : { ...memory, kept };
}

export function memoryFromHistory(
  slides: SlideIR[],
  history: { slideId?: string; answer?: unknown }[] | null | undefined
): LessonMemory {
  let memory = emptyMemory();
  for (const entry of history ?? []) {
    const slide = slides.find((s) => s.id === entry.slideId);
    if (slide) memory = remember(memory, slide, entry.answer);
  }
  return memory;
}

export function withMemory(slide: SlideIR, memory: LessonMemory): SlideIR {
  const ex = slide.exercise;
  const texts = [
    slide.prose,
    ex?.prompt,
    ex?.explanation,
    ...(slide.goals ?? []).map((g) => g.prompt),
  ];
  if (!texts.some((t) => t?.includes('${'))) return slide;
  const fill = (t: string | undefined) => (t === undefined ? t : fillMemory(t, memory));
  return {
    ...slide,
    ...(slide.prose !== undefined && { prose: fill(slide.prose) }),
    ...(slide.goals && { goals: slide.goals.map((g) => ({ ...g, prompt: fill(g.prompt)! })) }),
    ...(ex && {
      exercise: { ...ex, prompt: fill(ex.prompt)!, explanation: fill(ex.explanation) },
    }),
  };
}

export function keptInitial(slide: SlideIR, memory: LessonMemory): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [name, def] of Object.entries(slide.scene?.state ?? {})) {
    if (def.type === 'number' && def.keep && memory.kept[name] !== undefined)
      out[name] = memory.kept[name];
  }
  return out;
}
