import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import {
  visiblePath,
  initialFlow,
  activeSlide,
  slideKey,
  canGoBack,
  stageBranch,
  next,
  back,
} from '@/engine/runtime/flow';

const SRC = `lesson "L" {
  slide "one" {
    id: "s1"
    > first
  }
  slide "two" {
    id: "s2"
    numeric {
      ask "2 + 2?"
      answer: 4
      onwrong: "help-retry" retry
    }
  }
  slide "three" {
    id: "s3"
    numeric {
      ask "3 + 3?"
      answer: 6
      onwrong: "help-onward"
    }
  }
  slide "retry scaffold" {
    id: "help-retry"
    hidden: true
    > count again
  }
  slide "onward scaffold" {
    id: "help-onward"
    hidden: true
    > moving on
  }
}`;

const slides = lessonSchema.parse(compileLesson(SRC)).slides;
const at = (i: number) => initialFlow(i);

describe('visiblePath', () => {
  it('drops hidden slides but keeps their order elsewhere', () => {
    expect(visiblePath(slides).map((s) => s.id)).toEqual(['s1', 's2', 's3']);
  });

  it('leaves a lesson with no detours untouched', () => {
    const plain = lessonSchema.parse(
      compileLesson('lesson "L" {\n  slide "a" {\n    > hi\n  }\n}')
    ).slides;
    expect(visiblePath(plain)).toEqual(plain);
  });
});

describe('activeSlide', () => {
  it('indexes the visible path, not the raw array', () => {
    expect(activeSlide(slides, at(2))?.id).toBe('s3');
  });

  it('resolves a detour by id', () => {
    const state = { ...at(1), detour: { slideId: 'help-retry', retry: true } };
    expect(activeSlide(slides, state)?.id).toBe('help-retry');
  });

  it('is null past the end', () => {
    expect(activeSlide(slides, at(9))).toBeNull();
  });
});

describe('stageBranch', () => {
  it('does nothing when the answer is right', () => {
    expect(stageBranch(slides, at(1), true).pending).toBeNull();
  });

  it('stages the detour when the answer is wrong', () => {
    expect(stageBranch(slides, at(1), false).pending).toEqual({
      slideId: 'help-retry',
      retry: true,
    });
  });

  it('carries retry: false through', () => {
    expect(stageBranch(slides, at(2), false).pending).toEqual({
      slideId: 'help-onward',
      retry: false,
    });
  });

  it('does nothing on a slide with no onwrong', () => {
    expect(stageBranch(slides, at(0), false).pending).toBeNull();
  });

  it('only branches once per slide', () => {
    const once = next(slides, stageBranch(slides, at(1), false)).state;
    const returned = next(slides, once).state;
    expect(returned.branched).toEqual(['s2']);
    expect(stageBranch(slides, returned, false).pending).toBeNull();
  });

  it('will not branch out of a scaffold', () => {
    const inDetour = next(slides, stageBranch(slides, at(1), false)).state;
    expect(stageBranch(slides, inDetour, false).pending).toBeNull();
  });
});

describe('next', () => {
  it('walks the visible path one slide at a time', () => {
    const step = next(slides, at(0));
    expect(step.state.pathIndex).toBe(1);
    expect(step.complete).toBe(false);
  });

  it('completes at the end of the visible path, not the raw array', () => {
    expect(next(slides, at(2)).complete).toBe(true);
  });

  it('enters the detour and records the slide it came from', () => {
    const step = next(slides, stageBranch(slides, at(1), false));
    expect(step.state.detour).toEqual({ slideId: 'help-retry', retry: true });
    expect(step.state.pending).toBeNull();
    expect(step.state.branched).toEqual(['s2']);
    expect(step.complete).toBe(false);
  });

  it('retry returns to the same question', () => {
    const inDetour = next(slides, stageBranch(slides, at(1), false)).state;
    const step = next(slides, inDetour);
    expect(step.state.detour).toBeNull();
    expect(step.state.pathIndex).toBe(1);
    expect(step.complete).toBe(false);
  });

  it('no-retry moves forward instead', () => {
    const inDetour = next(slides, stageBranch(slides, at(2), false)).state;
    const step = next(slides, inDetour);
    expect(step.state.detour).toBeNull();
    expect(step.state.pathIndex).toBe(2);
    expect(step.complete).toBe(true);
  });

  it('a retry detour off the last slide still lets the lesson finish', () => {
    const staged = stageBranch(slides, at(2), false);
    const withRetry = {
      ...staged,
      pending: { slideId: 'help-retry', retry: true },
    };
    const inDetour = next(slides, withRetry).state;
    const returned = next(slides, inDetour);
    expect(returned.complete).toBe(false);
    expect(returned.state.pathIndex).toBe(2);
    expect(next(slides, returned.state).complete).toBe(true);
  });

  it('clears a stale pending branch when moving on normally', () => {
    const staged = stageBranch(slides, at(1), false);
    const moved = next(slides, next(slides, staged).state).state;
    expect(moved.pending).toBeNull();
  });
});

describe('back', () => {
  it('leaves a detour without changing position on the path', () => {
    const inDetour = next(slides, stageBranch(slides, at(1), false)).state;
    const out = back(slides, inDetour);
    expect(out.detour).toBeNull();
    expect(out.pathIndex).toBe(1);
  });

  it('steps back along the visible path', () => {
    expect(back(slides, at(2)).pathIndex).toBe(1);
  });

  it('will not go before the first slide', () => {
    expect(back(slides, at(0)).pathIndex).toBe(0);
  });

  it('canGoBack is false only on the first slide with no detour', () => {
    expect(canGoBack(at(0))).toBe(false);
    expect(canGoBack(at(1))).toBe(true);
    const inDetour = next(slides, stageBranch(slides, at(1), false)).state;
    expect(canGoBack(inDetour)).toBe(true);
  });
});

describe('slideKey', () => {
  it('changes on every hop so answer state resets', () => {
    const staged = stageBranch(slides, at(1), false);
    const inDetour = next(slides, staged).state;
    const returned = next(slides, inDetour).state;
    expect(slideKey(at(1))).toBe('p:1');
    expect(slideKey(staged)).toBe('p:1');
    expect(slideKey(inDetour)).toBe('d:help-retry');
    expect(slideKey(returned)).toBe('p:1');
    expect(slideKey(inDetour)).not.toBe(slideKey(returned));
  });
});
