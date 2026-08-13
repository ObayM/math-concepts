import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compile } from '@/engine/lang';
import { sceneSchema } from '@/engine/ir/schema';
import { Scene } from '@/engine/runtime/Scene';

function useMotionPreference(reduce: boolean) {
  vi.stubGlobal('matchMedia', (query: string) => ({
    matches: query.includes('prefers-reduced-motion') && reduce,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

const ir = () =>
  sceneSchema.parse(
    compile(
      'scene plane {\n' +
        '  x: [-4, 4]\n' +
        '  y: [-3, 3]\n' +
        '  param t = 0 { range: [0, 5], step: 0.1 }\n' +
        '  slider t { label: "t" }\n' +
        '  step "start"\n' +
        '  step "go" { animate: { t: 5 }, dur: 2000, ease: easeInOut }\n' +
        '}'
    )
  );

const readout = () => screen.getByLabelText('t').getAttribute('value');

describe('a scene tween under prefers-reduced-motion', () => {
  it('lands on the target immediately instead of tweening', () => {
    useMotionPreference(true);
    render(<Scene ir={ir()} />);
    expect(readout()).toBe('0');

    fireEvent.click(screen.getByText('Play'));
    expect(readout()).toBe('5');
  });

  it('still tweens when motion is allowed', () => {
    useMotionPreference(false);
    render(<Scene ir={ir()} />);
    expect(readout()).toBe('0');

    fireEvent.click(screen.getByText('Play'));
    expect(readout()).toBe('0');
  });
});
