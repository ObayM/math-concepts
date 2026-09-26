import { z } from 'zod';
import { sceneSchema, paneSchema } from './schema';

export type SceneIR = z.infer<typeof sceneSchema>;
export type SceneObject = SceneIR['objects'][number];

export type Scope = Record<string, number | boolean | string>;
export type PaneIR = z.infer<typeof paneSchema>;
