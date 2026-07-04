import type { ComponentType } from 'react';
import type { PrimProps } from './types';
import Curve from './primitives/Curve';
import Area from './primitives/Area';
import Point from './primitives/Point';
import Line from './primitives/Line';
import Label from './primitives/Label';
import Rect from './primitives/Rect';
import Circle from './primitives/Circle';
import Polygon from './primitives/Polygon';
import Vector from './primitives/Vector';
import Arc from './primitives/Arc';
import Image from './primitives/Image';

// type -> renderer. adding a primitive is just dropping one in here (like blockRegistry)
export const svgPrimitives: Record<string, ComponentType<PrimProps>> = {
  curve: Curve,
  area: Area,
  point: Point,
  line: Line,
  label: Label,
  rect: Rect,
  circle: Circle,
  polygon: Polygon,
  vector: Vector,
  arc: Arc,
  image: Image,
};
