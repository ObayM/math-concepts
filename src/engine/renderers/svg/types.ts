import type { PointerEvent } from 'react';
import type { Scope } from '@/engine/ir/types';

export interface CoordSystem {
  toX: (x: number) => number;
  toY: (y: number) => number;
  fromX: (px: number) => number;
  fromY: (py: number) => number;
  W: number;
  H: number;
  xDomain: [number, number];
  yDomain: [number, number];
}

// a scene rendered in three dimensions carries the projection with it; the 2d
// primitives never see this and 3d primitives require it
export interface Coord3 extends CoordSystem {
  zDomain: [number, number];
  project3: (x: number, y: number, z: number) => [number, number, number];
}

export interface Prim3Props {
  obj: any;
  scope: Scope;
  cx: Coord3;
}

export interface PrimProps {
  // obj is one of the ir object union. each primitive narrows it itself, so any is chill here
  obj: any;
  scope: Scope;
  cx: CoordSystem;
  points: Record<string, { x: number; y: number }>;
  startDrag: (obj: any) => (e: PointerEvent) => void;
}
