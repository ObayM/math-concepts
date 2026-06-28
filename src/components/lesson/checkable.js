// each checkable block type declares: a starting value, when it's ready to check,
// and whether the value is correct. the player drives Check/feedback off this, so
// adding a new answer type (numeric input, matching, ordering...) is just a new entry.

const sameSequence = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export const checkable = {
  quiz: {
    initial: () => null,
    isComplete: (_slide, v) => v !== null,
    check: (slide, v) => v === slide.correctOption,
  },
  build: {
    initial: () => [],
    isComplete: (slide, v) => v.length === slide.slots,
    check: (slide, v) => slide.answer.some((ans) => sameSequence(ans, v)),
  },
};
