export { parseNumber, isNumberAnswer } from '@/engine/checks/number';

export const sameAnswer = (a, b) => typeof a === 'string' && a.trim() === b?.trim();
