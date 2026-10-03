import { describe, it, expect } from 'vitest';
import katex from 'katex';
import { arabicMath, collisions, parseTex } from '@/engine/artex';
import { arabicSceneText } from '@/engine/artex/sceneText';

const body = (tex: string) => {
  const r = arabicMath(tex, false);
  expect(r.fallback).toBe(false);
  return r.html.replace(/^<math[^>]*>|<\/math>$/g, '');
};

describe('katex parse tree contract', () => {
  it('still shapes the nodes artex reads the way 0.17 does', () => {
    expect(katex.version).toMatch(/^0\.17\./);
    const strip = (n: unknown) =>
      JSON.parse(JSON.stringify(n, (k, v) => (k === 'loc' ? undefined : v)));
    expect(strip(parseTex('x^2'))).toEqual([
      {
        type: 'supsub',
        mode: 'math',
        base: { type: 'mathord', mode: 'math', text: 'x' },
        sup: { type: 'textord', mode: 'math', text: '2' },
      },
    ]);
    const frac = strip(parseTex('\\frac{a}{b}'))[0];
    expect(frac).toMatchObject({ type: 'genfrac', hasBarLine: true, numer: { type: 'ordgroup' } });
    expect(strip(parseTex('\\vec{A}'))[0]).toMatchObject({ type: 'accent', label: '\\vec' });
    expect(strip(parseTex('\\sin x'))[0]).toMatchObject({
      type: 'op',
      name: '\\sin',
      symbol: false,
    });
    expect(strip(parseTex('\\left(x\\right)'))[0]).toMatchObject({
      type: 'leftright',
      left: '(',
      right: ')',
    });
  });
});

describe('arabic notation', () => {
  it('writes y = 3x^2 + 5 the way the book does', () => {
    expect(body('y = 3x^2 + 5')).toBe(
      '<mi>ص</mi><mo>=</mo><mn>٣</mn><msup><mi>س</mi><mn>٢</mn></msup><mo>+</mo><mn>٥</mn>'
    );
  });

  it('turns dy/dx into ءص/ءس', () => {
    expect(body('\\frac{dy}{dx}')).toBe(
      '<mfrac><mrow><mi>ء</mi><mi>ص</mi></mrow><mrow><mi>ء</mi><mi>س</mi></mrow></mfrac>'
    );
  });

  it('names functions د ر هـ and keeps the prime', () => {
    expect(body("f'(x)")).toBe('<msup><mi>د</mi><mo>′</mo></msup><mo>(</mo><mi>س</mi><mo>)</mo>');
    expect(body('g(t)')).toBe('<mi>ر</mi><mo>(</mo><mi>ن</mi><mo>)</mo>');
  });

  it('uses the six arabic trig names with a thin space before the argument', () => {
    expect(body('\\sin x')).toBe('<mi>جا</mi><mspace width="0.2222em"></mspace><mi>س</mi>');
    expect(body('\\cos^2 x')).toBe(
      '<msup><mi>جتا</mi><mn>٢</mn></msup><mspace width="0.2222em"></mspace><mi>س</mi>'
    );
    for (const [cmd, ar] of [
      ['tan', 'ظا'],
      ['cot', 'ظتا'],
      ['sec', 'قا'],
      ['csc', 'قتا'],
    ])
      expect(body(`\\${cmd} x`)).toContain(`<mi>${ar}</mi>`);
  });

  it('spaces a function off from a coefficient in front of it', () => {
    expect(body('2\\sec 2x')).toBe(
      '<mn>٢</mn><mspace width="0.2222em"></mspace><mi>قا</mi><mspace width="0.2222em"></mspace><mn>٢</mn><mi>س</mi>'
    );
  });

  it('puts no space between a function and its bracket', () => {
    expect(body('\\sin(x)')).toBe('<mi>جا</mi><mo>(</mo><mi>س</mi><mo>)</mo>');
  });

  it('writes digits, decimals and tuples in arabic', () => {
    expect(body('2.5')).toBe('<mn>٢٫٥</mn>');
    expect(body('(3, 4, 12)')).toBe(
      '<mo>(</mo><mn>٣</mn><mo>،</mo><mn>٤</mn><mo>،</mo><mn>١٢</mn><mo>)</mo>'
    );
  });

  it('points arrows the way an rtl reader goes', () => {
    expect(body('x \\to 0')).toBe('<mi>س</mi><mo>←</mo><mn>٠</mn>');
    expect(body('\\vec{AB}')).toBe(
      '<mover accent="true"><mrow><mi>أ</mi><mi>ب</mi></mrow><mo stretchy="false">←</mo></mover>'
    );
    expect(body('\\overrightarrow{OP}')).toContain('<mo stretchy="true">←</mo>');
  });

  it('writes the unit vectors as arrows over س ص ع, any other hat over ى', () => {
    const arrow = (l: string) =>
      `<mover accent="true"><mi>${l}</mi><mo stretchy="false">←</mo></mover>`;
    expect(body('\\hat i')).toBe(arrow('س'));
    expect(body('\\hat{j}')).toBe(arrow('ص'));
    expect(body('\\hat k')).toBe(arrow('ع'));
    expect(body('\\hat n')).toBe(arrow('ى'));
  });

  it('uses the book letters for the number sets and pi', () => {
    expect(body('\\mathbb{R}')).toBe('<mi>ح</mi>');
    expect(body('\\mathbb{Z}')).toBe('<mi>ص</mi>');
    expect(body('\\pi r^2')).toBe('<mi>ط</mi><msup><mi>نق</mi><mn>٢</mn></msup>');
  });

  it('leaves arabic already in the source alone', () => {
    expect(body('ص = 2')).toBe('<mi>ص</mi><mo>=</mo><mn>٢</mn>');
    expect(body('5\\text{ سم}')).toBe('<mn>٥</mn><mtext> سم</mtext>');
  });

  it('builds roots, limits, fences and negated relations', () => {
    expect(body('\\sqrt{x}')).toBe('<msqrt><mi>س</mi></msqrt>');
    expect(body('\\sqrt[3]{x}')).toBe('<mroot><mi>س</mi><mn>٣</mn></mroot>');
    expect(body('\\lim\\limits_{x \\to 0} x')).toBe(
      '<munder><mi>نها</mi><mrow><mi>س</mi><mo>←</mo><mn>٠</mn></mrow></munder><mspace width="0.2222em"></mspace><mi>س</mi>'
    );
    expect(body('\\left(x\\right)')).toBe(
      '<mrow><mo fence="true" stretchy="true">(</mo><mi>س</mi><mo fence="true" stretchy="true">)</mo></mrow>'
    );
    expect(body('x \\neq 1')).toContain('<mo>≠</mo>');
  });

  it('carries colors through as mathcolor', () => {
    expect(body('\\textcolor{primary}{x}')).toBe('<mstyle mathcolor="#3b82f6"><mi>س</mi></mstyle>');
  });

  it('marks display math as a block, both rtl', () => {
    expect(arabicMath('x', true).html).toBe(
      '<math dir="rtl" class="artex" display="block"><mi>س</mi></math>'
    );
    expect(arabicMath('x', false).html).toBe('<math dir="rtl" class="artex"><mi>س</mi></math>');
  });

  it('escapes what it emits', () => {
    expect(body('a < b')).toBe('<mi>أ</mi><mo>&lt;</mo><mi>ب</mi>');
  });
});

