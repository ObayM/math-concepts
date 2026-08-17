import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import RichText from '@/components/lesson/RichText';

const html = (src: string) => render(<RichText className="">{src}</RichText>).container.innerHTML;

describe('RichText', () => {
  it('renders inline math', () => {
    const out = html('the angle is $150°$ here');
    expect(out).toContain('katex');
    expect(out).not.toContain('$150°$');
  });

  it('renders math nested inside bold', () => {
    const out = html('**a triangle cannot contain $150°$.**');
    expect(out).toContain('<strong');
    expect(out).toContain('katex');
    expect(out).not.toContain('$150°$');
  });

  it('renders math nested inside italics', () => {
    const out = html('*a rope pulls with $20$ N of force*');
    expect(out).toContain('<em');
    expect(out).toContain('katex');
    expect(out).not.toContain('$20$');
  });

  it('keeps bold and italic markers out of the output', () => {
    expect(html('**loud** and *quiet*')).not.toContain('*');
  });

  it('still renders a display-math paragraph on its own', () => {
    const out = html('lead in\n\n$$x^2 + y^2 = 1$$');
    expect(out).toContain('katex');
    expect(out).not.toContain('$$');
  });
});
