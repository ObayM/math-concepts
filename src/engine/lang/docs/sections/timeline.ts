import type { DocSection } from '../types';

export const timelineSection: DocSection = {
  id: 'timeline',
  title: 'Timeline',
  description:
    'A timeline is a sequence of steps the learner plays through in order. Each step can narrate, set state instantly, or animate to new values. Great for walkthroughs and guided reveals.',
  entries: [
    {
      keyword: 'step',
      syntax:
        'step ["narrate text"] { [set: {k: v}], [animate: {k: v}], [dur: <ms>], [ease: <curve>], [hint: "..."] }',
      description:
        'One beat in the timeline. The learner presses play to advance. Narrate text appears as a caption. Steps accumulate — state set in step 1 stays in step 2. `hint` adds an optional nudge behind a "Hint" button, for a step that isn\'t obvious on its own.',
      props: [
        {
          name: 'hint',
          type: 'string',
          description: 'nudge shown behind a Hint button on this step',
        },
      ],
      example: `param t = 0 { range: [-3, 3] }\nbool showTangent = false\nstep "here's f(x) = x²"\nstep "the tangent at x=t has slope 2t" { set: { showTangent: true }, hint: "slope of x² at x=t is 2t" }\nstep "watch the slope change" { animate: { t: 3 }, dur: 2000, ease: easeInOut }`,
    },
  ],
};
