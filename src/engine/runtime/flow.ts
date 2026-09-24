import type { SlideIR } from '@/engine/ir/lesson';
import { parseNumber } from '@/engine/checks/number';

export interface Detour {
  slideId: string;
  retry: boolean;
}

export interface FlowState {
  pathIndex: number;
  detour: Detour | null;
  pending: Detour | null;
  branched: string[];
}

export interface FlowStep {
  state: FlowState;
  complete: boolean;
}

export function visiblePath(slides: SlideIR[]): SlideIR[] {
  return slides.filter((s) => !s.hidden);
}

export function initialFlow(pathIndex = 0): FlowState {
  return { pathIndex, detour: null, pending: null, branched: [] };
}

export function activeSlide(slides: SlideIR[], state: FlowState): SlideIR | null {
  if (state.detour) {
    const target = state.detour.slideId;
    return slides.find((s) => s.id === target) ?? null;
  }
  return visiblePath(slides)[state.pathIndex] ?? null;
}

export function slideKey(state: FlowState): string {
  return state.detour ? `d:${state.detour.slideId}` : `p:${state.pathIndex}`;
}

export function canGoBack(state: FlowState): boolean {
  return Boolean(state.detour) || state.pathIndex > 0;
}

export function wrongBranch(slide: SlideIR, answer: unknown): Detour | null {
  const ex = slide.exercise;
  if (!ex) return null;
  let specific: { slide: string; retry?: boolean } | undefined;
  if (ex.kind === 'quiz' && typeof answer === 'number') specific = ex.options[answer]?.onwrong;
  if (ex.kind === 'numeric') {
    const n = parseNumber(answer);
    specific = ex.wrong?.find(
      (w) => w.onwrong && Math.abs(w.value - n) <= Math.max(ex.tolerance, 1e-9)
    )?.onwrong;
  }
  const b = specific ?? ex.onwrong;
  return b ? { slideId: b.slide, retry: Boolean(b.retry) } : null;
}

const branchKey = (slideId: string, target: string) => `${slideId}>${target}`;

export function stageBranch(
  slides: SlideIR[],
  state: FlowState,
  correct: boolean,
  answer?: unknown
): FlowState {
  if (correct || state.detour) return state;
  const slide = activeSlide(slides, state);
  if (!slide) return state;
  const branch = wrongBranch(slide, answer);
  if (!branch) return state;
  if (state.branched.includes(branchKey(slide.id, branch.slideId))) return state;
  if (!slides.some((s) => s.id === branch.slideId && s.hidden)) return state;
  return { ...state, pending: branch };
}

export function next(slides: SlideIR[], state: FlowState): FlowStep {
  const lastIndex = visiblePath(slides).length - 1;

  if (state.pending) {
    const slide = activeSlide(slides, state);
    return {
      state: {
        ...state,
        detour: state.pending,
        pending: null,
        branched: slide
          ? [...state.branched, branchKey(slide.id, state.pending.slideId)]
          : state.branched,
      },
      complete: false,
    };
  }

  const cleared = { ...state, detour: null, pending: null };
  if (state.detour && state.detour.retry) return { state: cleared, complete: false };
  if (state.pathIndex >= lastIndex) return { state: cleared, complete: true };
  return { state: { ...cleared, pathIndex: state.pathIndex + 1 }, complete: false };
}

export function back(slides: SlideIR[], state: FlowState): FlowState {
  if (state.detour) return { ...state, detour: null, pending: null };
  if (state.pathIndex > 0) return { ...state, pathIndex: state.pathIndex - 1, pending: null };
  return state;
}
