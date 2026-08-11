import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { compile } from '@/engine/lang';
import { sceneSchema } from '@/engine/ir/schema';
import { Scene } from '@/engine/runtime/Scene';

const scene = (init: number, name = 'a') =>
  sceneSchema.parse(
    compile(
      'scene plane {\n' +
        '  x: [-4, 4]\n' +
        `  y: [-3, 3]\n` +
        `  param ${name} = ${init} { range: [0, 45], step: 1 }\n` +
        `  slider ${name} { label: "the param" }\n` +
        '}'
    )
  );

const readout = () => screen.getByLabelText('the param').getAttribute('value');

describe('a live preview swapping in newly compiled IR', () => {
  it('picks up a changed param init', () => {
    const { rerender } = render(<Scene ir={scene(1)} />);
    expect(readout()).toBe('1');

    rerender(<Scene ir={scene(7)} />);
    expect(readout()).toBe('7');
  });

  it('picks up a renamed param instead of keeping the old key', () => {
    const { rerender } = render(<Scene ir={scene(1, 'a')} />);
    expect(readout()).toBe('1');

    rerender(<Scene ir={scene(28, 'tilt')} />);
    expect(readout()).toBe('28');
  });

  it('leaves a dragged value alone when the declarations are unchanged', () => {
    const { rerender } = render(<Scene ir={scene(1)} />);
    fireEvent.change(screen.getByLabelText('the param'), { target: { value: '12' } });
    expect(readout()).toBe('12');

    rerender(<Scene ir={scene(1)} />);
    expect(readout()).toBe('12');
  });
});
