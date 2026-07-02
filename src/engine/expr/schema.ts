import { z } from 'zod';
import type { ExprIR } from './types';
import { BUILTIN_NAMES } from './builtins';

// zod schema for ExprIR — this is the AI-content safety boundary. a scene
// that gets past this can only reference state + builtins, never run code.

const MAX_NODES = 500;

const unOp = z.enum(['-', '+', 'not']);
const binOp = z.enum(['+', '-', '*', '/', '%', '^', '==', '!=', '<', '<=', '>', '>=', 'and', 'or']);

const exprNode: z.ZodType<ExprIR> = z.lazy(() =>
  z.discriminatedUnion('k', [
    z.object({ k: z.literal('num'), v: z.number() }),
    z.object({ k: z.literal('bool'), v: z.boolean() }),
    z.object({ k: z.literal('str'), v: z.string() }),
    z.object({ k: z.literal('id'), name: z.string() }),
    z.object({ k: z.literal('un'), op: unOp, e: exprNode }),
    z.object({ k: z.literal('bin'), op: binOp, l: exprNode, r: exprNode }),
    z.object({ k: z.literal('call'), fn: z.enum(BUILTIN_NAMES), args: z.array(exprNode) }),
  ])
);

function countNodes(e: ExprIR): number {
  switch (e.k) {
    case 'un':
      return 1 + countNodes(e.e);
    case 'bin':
      return 1 + countNodes(e.l) + countNodes(e.r);
    case 'call':
      return 1 + e.args.reduce((n, a) => n + countNodes(a), 0);
    default:
      return 1;
  }
}

export const exprIRSchema: z.ZodType<ExprIR> = exprNode.superRefine((e, ctx) => {
  if (countNodes(e) > MAX_NODES) {
    ctx.addIssue({ code: 'custom', message: `expression too large (> ${MAX_NODES} nodes)` });
  }
});

export const numExprSchema = z.union([z.number(), exprIRSchema]);

export const textSchema = z.object({
  parts: z.array(z.union([z.string(), exprIRSchema])),
});
