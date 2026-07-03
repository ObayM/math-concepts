import type { ComponentType } from 'react';
import Slider from './Slider';
import Toggle from './Toggle';
import Stepper from './Stepper';
import Picker from './Picker';
import Button from './Button';

// as -> widget. same additive deal as the primitive registry
export const controlRegistry: Record<string, ComponentType<{ control: any }>> = {
  slider: Slider,
  toggle: Toggle,
  stepper: Stepper,
  picker: Picker,
  button: Button,
};