describe('what artex cannot do', () => {
  it('falls back to katex ltr instead of throwing', () => {
    const r = arabicMath('\\boxed{x}', false);
    expect(r.fallback).toBe(true);
    expect(r.html).toMatch(/^<span dir="ltr"><span class="katex">/);
  });

  it('falls back on a parse error too', () => {
    expect(arabicMath('\\frac{', false).fallback).toBe(true);
  });

  it('reports letters it has no arabic for, and letters that collide', () => {
    expect([...arabicMath('P + q', false).report.latin]).toEqual(['P', 'q']);
    expect(collisions(arabicMath('C(0, c, 0)', false).report)).toEqual([['جـ', ['C', 'c']]]);
    expect(collisions(arabicMath('x\\hat i + y\\hat j', false).report)).toEqual([]);
  });
});

describe('scene labels in arabic', () => {
  const RLI = '\u2067';
  const PDI = '\u2069';
  const n = (s: string) => `${RLI}${s}${PDI}`;

  it('maps point names and coordinates, each number its own rtl run', () => {
    expect(arabicSceneText('O')).toBe(n('و'));
    expect(arabicSceneText('P(3, -4, 12)')).toBe(n(`P(${n('٣')}، ${n('−٤')}، ${n('١٢')})`));
    expect(arabicSceneText('-2.5')).toBe(n(n('−٢٫٥')));
  });

  it('reads greek and degrees as math', () => {
    expect(arabicSceneText('θx = 54.74°')).toBe(n(`θس = ${n('٥٤٫٧٤')}°`));
  });

  it('turns the numbers in an arabic label into arabic digits and nothing else', () => {
    expect(arabicSceneText('الميل = -1.00')).toBe(n(`الميل = ${n('−١٫٠٠')}`));
    expect(arabicSceneText('لفّ المشهد')).toBe('لفّ المشهد');
  });

  it('names points inside arabic labels too, and reads × as math', () => {
    expect(arabicSceneText('موضع Q على محور x')).toBe(n('موضع Q على محور س'));
    expect(arabicSceneText('B × A')).toBe(n('ب × أ'));
  });

  it('leaves words alone', () => {
    expect(arabicSceneText('max')).toBe('max');
    expect(arabicSceneText('')).toBe('');
  });
});

describe('unary signs', () => {
  it('marks a minus as prefix after a comma, a bracket, a relation or nothing', () => {
    expect(body('(0, -3)')).toContain('<mo>،</mo><mo form="prefix">−</mo><mn>٣</mn>');
    expect(body('-x')).toBe('<mo form="prefix">−</mo><mi>س</mi>');
    expect(body('x = -2')).toContain('<mo>=</mo><mo form="prefix">−</mo>');
    expect(body('\\left(-1\\right)')).toContain('<mo form="prefix">−</mo>');
  });

  it('keeps a minus between two terms binary', () => {
    expect(body('x - 1')).toBe('<mi>س</mi><mo>−</mo><mn>١</mn>');
  });
});

describe('axis lines', () => {
  it("writes the negative half of an axis as the book does, سَ for x'", () => {
    expect(body("\\overleftrightarrow{xx'}")).toBe(
      '<mover accent="true"><mrow><mi>س</mi><mi>سَ</mi></mrow><mo stretchy="true">↔</mo></mover>'
    );
  });

  it("keeps y' a derivative everywhere else", () => {
    expect(body("y'")).toBe('<msup><mi>ص</mi><mo>′</mo></msup>');
  });
});
