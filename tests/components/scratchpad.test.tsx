import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

import NotesPad from '@/components/lesson/scratchpad/NotesPad';
import { eraseAt, fromGrid, strokeHit, toGrid } from '@/components/lesson/scratchpad/strokes';

describe('stroke geometry', () => {
  it('normalises against width so a stroke survives a resize', () => {
    const [gx, gy] = toGrid(80, 40, 320);
    expect([gx, gy]).toEqual([250, 125]);
    expect(fromGrid(gx, gy, 640)).toEqual([160, 80]);
  });

  it('hits a stroke the pointer is sitting on', () => {
    const stroke = {
      points: [
        [0, 0],
        [100, 0],
      ],
    };
    expect(strokeHit(stroke, 50, 5, 10)).toBe(true);
    expect(strokeHit(stroke, 50, 40, 10)).toBe(false);
  });

  it('hits a single point stroke', () => {
    expect(strokeHit({ points: [[10, 10]] }, 12, 12, 10)).toBe(true);
    expect(strokeHit({ points: [[10, 10]] }, 90, 90, 10)).toBe(false);
  });

  it('erases only the stroke under the pointer', () => {
    const near = { points: [[10, 10]] };
    const far = { points: [[500, 500]] };
    expect(eraseAt([near, far], 10, 10, 12)).toEqual([far]);
  });
});

function Harness({ initial }: { initial: string }) {
  const [value, setValue] = React.useState(initial);
  return <NotesPad value={value} onChange={setValue} />;
}

const activeLine = () => screen.getByRole('textbox') as HTMLTextAreaElement;

const focusLine = (text: string) => {
  fireEvent.mouseDown(screen.getByText(text));
  return activeLine();
};

describe('NotesPad', () => {
  it('renders every line as math while nothing is focused', () => {
    const { container } = render(<Harness initial={'the trick is $x^2$\nso we substitute'} />);

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(container.querySelector('.katex')).toBeInTheDocument();
    expect(screen.getByText('so we substitute')).toBeInTheDocument();
  });

  it('shows raw source for the line you click into', () => {
    render(<Harness initial={'alpha\n$x^2$'} />);

    fireEvent.mouseDown(screen.getByText('alpha'));
    expect(activeLine().value).toBe('alpha');
  });

  it('leaves the other lines rendered while one is being edited', () => {
    const { container } = render(<Harness initial={'alpha\n$x^2$'} />);

    fireEvent.mouseDown(screen.getByText('alpha'));
    expect(screen.getAllByRole('textbox')).toHaveLength(1);
    expect(container.querySelector('.katex')).toBeInTheDocument();
  });

  it('splits a line on Enter', () => {
    render(<Harness initial={'alpha\nbeta'} />);

    const ta = focusLine('alpha');
    ta.setSelectionRange(2, 2);
    fireEvent.keyDown(ta, { key: 'Enter' });

    expect(activeLine().value).toBe('pha');
    expect(screen.getByText('al')).toBeInTheDocument();
  });

  it('merges upward on Backspace at the start of a line', () => {
    render(<Harness initial={'alpha\nbeta'} />);

    const ta = focusLine('beta');
    ta.setSelectionRange(0, 0);
    fireEvent.keyDown(ta, { key: 'Backspace' });

    expect(activeLine().value).toBe('alphabeta');
  });

  it('does not merge on Backspace from the very first line', () => {
    render(<Harness initial={'alpha\nbeta'} />);

    const ta = focusLine('alpha');
    ta.setSelectionRange(0, 0);
    fireEvent.keyDown(ta, { key: 'Backspace' });

    expect(activeLine().value).toBe('alpha');
    expect(screen.getByText('beta')).toBeInTheDocument();
  });

  it('walks between lines with the arrow keys', () => {
    render(<Harness initial={'alpha\nbeta'} />);

    const ta = focusLine('beta');
    ta.setSelectionRange(0, 0);
    fireEvent.keyDown(ta, { key: 'ArrowUp' });
    expect(activeLine().value).toBe('alpha');

    const up = activeLine();
    up.setSelectionRange(up.value.length, up.value.length);
    fireEvent.keyDown(up, { key: 'ArrowDown' });
    expect(activeLine().value).toBe('beta');
  });

  it('renders the line again once you press Escape', () => {
    render(<Harness initial={'alpha\nbeta'} />);

    const ta = focusLine('alpha');
    fireEvent.keyDown(ta, { key: 'Escape' });

    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(screen.getByText('alpha')).toBeInTheDocument();
  });

  it('offers a hint while it is empty', () => {
    render(<Harness initial="" />);
    expect(screen.getByText(/Wrap math in/)).toBeInTheDocument();
  });
});
