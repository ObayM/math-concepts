import type { LessonIR, SlideIR } from '@/engine/ir/lesson';
import { DEFAULT_LOCALE, type Locale } from './locale';

export const MAX_QUESTION_CHARS = 500;
export const MAX_HISTORY_TURNS = 6;
export const MAX_TURN_CHARS = 1500;

export type TutorRole = 'user' | 'assistant';

export interface TutorTurn {
  role: TutorRole;
  content: string;
}

export interface TutorStudentState {
  checked?: boolean;
  correct?: boolean;
  answer?: unknown;
  scope?: Record<string, unknown>;
  mastery?: number | null;
}

export interface TutorContext {
  lessonTitle: string;
  slideTitle?: string;
  prose?: string;
  answered: 'not-yet' | 'wrong' | 'right';
  exercise?: {
    kind: string;
    prompt: string;
    choices?: string[];
    hints: string[];
    explanation?: string;
    pickedWhy?: string;
    unit?: string;
  };
  scene?: {
    space: string;
    values: Record<string, number | boolean | string>;
  };
  skill?: string;
  mastery?: number | null;
  studentAnswer?: string;
}

export const TUTOR_SYSTEM_PROMPT = `You are the tutor inside Mathly, an interactive math course. A student is on one slide of a lesson and has asked you something. You can see that slide: its explanation, the exercise, the hints the author wrote, and what the student has tried.

How to answer:
- Give them the next step, not the destination. Ask what they think happens next, or point at the one thing they're missing. Never state the final answer, even if they ask directly, and never work the exercise end to end for them.
- Build on the author's hints and explanation when they're in your context. Use their framing and notation. Don't invent a different method than the lesson is teaching.
- If they've answered wrong, work out why from what they submitted and address that specific misconception.
- Under 80 words. Two short paragraphs at most. No preamble, no "great question".
- Write math with $...$ inline and $$...$$ on its own line. **bold** and *italic* work. Nothing else renders.
- If they ask about something outside this slide's math, answer in one sentence and bring them back.
- You cannot see their screen, run code, or change the lesson. Don't pretend otherwise.`;

// arabic says the same thing in fewer words, so the english budget would let the
// model ramble. the maths itself stays latin, matching how the lessons are written.
const LOCALE_DIRECTIVE: Record<Locale, string> = {
  en: '',
  ar: `
Answer in Arabic. Use simple Modern Standard Arabic, the way a confident student explains something to a friend: short sentences, second person, no classical flourishes and nothing that reads like a textbook.
Keep every formula, variable and digit exactly as it appears in the lesson: latin letters, western numerals, inside $...$. Never transliterate maths into Arabic script and never switch to Arabic-Indic numerals.
Stay under 60 words, which is the Arabic equivalent of the limit above.`,
};

export function tutorSystemPrompt(lang: Locale = DEFAULT_LOCALE): string {
  return `${TUTOR_SYSTEM_PROMPT}${LOCALE_DIRECTIVE[lang] ?? ''}`;
}

export function sanitizeScope(
  slide: SlideIR | null | undefined,
  scope: unknown
): Record<string, number | boolean | string> {
  const declared = slide?.scene?.state;
  const out: Record<string, number | boolean | string> = {};
  if (!declared || !scope || typeof scope !== 'object') return out;

  const sent = scope as Record<string, unknown>;
  for (const [key, decl] of Object.entries(declared)) {
    const value = sent[key];
    if (value === undefined) continue;
    if (decl.type === 'number' && typeof value === 'number' && Number.isFinite(value)) {
      out[key] = value;
    } else if (decl.type === 'boolean' && typeof value === 'boolean') {
      out[key] = value;
    } else if (decl.type === 'enum' && typeof value === 'string' && decl.options.includes(value)) {
      out[key] = value;
    }
  }
  return out;
}

export function trimHistory(history: unknown): TutorTurn[] {
  if (!Array.isArray(history)) return [];
  return history
    .filter(
      (t): t is TutorTurn =>
        !!t &&
        typeof t === 'object' &&
        ((t as TutorTurn).role === 'user' || (t as TutorTurn).role === 'assistant') &&
        typeof (t as TutorTurn).content === 'string'
    )
    .slice(-MAX_HISTORY_TURNS)
    .map((t) => ({ role: t.role, content: t.content.slice(0, MAX_TURN_CHARS) }));
}

function describeAnswer(
  exercise: NonNullable<SlideIR['exercise']>,
  answer: unknown
): string | undefined {
  if (answer === null || answer === undefined || answer === '') return undefined;

  if (exercise.kind === 'quiz' && typeof answer === 'number') {
    return exercise.options[answer]?.text;
  }
  if (exercise.kind === 'numeric') {
    return `${answer}${exercise.unit ? ` ${exercise.unit}` : ''}`;
  }
  if (exercise.kind === 'build' && Array.isArray(answer)) {
    const labels = answer.map((id) => exercise.bank.find((t) => t.id === id)?.label ?? String(id));
    return labels.join(' ');
  }
  if (exercise.kind === 'order' && Array.isArray(answer)) {
    return answer.map((v, i) => `${i + 1}. ${v}`).join('  ');
  }
  if (exercise.kind === 'match' && Array.isArray(answer)) {
    return exercise.pairs.map((p, i) => `${p.left} -> ${answer[i] ?? '(blank)'}`).join('; ');
  }
  if (exercise.kind === 'hotspot' && Array.isArray(answer)) {
    return `tapped (${answer[0]}, ${answer[1]})`;
  }
  if (exercise.kind === 'table' && Array.isArray(answer)) {
    return answer.map((v, i) => `blank ${i + 1} = ${v ?? '(blank)'}`).join('; ');
  }
  if (exercise.kind === 'sketch') return 'a sketch on the diagram';
  return undefined;
}

