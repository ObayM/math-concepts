// v2 checkable registry — keyed by exercise.kind, operating on the whole slide
// (reads slide.exercise). same {initial, isComplete, check} contract the player
// drives its Check button off, so a new exercise kind is just a new entry here
// plus its component in SlideView.

import {
  pointInRegion,
  curveNearPoints,
  pointsNearTargets,
  distToPolyline,
  slope as slopeOf,
} from '@/engine/checks/geometry';

const sameSequence = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);

const flatBlanks = (ex) => ex.rows.flat().filter((cell) => cell.blank);

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
  hotspot: {
    initial: () => null,
    isComplete: (_slide, v) => Array.isArray(v),
    check: (slide, v) => Array.isArray(v) && pointInRegion(v, slide.exercise.target),
  },
  sketch: {
    initial: () => null,
    isComplete: (slide, v) => {
      if (!Array.isArray(v)) return false;
      const ex = slide.exercise;
      return ex.mode === 'points' ? v.length >= ex.targets.length : v.length >= 2;
    },
    check: (slide, v) => {
      if (!Array.isArray(v) || v.length < 2) return false;
      const ex = slide.exercise;
      if (ex.mode === 'points') return pointsNearTargets(v, ex.targets, ex.tol);
      if (ex.mode === 'line') {
        const a = v[0];
        const b = v[v.length - 1];
        const drawnSlope = slopeOf(a, b);
        if (!Number.isFinite(drawnSlope) || Math.abs(drawnSlope - ex.slope) > ex.slopeTol) {
          return false;
        }
        return distToPolyline(ex.through, [a, b]) <= ex.tol;
      }
      return curveNearPoints(v, ex.targets, ex.tol);
    },
  },
  match: {
    initial: (slide) => new Array(slide.exercise.pairs.length).fill(null),
    isComplete: (slide, v) =>
      Array.isArray(v) && v.length === slide.exercise.pairs.length && v.every((x) => x != null),
    check: (slide, v) => Array.isArray(v) && slide.exercise.pairs.every((p, i) => v[i] === p.right),
  },
  order: {
    initial: () => [],

    isComplete: (slide, v) => Array.isArray(v) && v.length === slide.exercise.items.length,
    check: (slide, v) => {
      if (!Array.isArray(v)) return false;
      const bank = [...slide.exercise.items, ...(slide.exercise.decoys ?? [])];
      return sameSequence(
        v.map((i) => bank[i]),
        slide.exercise.items
      );
    },
  },
  table: {
    initial: (slide) => new Array(flatBlanks(slide.exercise).length).fill(''),
    isComplete: (slide, v) => {
      const blanks = flatBlanks(slide.exercise);
      return (
        Array.isArray(v) &&
        v.length === blanks.length &&
        v.every((s) => s !== '' && s != null && !Number.isNaN(Number(s)))
      );
    },
    // full correctness (all blanks right); the component surfaces per-blank
    // partial credit for display, but Continue is gated by `checked` alone,
    // same as every other exercise kind — a partial score never blocks it
    check: (slide, v) => {
      const blanks = flatBlanks(slide.exercise);
      if (!Array.isArray(v) || v.length !== blanks.length) return false;
      return blanks.every((b, i) => Math.abs(Number(v[i]) - b.answer) <= slide.exercise.tolerance);
    },
  },
};
