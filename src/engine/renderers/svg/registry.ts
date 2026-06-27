import type { ComponentType } from 'react';
import type { PrimProps } from './types';
import Curve from './primitives/Curve';
import Point from './primitives/Point';
import Line from './primitives/Line';
import Label from './primitives/Label';

// type -> renderer. adding a primitive is just dropping one in here (like blockRegistry)
export const svgPrimitives: Record<string, ComponentType<PrimProps>> = {
  curve: Curve,
  point: Point,
  line: Line,
  label: Label,
};
