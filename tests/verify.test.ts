import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { compileLesson, slideLines } from '@/engine/lang';
import { lessonSchema } from '@/engine/ir/lesson';
import { verifyLesson } from '@/engine/verify';

const codes = (src: string) =>
  verifyLesson(lessonSchema.parse(compileLesson(src))).map((f) => f.code);

const wrap = (body: string) => `lesson "L" {\n  slide "s" {\n    id: "s1"\n${body}\n  }\n}`;

describe('curve sampling', () => {
  it('flags a curve that is never finite anywhere in view', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [1, 3]\n      y: [-5, 5]\n      curve f = sqrt(0 - x) { color: primary }\n    }'
        )
      )
    ).toContain('V_CURVE_EMPTY');
  });

  it('flags a curve defined on only a sliver of the range', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-10, 1]\n      y: [-5, 5]\n      curve f = sqrt(x) { color: primary }\n    }'
        )
      )
    ).toContain('V_CURVE_MOSTLY_UNDEFINED');
  });

  it('leaves an ordinary curve alone', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-3, 3]\n      y: [-5, 5]\n      curve f = x^2 { color: primary }\n    }'
        )
      )
    ).toEqual([]);
  });

  it('does not flag a curve that depends on scene state', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-2, 2]\n      y: [-8, 12]\n      param n = 2 { range: [1, 4], step: 1 }\n      curve f = x^n { color: primary }\n      curve g = n * x^(n - 1) { color: accent }\n    }'
        )
      )
    ).toEqual([]);
  });

  it('does not flag a piecewise curve, whose where: guard it cannot reason about', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-3, 3]\n      y: [-5, 5]\n      curve f = 1/x { where: x > 0.1, color: primary }\n    }'
        )
      )
    ).toEqual([]);
  });
});

describe('table against the slide curve', () => {
  const table = (blank: number) =>
    wrap(
      `    scene plane {\n      x: [-3, 3]\n      y: [-2, 10]\n      curve f = x^2 { color: primary }\n    }\n    table {\n      ask "fill it"\n      header: ["x", "f(x)"]\n      row: 2, blank(${blank})\n    }`
    );

  it('flags a blank that disagrees with the curve', () => {
    expect(codes(table(5))).toContain('V_TABLE_OFF_CURVE');
  });

  it('accepts a blank that matches the curve', () => {
    expect(codes(table(4))).toEqual([]);
  });
});

describe('targets inside the scene', () => {
  it('flags a hotspot target outside the visible range', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-2, 2]\n      y: [-2, 2]\n      curve f = x { color: primary }\n    }\n    hotspot {\n      ask "tap"\n      target circle (9, 9) { r: 0.5 }\n    }'
        )
      )
    ).toContain('V_HOTSPOT_OFFSCREEN');
  });

  it('accepts a hotspot inside the range', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-2, 2]\n      y: [-2, 2]\n      curve f = x { color: primary }\n    }\n    hotspot {\n      ask "tap"\n      target circle (1, 1) { r: 0.5 }\n    }'
        )
      )
    ).toEqual([]);
  });

  it('flags a sketch target outside the visible range', () => {
    expect(
      codes(
        wrap(
          '    scene plane {\n      x: [-2, 2]\n      y: [-2, 2]\n      curve f = x { color: primary }\n    }\n    sketch points {\n      ask "tap"\n      near (8, 0)\n      tol: 0.5\n    }'
        )
      )
    ).toContain('V_SKETCH_OFFSCREEN');
  });
});

describe('match and order ambiguity', () => {
  it('flags two pairs sharing a right-hand side', () => {
    expect(
      codes(
        wrap('    match {\n      ask "match"\n      pair "a" -> "1"\n      pair "b" -> "1"\n    }')
      )
    ).toContain('V_MATCH_AMBIGUOUS');
  });

  it('flags a match decoy that is really an answer', () => {
    expect(
      codes(
        wrap(
          '    match {\n      ask "match"\n      pair "a" -> "1"\n      pair "b" -> "2"\n      decoy "2"\n    }'
        )
      )
    ).toContain('V_MATCH_DECOY_REAL');
  });

  it('flags a duplicated order item', () => {
    expect(
      codes(
        wrap(
          '    order {\n      ask "order"\n      item "x"\n      item "y"\n      item "x"\n    }'
        )
      )
    ).toContain('V_ORDER_AMBIGUOUS');
  });

  it('flags an order decoy that is really an item', () => {
    expect(
      codes(
        wrap(
          '    order {\n      ask "order"\n      item "x"\n      item "y"\n      decoy "y"\n    }'
        )
      )
    ).toContain('V_ORDER_DECOY_REAL');
  });

  it('accepts a clean match', () => {
    expect(
      codes(
        wrap(
          '    match {\n      ask "match"\n      pair "a" -> "1"\n      pair "b" -> "2"\n      decoy "3"\n    }'
        )
      )
    ).toEqual([]);
  });
});

