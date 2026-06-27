import { z } from 'zod';
import { sceneSchema } from './schema';

export type SceneIR = z.infer<typeof sceneSchema>;
export type SceneObject = SceneIR['objects'][number];

// runtime state, just numbers + bools for now (enum later)
export type Scope = Record<string, number | boolean>;
