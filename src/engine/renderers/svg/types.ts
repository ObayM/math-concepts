import type { PointerEvent } from 'react';
import type { Scope } from '../../ir/types';

export interface CoordSystem {
  toX: (x: number) => number;
  toY: (y: number) => number;
  W: number;
  H: number;
  xDomain: [number, number];
  yDomain: [number, number];
}

export interface PrimProps {
  // obj is one of the ir object union. each primitive narrows it itself, so any is chill here
  obj: any;
  scope: Scope;
  cx: CoordSystem;
  points: Record<string, { x: number; y: number }>;
  startDrag: (obj: any) => (e: PointerEvent) => void;
}
