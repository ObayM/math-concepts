// v2 checkable registry — keyed by exercise.kind, operating on the whole slide
// (reads slide.exercise). same {initial, isComplete, check} contract the player
// drives its Check button off, so a new exercise kind is just a new entry here
// plus its component in SlideView.

const sameSequence = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

export const exercises = {
  quiz: {
    initial: () => null,
    isComplete: (_slide, v) => v !== null,
    check: (slide, v) => v === slide.exercise.correct,
  },
  numeric: {
    initial: () => '',
    isComplete: (_slide, v) => v !== '' && v != null && !Number.isNaN(Number(v)),
    check: (slide, v) => {
      const n = Number(v);
      if (Number.isNaN(n)) return false;
      return slide.exercise.answers.some((a) => Math.abs(n - a) <= slide.exercise.tolerance);
    },
  },
  build: {
    initial: () => [],
    isComplete: (slide, v) => v && v.length === slide.exercise.slots,
    check: (slide, v) => v && slide.exercise.answers.some((ans) => sameSequence(ans, v)),
  },
};
