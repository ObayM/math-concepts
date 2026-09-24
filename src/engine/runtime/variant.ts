import type { SlideIR } from '@/engine/ir/lesson';
import type { ExprIR } from '@/engine/expr';
import { evalExpr } from '@/engine/expr';

type Vary = { name: string; values: number[] };

export function variantCount(vary: Vary[] | undefined): number {
  return (vary ?? []).reduce((n, v) => n * v.values.length, 1);
}

export function variantScope(vary: Vary[], seed: number): Record<string, number> {
  const scope: Record<string, number> = {};
  let rest = Math.abs(Math.floor(seed));
  for (const v of vary) {
    scope[v.name] = v.values[rest % v.values.length];
    rest = Math.floor(rest / v.values.length);
  }
  return scope;
}

export const varies = (slide: SlideIR | null | undefined): boolean =>
  slide?.exercise?.kind === 'numeric' && Boolean(slide.exercise.vary?.length);

const fillText = (text: string | undefined, scope: Record<string, number>) =>
  text?.replace(/\$\{([A-Za-z_]\w*)\}/g, (whole, name: string) =>
    name in scope ? String(scope[name]) : whole
  );

export function instantiate(slide: SlideIR, seed: number): SlideIR {
  const ex = slide.exercise;
  if (!ex || ex.kind !== 'numeric' || !ex.vary?.length) return slide;
  const count = variantCount(ex.vary);
  const scope = variantScope(ex.vary, ((Math.floor(seed) % count) + count) % count);
  const num = (e: ExprIR) => Number(evalExpr(e, scope));
  const { vary: _vary, answerExprs, ...rest } = ex;
  return {
    ...slide,
    ...(slide.prose !== undefined && { prose: fillText(slide.prose, scope) }),
    exercise: {
      ...rest,
      prompt: fillText(ex.prompt, scope)!,
      explanation: fillText(ex.explanation, scope),
      hints: ex.hints.map((h) => fillText(h, scope)!),
      answers: answerExprs ? answerExprs.map(num) : ex.answers,
      ...(ex.wrong && {
        wrong: ex.wrong.map(({ valueExpr, ...w }) => ({
          ...w,
          value: valueExpr ? num(valueExpr) : w.value,
          why: fillText(w.why, scope),
        })),
      }),
    },
  };
}

export const randomSeed = () => Math.floor(Math.random() * 2 ** 31);

export const seedOf = (token: string | null | undefined): number => {
  const n = Number(String(token ?? '').split('.')[0]);
  return Number.isFinite(n) ? n : 0;
};
