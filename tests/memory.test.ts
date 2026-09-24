import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import {
  emptyMemory,
  fillMemory,
  keepFromScope,
  keptInitial,
  memoryFromHistory,
  remember,
  withMemory,
} from '@/engine/runtime/memory';

const SRC = `lesson "L" {
  slide "Hook" {
    id: "d-hook"
    quiz {
      ask "What does a speedometer show?"
      * "something real"
      - "it's rounding"
    }
  }
  slide "Shrink" {
    id: "d-shrink"
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0.001, 1], step: 0.001, keep }
      slider h
    }
    goal "Get the gap below 0.01" { when: h < 0.01 }
    numeric {
      ask "Where is it settling?"
      answer: 2
    }
  }
  slide "Reveal" {
    id: "d-reveal"
    > You guessed \${answer("d-hook")}. You found \${answer("d-shrink", "a number")} with a gap of \${recall("h")}.
    scene plane {
      x: [0, 1]
      y: [0, 1]
      param h = 1 { range: [0.001, 1], step: 0.001, keep }
      slider h
    }
    goal "Look again" { when: h > 0.5 }
  }
}`;

const lesson = lessonSchema.parse(compileLesson(SRC));
const [hook, shrink, reveal] = lesson.slides;

describe('lesson memory', () => {
  it('fills answers and kept values into later prose', () => {
    let m = remember(emptyMemory(), hook, 1);
    m = remember(m, shrink, ' 2 ');
    m = keepFromScope(m, shrink, { h: 0.004 });
    expect(withMemory(reveal, m).prose).toBe(
      "You guessed it's rounding. You found 2 with a gap of 0.004."
    );
  });

  it('uses the fallback, or ?, for anything not answered yet', () => {
    expect(fillMemory(reveal.prose!, emptyMemory())).toBe(
      'You guessed ?. You found a number with a gap of ?.'
    );
  });

  it('starts a kept param where the student left it', () => {
    const m = keepFromScope(emptyMemory(), shrink, { h: 0.01 });
    expect(keptInitial(reveal, m)).toEqual({ h: 0.01 });
    expect(reveal.scene!.state.h).toMatchObject({ keep: true });
  });

  it('rebuilds from saved quiz history after a reload', () => {
    const m = memoryFromHistory(lesson.slides, [{ slideId: 'd-hook', answer: 0 }]);
    expect(m.answers['d-hook']).toBe('something real');
  });

  it('leaves slides without references untouched', () => {
    expect(withMemory(hook, emptyMemory())).toBe(hook);
  });
});

describe('memory validation', () => {
  it('refuses an answer from a slide that comes later', () => {
    expect(() =>
      compileLesson(`lesson "L" {
  slide "a" {
    > \${answer("b")}
  }
  slide "b" {
    id: "b"
    numeric {
      ask "q"
      answer: 1
    }
  }
}`)
    ).toThrow(/needs a slide before this one/);
  });

  it('refuses recall of a param nobody keeps', () => {
    expect(() =>
      compileLesson(`lesson "L" {
  slide "a" {
    > \${recall("h")}
  }
}`)
    ).toThrow(/needs a param h \{ keep \}/);
  });
});
