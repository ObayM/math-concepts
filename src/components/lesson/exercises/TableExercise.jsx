'use client';
import RichText from '../RichText';

// v2 table — a fill-in-the-blank function table. reads slide.exercise
// (prompt, header?, rows[][{value}|{blank,answer}], tolerance, explanation).
// value is a flat array of typed strings, one per blank cell in row-major
// order — matches `flatBlanks` in the checkable registry.
export default function TableExercise({ slide, value, checked, onChange }) {
  const ex = slide.exercise;
  const totalBlanks = ex.rows.reduce((n, row) => n + row.filter((c) => c.blank).length, 0);
  const v = Array.isArray(value) ? value : new Array(totalBlanks).fill('');
  const correctCount = v.filter((s, i) => {
    const b = ex.rows.flat().filter((c) => c.blank)[i];
    return b && s !== '' && Math.abs(Number(s) - b.answer) <= ex.tolerance;
  }).length;

  const setBlank = (idx, text) => {
    const next = [...v];
    next[idx] = text;
    onChange(next);
  };

  let blankIdx = -1;

  return (
    <div className="flex flex-col">
      <RichText className="text-xl text-neutral-700 leading-[1.75] font-normal max-w-[42rem] mb-6">
        {ex.prompt}
      </RichText>

      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 end-0 w-8 bg-gradient-to-l from-white to-transparent md:hidden" />
        <div className="overflow-x-auto">
          <table className="border-collapse">
            {ex.header && (
              <thead>
                <tr>
                  {ex.header.map((h, i) => (
                    <th
                      key={i}
                      className="px-4 py-2 text-sm font-bold text-neutral-500 border-b border-neutral-200 text-start"
                    >
                      <RichText>{h}</RichText>
                    </th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {ex.rows.map((row, r) => (
                <tr key={r}>
                  {row.map((cell, c) => {
                    if (!cell.blank) {
                      return (
                        <td
                          key={c}
                          className="px-4 py-2 border-b border-neutral-100 font-bold text-neutral-700"
                        >
                          {cell.value}
                        </td>
                      );
                    }
                    blankIdx++;
                    const idx = blankIdx;
                    const filled = v[idx] ?? '';
                    const isCorrect =
                      checked &&
                      filled !== '' &&
                      Math.abs(Number(filled) - cell.answer) <= ex.tolerance;
                    const isWrong = checked && filled !== '' && !isCorrect;
                    let cls = 'border-neutral-300 focus:border-primary-400';
                    if (isCorrect) cls = 'border-success-500 bg-success-50 text-success-700';
                    if (isWrong) cls = 'border-danger-500 bg-danger-50 text-danger-700';
                    return (
                      <td key={c} className="px-4 py-2 border-b border-neutral-100">
                        <input
                          type="text"
                          inputMode="decimal"
                          value={filled}
                          disabled={checked}
                          onChange={(e) => setBlank(idx, e.target.value)}
                          className={`tap-target-h w-16 px-2 py-1 rounded-lg border-2 text-center font-bold outline-none transition-all ${cls}`}
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {checked && (
        <p className="mt-4 text-sm font-bold text-neutral-500">
          {correctCount} / {totalBlanks} correct
        </p>
      )}

      {checked && ex.explanation && (
        <RichText className="mt-4 text-sm text-neutral-500 bg-neutral-50 rounded-xl p-4 leading-relaxed block">
          {ex.explanation}
        </RichText>
      )}
    </div>
  );
}
