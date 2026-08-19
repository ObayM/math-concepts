import { evalNumber, interpolate } from '@/engine/runtime/eval';
import { resolveColor, dash, LABEL_HALO, SHAPE_STROKE_WIDTH } from '@/engine/colors';
import type { Prim3Props } from '@/engine/renderers/svg/types';

type V3 = [number, number, number];

const cross = (a: V3, b: V3): V3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const norm = (v: V3) => Math.hypot(v[0], v[1], v[2]);
const unit = (v: V3): V3 => {
  const n = norm(v);
  return [v[0] / n, v[1] / n, v[2] / n];
};

// a plane is infinite; we draw a square patch of it around `through`. the two
// spanning directions are any orthonormal pair perpendicular to the normal.
export function spanOf(n: V3): [V3, V3] | null {
  if (!(norm(n) > 1e-9)) return null;
  const seed: V3 = Math.abs(n[0]) < 0.9 ? [1, 0, 0] : [0, 1, 0];
  const u = unit(cross(n, seed));
  const v = unit(cross(n, u));
  return [u, v];
}

export default function Plane3({ obj, scope, cx }: Prim3Props) {
  const n: V3 = [evalNumber(obj.nx, scope), evalNumber(obj.ny, scope), evalNumber(obj.nz, scope)];
  const c: V3 = [
    evalNumber(obj.through[0], scope),
    evalNumber(obj.through[1], scope),
    evalNumber(obj.through[2], scope),
  ];
  if (![...n, ...c].every(Number.isFinite)) return null;

  const span = spanOf(n);
  if (!span) return null;
  const [u, v] = span;
  const s = obj.size ?? 3;

  const corners: V3[] = [
    [1, 1],
    [-1, 1],
    [-1, -1],
    [1, -1],
  ].map(([a, b]) => [
    c[0] + s * (a * u[0] + b * v[0]),
    c[1] + s * (a * u[1] + b * v[1]),
    c[2] + s * (a * u[2] + b * v[2]),
  ]);

  const pts = corners.map((p) => cx.project3(p[0], p[1], p[2]));
  if (!pts.every(([px, py]) => Number.isFinite(px) && Number.isFinite(py))) return null;

  const color = resolveColor(obj.color);
  const [lx, ly] = cx.project3(c[0], c[1], c[2]);

  return (
    <g>
      <polygon
        points={pts.map(([px, py]) => `${px},${py}`).join(' ')}
        fill={obj.fill ? resolveColor(obj.fill) : color}
        fillOpacity={obj.opacity ?? 0.18}
        stroke={color}
        strokeWidth={obj.strokeWidth ?? SHAPE_STROKE_WIDTH}
        strokeDasharray={dash(obj.style)}
        strokeLinejoin="round"
      />
      {obj.label && (
        <text
          x={lx}
          y={ly}
          direction="ltr"
          style={{ unicodeBidi: 'isolate' }}
          textAnchor="middle"
          fontSize={14}
          fontWeight={600}
          fill={color}
          stroke={LABEL_HALO}
          strokeWidth={3}
          paintOrder="stroke"
        >
          {interpolate(obj.label, scope)}
        </text>
      )}
    </g>
  );
}
