import { describe, it, expect } from 'vitest';
import { compileLesson } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { skippableChecks, recentlyMastered, RECENT_DAYS } from '@/lib/prerequisites';
import { checkStandard } from '@/engine/standard';
import { lessonLinks } from '@/engine/links';

const DAY = 24 * 60 * 60 * 1000;
const NOW = Date.UTC(2026, 8, 26);

const lesson = (head: string) =>
  lessonSchema.parse(
    compileLesson(`lesson "L" {
${head}
  slide "Check one" {
    id: "c1"
    beat: check
    numeric {
      ask "2 + 2?"
      skill: "adding"
      answer: 4
    }
  }
  slide "Check two" {
    id: "c2"
    beat: check
    numeric {
      ask "3 times 3?"
      skill: "times"
      answer: 9
    }
  }
  slide "The idea" {
    id: "idea"
    > See [the adding lesson](lesson:add-1) if that was new.
  }
}`)
  );

const fresh = (skill: string, score = 0.9, daysAgo = 1) => ({
  skill,
  score,
  updatedAt: new Date(NOW - daysAgo * DAY),
});

describe('requires:', () => {
  it('compiles into the lesson IR', () => {
    expect(lesson('  requires: ["adding", "times"]').requires).toEqual(['adding', 'times']);
  });

  it('is optional', () => {
    expect(lesson('').requires).toBeUndefined();
  });
});

describe('recentlyMastered', () => {
  it('needs both a high score and a recent attempt', () => {
    expect(recentlyMastered(fresh('a'), NOW)).toBe(true);
    expect(recentlyMastered(fresh('a', 0.5), NOW)).toBe(false);
    expect(recentlyMastered(fresh('a', 0.9, RECENT_DAYS + 1), NOW)).toBe(false);
    expect(recentlyMastered(undefined, NOW)).toBe(false);
  });
});

describe('skippableChecks', () => {
  const l = lesson('  requires: ["adding", "times"]');

  it('skips every leading check the student has recently mastered', () => {
    expect(skippableChecks(l.slides, l.requires, [fresh('adding'), fresh('times')], NOW)).toBe(2);
  });

  it('stops at the first check they still need', () => {
    expect(skippableChecks(l.slides, l.requires, [fresh('times')], NOW)).toBe(0);
    expect(skippableChecks(l.slides, l.requires, [fresh('adding')], NOW)).toBe(1);
  });

  it('never skips a check whose skill the lesson does not require', () => {
    const only = lesson('  requires: ["times"]');
    expect(
      skippableChecks(only.slides, only.requires, [fresh('adding'), fresh('times')], NOW)
    ).toBe(0);
  });

  it('does nothing without requires', () => {
    const none = lesson('');
    expect(skippableChecks(none.slides, none.requires, [fresh('adding')], NOW)).toBe(0);
  });

  it('never skips the whole lesson', () => {
    const allChecks = lessonSchema.parse(
      compileLesson(`lesson "L" {
  requires: ["adding"]
  slide "Check" {
    id: "c"
    beat: check
    numeric {
      ask "2 + 2?"
      skill: "adding"
      answer: 4
    }
  }
}`)
    );
    expect(skippableChecks(allChecks.slides, allChecks.requires, [fresh('adding')], NOW)).toBe(0);
  });
});

describe('the standard linter on prerequisites', () => {
  const codes = (head: string) => checkStandard(lesson(head)).map((f) => f.code);

  it('flags a check whose skill is not required', () => {
    expect(codes('  requires: ["adding"]')).toContain('V_CHECK_NOT_REQUIRED');
  });

  it('flags a required skill nothing checks', () => {
    expect(codes('  requires: ["adding", "times", "dividing"]')).toContain('V_REQUIRES_UNCHECKED');
  });

  it('is quiet when checks and requires agree', () => {
    const found = codes('  requires: ["adding", "times"]');
    expect(found).not.toContain('V_CHECK_NOT_REQUIRED');
    expect(found).not.toContain('V_REQUIRES_UNCHECKED');
  });
});

describe('lessonLinks', () => {
  it('finds links to other lessons in prose', () => {
    expect(lessonLinks(lesson(''))).toEqual([{ slideId: 'idea', key: 'add-1' }]);
  });
});
