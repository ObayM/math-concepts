import type { LessonIR } from '@/engine/ir/lesson';

const LINK = /\]\(lesson:([a-z0-9-]+)\)/g;

export function lessonLinks(lesson: LessonIR): { slideId: string; key: string }[] {
  const out: { slideId: string; key: string }[] = [];
  for (const slide of lesson.slides) {
    const text = JSON.stringify([slide.prose, slide.exercise, slide.goals]);
    for (const m of text.matchAll(LINK)) out.push({ slideId: slide.id, key: m[1] });
  }
  return out;
}