function pickedWhy(
  exercise: NonNullable<SlideIR['exercise']>,
  answer: unknown
): string | undefined {
  if (exercise.kind !== 'quiz' || typeof answer !== 'number') return undefined;
  return exercise.options[answer]?.why;
}

export function buildTutorContext(
  lesson: LessonIR,
  slideId: string,
  state: TutorStudentState = {}
): TutorContext | null {
  const slide = lesson.slides.find((s) => s.id === slideId);
  if (!slide) return null;

  const checked = Boolean(state.checked);
  const answered = !checked ? 'not-yet' : state.correct ? 'right' : 'wrong';

  const ctx: TutorContext = {
    lessonTitle: lesson.title,
    slideTitle: slide.title,
    prose: slide.prose,
    answered,
    skill: slide.exercise?.skill ?? slide.skill,
    mastery: state.mastery ?? null,
  };

  if (slide.exercise) {
    const ex = slide.exercise;
    // the tutor only ever sees what the slide has already shown the student:
    // hints always, the explanation only once they have checked an answer.
    ctx.exercise = {
      kind: ex.kind,
      prompt: ex.prompt,
      hints: ex.hints ?? [],
      ...(ex.kind === 'quiz' && { choices: ex.options.map((o) => o.text) }),
      ...(ex.kind === 'numeric' && ex.unit && { unit: ex.unit }),
      ...(checked && ex.explanation && { explanation: ex.explanation }),
      ...(checked && { pickedWhy: pickedWhy(ex, state.answer) }),
    };
    ctx.studentAnswer = describeAnswer(ex, state.answer);
  }

  if (slide.scene) {
    ctx.scene = {
      space: slide.scene.space.type,
      values: sanitizeScope(slide, state.scope),
    };
  }

  return ctx;
}

const ANSWERED_LINE: Record<TutorContext['answered'], string> = {
  'not-yet':
    'They have not submitted an answer yet, so do not confirm or deny what they have typed.',
  wrong: 'They submitted this and it was marked wrong.',
  right: 'They already got this right, so help them understand why rather than how.',
};

export function renderContext(ctx: TutorContext): string {
  const lines: string[] = ['# The slide the student is on', `Lesson: ${ctx.lessonTitle}`];

  if (ctx.slideTitle) lines.push(`Slide: ${ctx.slideTitle}`);
  if (ctx.prose) lines.push('', 'What the slide says:', ctx.prose);

  if (ctx.scene) {
    const values = Object.entries(ctx.scene.values);
    lines.push('', `There is an interactive ${ctx.scene.space} diagram.`);
    if (values.length) {
      lines.push(`Right now they have set: ${values.map(([k, v]) => `${k} = ${v}`).join(', ')}`);
    }
  }

  if (ctx.exercise) {
    lines.push('', `# The exercise (${ctx.exercise.kind})`, ctx.exercise.prompt);
    if (ctx.exercise.choices?.length) {
      lines.push('Choices:', ...ctx.exercise.choices.map((c, i) => `  ${i + 1}. ${c}`));
    }
    if (ctx.exercise.hints.length) {
      lines.push('', 'Hints the author wrote, in order. Lead with these:');
      lines.push(...ctx.exercise.hints.map((h, i) => `  ${i + 1}. ${h}`));
    }
    if (ctx.exercise.explanation) {
      lines.push(
        '',
        "The author's explanation, already shown to the student:",
        ctx.exercise.explanation
      );
    }
    if (ctx.exercise.pickedWhy) {
      lines.push('', 'Note on the option they picked:', ctx.exercise.pickedWhy);
    }

    lines.push('', '# Where they are', ANSWERED_LINE[ctx.answered]);
    if (ctx.studentAnswer) lines.push(`Their answer: ${ctx.studentAnswer}`);
    if (ctx.answered === 'not-yet') {
      lines.push(
        'You do not know the correct answer. Steer with the hints, never assert what it is.'
      );
    }
  }

  if (ctx.skill && typeof ctx.mastery === 'number') {
    const level = ctx.mastery >= 0.75 ? 'strong' : ctx.mastery >= 0.4 ? 'shaky' : 'weak';
    lines.push('', `Their grasp of "${ctx.skill}" so far is ${level}.`);
  }

  return lines.join('\n');
}

export function buildTutorRequest(
  ctx: TutorContext,
  history: unknown,
  question: string,
  lang: Locale = DEFAULT_LOCALE
): { instructions: string; messages: TutorTurn[] } {
  return {
    instructions: `${tutorSystemPrompt(lang)}\n\n${renderContext(ctx)}`,
    messages: [
      ...trimHistory(history),
      { role: 'user', content: question.slice(0, MAX_QUESTION_CHARS) },
    ],
  };
}
