'use client';

const isWarning = (d) => d.severity === 4;

function summarize(diagnostics) {
  const warnings = diagnostics.filter(isWarning).length;
  const errors = diagnostics.length - warnings;
  const parts = [];
  if (errors) parts.push(`${errors} error${errors === 1 ? '' : 's'}`);
  if (warnings) parts.push(`${warnings} warning${warnings === 1 ? '' : 's'}`);
  return parts.length ? ` (${parts.join(', ')})` : '';
}

export default function ProblemsPanel({ diagnostics, onJump }) {
  return (
    <div className="flex h-full flex-col overflow-hidden border border-neutral-200 bg-card">
      <p className="border-b border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-neutral-500">
        Problems{summarize(diagnostics)}
      </p>
      <div className="flex-1 overflow-auto">
        {diagnostics.length === 0 ? (
          <p className="p-3 text-sm text-neutral-400">No problems.</p>
        ) : (
          <ul className="divide-y divide-neutral-100">
            {diagnostics.map((d, i) => {
              const warn = isWarning(d);
              return (
                <li key={i}>
                  <button
                    type="button"
                    onClick={() => onJump(d.startLineNumber, d.startColumn)}
                    className={`flex w-full items-start gap-2 px-3 py-2 text-left text-xs ${
                      warn ? 'hover:bg-warning-50' : 'hover:bg-danger-50'
                    }`}
                  >
                    <span
                      className={`flex-shrink-0 font-mono font-semibold ${
                        warn ? 'text-warning-600' : 'text-danger-600'
                      }`}
                    >
                      Ln {d.startLineNumber}
                    </span>
                    {d.code && (
                      <span className="flex-shrink-0 font-mono text-neutral-400">{d.code}</span>
                    )}
                    <span className="text-neutral-700">{d.message}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
