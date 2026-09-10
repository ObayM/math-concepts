export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;
  const { assertProductionEnv } = await import('@/lib/env');
  assertProductionEnv();
}
