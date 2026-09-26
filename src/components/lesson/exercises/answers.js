export { parseNumber, isNumberAnswer, formatAnswer } from '@/engine/checks/number';

export const sameAnswer = (a, b) => typeof a === 'string' && a.trim() === b?.trim();
