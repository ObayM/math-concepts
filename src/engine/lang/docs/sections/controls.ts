import type { DocSection } from '../types';

export const controlsSection: DocSection = {
  id: 'controls',
  title: 'Controls',
  description:
    'Controls are the interactive widgets the learner uses. They write to state variables, which re-evaluates all object expressions.',
  entries: [
    {
      keyword: 'slider',
      syntax: 'slider <bind>, [label:"text"], [min:<n>], [max:<n>], [step:<n>]',
      description:
        "A horizontal slider bound to a numeric state variable. `min`/`max` override the param's range.",
      example: 'slider t, label:"move the point", min:-3, max:3',
    },
    {
      keyword: 'toggle',
      syntax: 'toggle <bind>, [label:"text"]',
      description: 'An on/off switch bound to a boolean state variable.',
      example: 'toggle showTangent, label:"show tangent line"',
    },
    {
      keyword: 'stepper',
      syntax: 'stepper <bind>, [label:"text"], [step:<n>]',
      description: 'A − / + stepper bound to a numeric state variable.',
      example: 'stepper n, label:"rectangles", step:1',
    },
    {
      keyword: 'button',
      syntax:
        'button "label", [set:{k:v}], [step:{k:v}], [animate:{k:v}], [toggle:"key"], [dur:<ms>], [ease:<curve>]',
      description:
        'A pressable button that fires one or more actions. `set` = instant assignment; `step` = increment; `animate` = smooth tween; `toggle` = flip a boolean. Easing: `linear`, `easeIn`, `easeOut`, `easeInOut`.',
      props: [
        { name: 'set', type: '{ key: value }', description: 'instantly set state keys' },
        { name: 'step', type: '{ key: delta }', description: 'increment state keys' },
        {
          name: 'animate',
          type: '{ key: target }',
          description: 'tween state keys to target values',
        },
        { name: 'toggle', type: 'string', description: 'flip a boolean state key' },
        { name: 'dur', type: 'ms', description: 'animation duration (default 600ms)' },
        { name: 'ease', type: 'string', description: 'easing curve for animate' },
      ],
      example: `button "reset", set:{t:0}\nbutton "play", animate:{t:3}, dur:2000, ease:easeInOut`,
    },
  ],
};
