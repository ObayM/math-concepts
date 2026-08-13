import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { compile } from '@/engine/lang';
import { sceneSchema } from '@/engine/ir/schema';
import { SceneProvider, useScene } from '@/engine/runtime/SceneProvider';

const ir = sceneSchema.parse(
  compile(
    'scene plane {\n' +
      '  x: [-4, 4]\n' +
      '  y: [-3, 3]\n' +
      '  param a = 0 { range: [0, 10] }\n' +
      '  param b = 0 { range: [0, 10] }\n' +
      '}'
  )
);

function Harness() {
  const { scope, set, animate } = useScene();
  return (
    <div>
      <span data-testid="a">{String(scope.a)}</span>
      <span data-testid="b">{String(scope.b)}</span>
      <button onClick={() => animate({ a: 10, b: 10 }, 100, 'linear')}>both</button>
      <button onClick={() => animate({ a: 4 }, 100, 'linear')}>retarget a</button>
      <button onClick={() => set('a', 2)}>grab a</button>
    </div>
  );
}

const val = (k: string) => Number(screen.getByTestId(k).textContent);

const mount = () =>
  render(
    <SceneProvider ir={ir}>
      <Harness />
    </SceneProvider>
  );

const press = async (label: string) => {
  await act(async () => {
    fireEvent.click(screen.getByText(label));
  });
};

const advance = async (ms: number) => {
  await act(async () => {
    vi.advanceTimersByTime(ms);
  });
};

afterEach(() => {
  vi.useRealTimers();
});

describe('a tween interrupted partway through', () => {
  it('still lands the keys the interruption did not touch', async () => {
    vi.useFakeTimers();
    mount();

    await press('both');
    await advance(50);
    expect(val('b')).toBeGreaterThan(0);
    expect(val('b')).toBeLessThan(10);

    await press('grab a');
    await advance(300);

    expect(val('a')).toBe(2);
    expect(val('b')).toBe(10);
  });

  it('retargets one key without stranding the other', async () => {
    vi.useFakeTimers();
    mount();

    await press('both');
    await advance(50);
    await press('retarget a');
    await advance(300);

    expect(val('a')).toBe(4);
    expect(val('b')).toBe(10);
  });
});
