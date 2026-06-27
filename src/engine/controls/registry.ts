import type { ComponentType } from 'react';
import Slider from './Slider';
import Toggle from './Toggle';

// as -> widget. same additive deal as the primitive registry
export const controlRegistry: Record<string, ComponentType<{ control: any }>> = {
  slider: Slider,
  toggle: Toggle,
};
