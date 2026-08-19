import type { ComponentType } from 'react';
import type { Prim3Props } from './types';
import Point3 from './primitives3/Point3';
import Segment3 from './primitives3/Segment3';
import Polygon3 from './primitives3/Polygon3';
import Plane3 from './primitives3/Plane3';
import Label3 from './primitives3/Label3';

export const space3Primitives: Record<string, ComponentType<Prim3Props>> = {
  point3: Point3,
  segment3: Segment3,
  polygon3: Polygon3,
  plane3: Plane3,
  label3: Label3,
};
