'use client';
import { useState } from 'react';
import { formatPace } from '@/lib/warmup/stats';
import { useT } from '@/components/i18n/LocaleProvider';

const W = 640;
const H = 190;
const PAD = { top: 20, right: 10, bottom: 26, left: 34 };
const MAX_BAR = 22;
const MAX_BAND = 44;
const GAP = 2;
const STEPS = [0.25, 0.5, 1, 2, 5, 10];

function niceScale(maxSeconds) {
  const target = Math.max(maxSeconds * 1.15, 0.5);
  const step = STEPS.find((s) => target / s <= 4) ?? STEPS[STEPS.length - 1];
  return { top: Math.ceil(target / step) * step, step };
}

function columnPath(x, y, w, h) {
  const r = Math.min(4, w / 2, h);
  return `M${x},${y + h}L${x},${y + r}Q${x},${y} ${x + r},${y}L${x + w - r},${y}Q${x + w},${y} ${x + w},${y + r}L${x + w},${y + h}Z`;
}

export default function SpeedChart({ trend }) {
  const t = useT();
  const [active, setActive] = useState(null);

  if (trend.length < 2) {
    return (
      <p className="text-sm text-neutral-500">
        Answer twenty or more in a couple of sessions and the trend shows up here.
      </p>
    );
  }

  const seconds = trend.map((t) => t.pace / 1000);
  const { top, step } = niceScale(Math.max(...seconds));
  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const band = Math.min(plotW / trend.length, MAX_BAND);
  const barW = Math.min(MAX_BAR, Math.max(3, band - GAP));
  const left = PAD.left + (plotW - band * trend.length) / 2;
  const y = (value) => PAD.top + plotH - (value / top) * plotH;

  const ticks = [];
  for (let value = 0; value <= top + 1e-9; value += step) ticks.push(value);

  const newest = trend.length - 1;
  const hovered = active === null ? null : trend[active];

  return (
    <div>
      <div className="relative">
        {hovered && (
          <div
            className="pointer-events-none absolute -top-1 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-xl border border-neutral-200 bg-white px-3 py-2 text-left text-xs shadow-[0_4px_12px_-4px_rgba(15,23,42,0.15)]"
            style={{
              left: `${Math.min(88, Math.max(12, ((left + (active + 0.5) * band) / W) * 100))}%`,
            }}
          >
            <p className="font-bold text-neutral-900">{formatPace(hovered.pace)} per question</p>
            <p className="mt-0.5 text-neutral-500">
              {hovered.label} · level {hovered.level}
            </p>
            <p className="text-neutral-500">
              {hovered.answered} answered · {hovered.accuracy}% right
            </p>
          </div>
        )}

        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full"
          role="img"
          aria-label={`Seconds per question across your last ${trend.length} sessions, most recent ${formatPace(trend[newest].pace)}`}
        >
          {ticks.map((value) => (
            <g key={value}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(value)}
                y2={y(value)}
                stroke="var(--color-neutral-200)"
                strokeWidth="1"
              />
              <text
                x={PAD.left - 8}
                y={y(value) + 3.5}
                textAnchor="end"
                className="fill-neutral-400 text-[10px] tabular-nums"
              >
                {Number.isInteger(value) ? value : value.toFixed(2).replace(/0+$/, '')}
              </text>
            </g>
          ))}

          {trend.map((session, i) => {
            const height = Math.max(2, PAD.top + plotH - y(session.pace / 1000));
            const x = left + i * band + (band - barW) / 2;
            const lit = i === newest || active === i;
            return (
              <g
                key={session.id}
                onPointerEnter={() => setActive(i)}
                onPointerLeave={() => setActive(null)}
              >
                <rect
                  x={left + i * band}
                  y={PAD.top}
                  width={band}
                  height={plotH}
                  fill="transparent"
                />
                <path
                  d={columnPath(x, y(session.pace / 1000), barW, height)}
                  className={lit ? 'fill-primary-500' : 'fill-primary-500/40'}
                />
              </g>
            );
          })}

          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={PAD.top + plotH}
            y2={PAD.top + plotH}
            stroke="var(--color-neutral-300)"
            strokeWidth="1"
          />

          <text
            x={left + newest * band + band / 2}
            y={y(seconds[newest]) - 7}
            textAnchor="middle"
            className="fill-neutral-900 text-[11px] font-bold"
          >
            {formatPace(trend[newest].pace)}
          </text>

          <text x={left} y={H - 8} className="fill-neutral-400 text-[10px]">
            older
          </text>
          <text
            x={left + band * trend.length}
            y={H - 8}
            textAnchor="end"
            className="fill-neutral-400 text-[10px]"
          >
            latest
          </text>
        </svg>
      </div>

      <details className="mt-3">
        <summary className="cursor-pointer text-xs font-bold text-neutral-400 hover:text-neutral-600">
          View as a table
        </summary>
        <div className="mt-2 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-neutral-400">
                <th className="py-1 pr-4 font-bold">{t('warmup.session')}</th>
                <th className="py-1 pr-4 font-bold">{t('warmup.level')}</th>
                <th className="py-1 pr-4 font-bold">{t('warmup.answered')}</th>
                <th className="py-1 pr-4 font-bold">{t('warmup.right')}</th>
                <th className="py-1 font-bold">{t('warmup.perQuestion')}</th>
              </tr>
            </thead>
            <tbody className="tabular-nums text-neutral-600">
              {trend.map((session) => (
                <tr key={session.id} className="border-t border-neutral-100">
                  <td className="py-1 pr-4">{session.label}</td>
                  <td className="py-1 pr-4">{session.level}</td>
                  <td className="py-1 pr-4">{session.answered}</td>
                  <td className="py-1 pr-4">{session.accuracy}%</td>
                  <td className="py-1">{formatPace(session.pace)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
