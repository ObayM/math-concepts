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

describe('math inside right-to-left prose', () => {
  // katex sets no direction of its own. without an ltr island the bidi
  // algorithm reorders its spans and the formula renders backwards.
  it('isolates every math span from the surrounding direction', () => {
    const { container } = render(
      <div dir="rtl">
        <RichText>{'نكتبها $\\lim_{x \\to a} f(x) = L$ ومعناها'}</RichText>
      </div>
    );
    const math = container.querySelector('span[dir="ltr"]');
    expect(math).not.toBeNull();
    expect(math?.querySelector('.katex')).not.toBeNull();
  });

  it('isolates display math too', () => {
    const { container } = render(
      <div dir="rtl">
        <RichText>{'مقدمة\n\n$$x^2 + 1$$\n\nخاتمة'}</RichText>
      </div>
    );
    expect(container.querySelector('div[dir="ltr"] .katex')).not.toBeNull();
  });

  it('leaves the arabic prose itself alone', () => {
    const { container } = render(
      <div dir="rtl">
        <RichText>{'المشتقة تقيس معدل التغير'}</RichText>
      </div>
    );
    expect(container.textContent).toContain('المشتقة تقيس معدل التغير');
    expect(container.querySelector('span[dir="ltr"]')).toBeNull();
  });
});
