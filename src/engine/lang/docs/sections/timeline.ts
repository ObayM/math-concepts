import type { DocSection } from '../types';

export const timelineSection: DocSection = {
  id: 'timeline',
  title: 'Timeline',
  description:
    'A timeline is a sequence of steps the learner plays through in order. Each step can narrate, set state instantly, or animate to new values. Great for walkthroughs and guided reveals.',
  entries: [
    {
      keyword: 'step',
      syntax: 'step ["narrate text"], [set:{k:v}], [animate:{k:v}], [dur:<ms>], [ease:<curve>]',
      description:
        'One beat in the timeline. The learner presses play to advance. Narrate text appears as a caption. Steps accumulate — state set in step 1 stays in step 2.',
      example: `step "here's f(x) = x²"\nstep "the tangent at x=t has slope 2t", set:{showTangent:true}\nstep "watch the slope change", animate:{t:3}, dur:2000, ease:easeInOut`,
    },
  ],
};
