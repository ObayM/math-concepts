import { z } from 'zod';
import { sceneSchema } from './schema';

export type SceneIR = z.infer<typeof sceneSchema>;
export type SceneObject = SceneIR['objects'][number];

export type Scope = Record<string, number | boolean | string>;
