import { describe, it, expect } from 'vitest';
import { centerCursor, moveCursor, isCommitKey } from '@/engine/runtime/keyboardCursor';

const X: [number, number] = [-10, 10];
const Y: [number, number] = [-5, 5];

describe('centerCursor', () => {
  it('starts in the middle of the plot', () => {
    expect(centerCursor(X, Y)).toEqual({ x: 0, y: 0 });
  });

  it('handles an off-centre domain', () => {
    expect(centerCursor([0, 8], [2, 4])).toEqual({ x: 4, y: 3 });
  });
});

describe('moveCursor', () => {
  const at = { x: 0, y: 0 };

  it('steps a fortieth of each span', () => {
    expect(moveCursor(at, 'ArrowRight', X, Y)).toEqual({ x: 0.5, y: 0 });
    expect(moveCursor(at, 'ArrowUp', X, Y)).toEqual({ x: 0, y: 0.25 });
  });

  it('moves up in data space, not screen space', () => {
    expect(moveCursor(at, 'ArrowUp', X, Y)!.y).toBeGreaterThan(0);
    expect(moveCursor(at, 'ArrowDown', X, Y)!.y).toBeLessThan(0);
  });

  it('goes five times as far with shift', () => {
    expect(moveCursor(at, 'ArrowRight', X, Y, true)).toEqual({ x: 2.5, y: 0 });
  });

  it('stops at the edge instead of running off the plot', () => {
    expect(moveCursor({ x: 9.8, y: 0 }, 'ArrowRight', X, Y, true)).toEqual({ x: 10, y: 0 });
    expect(moveCursor({ x: -10, y: 0 }, 'ArrowLeft', X, Y)).toEqual({ x: -10, y: 0 });
    expect(moveCursor({ x: 0, y: 5 }, 'ArrowUp', X, Y)).toEqual({ x: 0, y: 5 });
    expect(moveCursor({ x: 0, y: -5 }, 'ArrowDown', X, Y)).toEqual({ x: 0, y: -5 });
  });

  it('ignores keys that are not arrows', () => {
    for (const key of ['Enter', ' ', 'a', 'Tab', 'Escape']) {
      expect(moveCursor(at, key, X, Y)).toBeNull();
    }
  });

  it('keeps values tidy instead of drifting into float noise', () => {
    let c = centerCursor([0, 3], [0, 3]);
    for (let i = 0; i < 7; i++) c = moveCursor(c, 'ArrowRight', [0, 3], [0, 3])!;
    expect(String(c.x)).not.toMatch(/00000|99999/);
  });
});

describe('isCommitKey', () => {
  it('accepts enter and space', () => {
    expect(isCommitKey('Enter')).toBe(true);
    expect(isCommitKey(' ')).toBe(true);
    expect(isCommitKey('Spacebar')).toBe(true);
  });

  it('rejects everything else', () => {
    expect(isCommitKey('ArrowUp')).toBe(false);
    expect(isCommitKey('a')).toBe(false);
  });
});
