'use client';
import { createContext, useContext, type ReactNode } from 'react';
import { arabicSceneText } from './sceneText';

export type MathNotation = 'latin' | 'ar';

const NotationContext = createContext<MathNotation>('latin');

export function MathNotationProvider({
  notation,
  children,
}: {
  notation: MathNotation;
  children: ReactNode;
}) {
  return <NotationContext.Provider value={notation}>{children}</NotationContext.Provider>;
}

export function useMathNotation(): MathNotation {
  return useContext(NotationContext);
}

const same = (s: string) => s;

export function useSceneText(): (s: string) => string {
  return useContext(NotationContext) === 'ar' ? arabicSceneText : same;
}