describe('build reachability', () => {
  it('flags an answer using a token more often than the bank allows', () => {
    expect(
      codes(
        wrap(
          '    build {\n      ask "build"\n      bank: ["x", "+"]\n      answer: ["x", "+", "x"]\n    }'
        )
      )
    ).toContain('V_BUILD_UNREACHABLE');
  });

  it('allows repeats when the bank is reusable', () => {
    expect(
      codes(
        wrap(
          '    build {\n      ask "build"\n      reusable\n      bank: ["x", "+"]\n      answer: ["x", "+", "x"]\n    }'
        )
      )
    ).toEqual([]);
  });

  it('flags a second answer that does not fit the slot count', () => {
    expect(
      codes(
        wrap(
          '    build {\n      ask "build"\n      reusable\n      bank: ["x", "+", "1"]\n      answer: ["x", "+", "1"]\n      answer: ["x", "+"]\n    }'
        )
      )
    ).toContain('V_BUILD_SLOTS');
  });
});

describe('along-drag range', () => {
  const scene = (range: string) =>
    wrap(
      `    scene plane {
      x: [-2, 2]
      y: [-2, 2]
      param th = 0.6 { range: ${range}, step: 0.01 }
      circle unit = (0, 0) { r: 1, color: neutral }
      point P = (cos(th), sin(th)) { drag: along(unit) -> th, color: primary }
    }`
    );

  it('flags a range the atan2 drag can never write', () => {
    expect(codes(scene('[0, 6.28]'))).toContain('V_ALONG_RANGE');
  });

  it('accepts the range atan2 actually produces', () => {
    expect(codes(scene('[-3.14, 3.14]'))).toEqual([]);
  });

  it('leaves a drag along a line segment alone', () => {
    const src = wrap(
      `    scene plane {
      x: [-2, 2]
      y: [-2, 2]
      param t = 0.5 { range: [0, 1], step: 0.01 }
      line seg = (-1, 0) -> (1, 0) { color: neutral }
      point P = (0 - 1 + 2*t, 0) { drag: along(seg) -> t, color: primary }
    }`
    );
    expect(codes(src)).toEqual([]);
  });
});

describe('free-drag anchoring', () => {
  const scene = (pos: string) =>
    wrap(
      `    scene plane {
      x: [-6, 6]
      y: [-6, 6]
      param bx = 1 { range: [-3, 5], step: 1 }
      param by = 3 { range: [-2, 5], step: 1 }
      point h = ${pos} { drag: xy -> (bx, by), color: primary }
    }`
    );

  it('flags a handle drawn at an offset from the params it writes', () => {
    expect(codes(scene('(3 + bx, 1 + by)'))).toContain('V_DRAG_ANCHOR');
  });

  it('accepts a handle drawn exactly at its binds', () => {
    expect(codes(scene('(bx, by)'))).toEqual([]);
  });

  it('flags only the axis that actually drifts', () => {
    const found = verifyLesson(lessonSchema.parse(compileLesson(scene('(bx, 1 + by)'))));
    expect(found.map((f) => f.code)).toEqual(['V_DRAG_ANCHOR']);
    expect(found[0].message).toContain('y is not by');
    expect(found[0].message).not.toContain('x is not');
  });
});

describe('detour reachability', () => {
  it('flags a hidden slide nothing points at', () => {
    const src = `lesson "L" {
  slide "main" {
    id: "m1"
    > hello
  }
  slide "orphan" {
    id: "o1"
    hidden: true
    > unreachable
  }
}`;
    expect(codes(src)).toContain('V_DETOUR_ORPHAN');
  });

  it('accepts a hidden slide that is a real detour target', () => {
    const src = `lesson "L" {
  slide "main" {
    numeric {
      ask "2+2?"
      answer: 4
      onwrong: "o1" retry
    }
  }
  slide "scaffold" {
    id: "o1"
    hidden: true
    > help
  }
}`;
    expect(codes(src)).toEqual([]);
  });
});

describe('the real content', () => {
  const dir = fileURLToPath(new URL('../prisma/lessons', import.meta.url));
  const files = readdirSync(dir).filter((f) => f.endsWith('.prism'));

  it('found the real lessons, not an empty glob', () => {
    expect(files.length).toBeGreaterThanOrEqual(25);
  });

  for (const f of files) {
    it(`${f} has nothing to flag`, () => {
      const src = readFileSync(`${dir}/${f}`, 'utf8');
      expect(verifyLesson(lessonSchema.parse(compileLesson(src)))).toEqual([]);
    });
  }
});

describe('slideLines', () => {
  it('maps every slide id back to the line its slide keyword sits on', () => {
    const src = `lesson "L" {
  slide "First" {
    id: "one"
    > a
  }

  slide "Second Slide" {
    > b
  }

  slide "Third" {
    id: "three"
    > c
  }
}`;
    expect(slideLines(src)).toEqual(
      new Map([
        ['one', 2],
        ['second-slide', 7],
        ['three', 11],
      ])
    );
  });

  it('pairs a verify finding with a real line', () => {
    const src = `lesson "L" {
  slide "Intro" {
    > nothing here
  }

  slide "Broken" {
    id: "broken"
    scene plane {
      x: [0, 4]
      y: [0, 16]
      curve f = x^2
    }
    table {
      ask "t"
      header: ["x", "f(x)"]
      row: 1, blank(99)
    }
  }
}`;
    const [finding] = verifyLesson(compileLesson(src));
    expect(finding.code).toBe('V_TABLE_OFF_CURVE');
    expect(slideLines(src).get(finding.slideId)).toBe(6);
  });

  it('is empty for a bare scene file', () => {
    const scene = `scene plane {
  x: [0, 1]
  y: [0, 1]
  curve f = x
}`;
    expect(slideLines(scene)).toEqual(new Map());
  });
});
