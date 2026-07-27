import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

const src = fileURLToPath(new URL('./src', import.meta.url));

// a schema alongside the dev `public` one, so `npm test` can never truncate a
// developer's real data. created by `npm run test:db:setup`.
const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgresql://mathly:mathly@localhost:5432/mathly?schema=mathly_test';

export default defineConfig({
  resolve: { alias: { '@': src } },
  test: {
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'html'],
      include: ['src/lib/**', 'src/app/api/**', 'src/components/lesson/**', 'src/proxy.js'],
      exclude: ['src/lib/ai.ts', 'src/lib/auth-client.js', 'src/app/api/auth/**', '**/*.d.ts'],
    },
    projects: [
      {
        // the existing suite. a single * does not cross /, so nothing moves.
        extends: true,
        test: { name: 'engine', environment: 'node', include: ['tests/*.test.{ts,tsx}'] },
      },
      {
        extends: true,
        test: {
          name: 'dom',
          environment: 'jsdom',
          include: ['tests/components/**/*.test.{ts,tsx}'],
          setupFiles: ['./tests/setup/dom.ts'],
        },
      },
      {
        extends: true,
        test: { name: 'server', environment: 'node', include: ['tests/server/**/*.test.ts'] },
      },
      {
        // one shared schema, so these files must not interleave
        extends: true,
        test: {
          name: 'db',
          environment: 'node',
          include: ['tests/db/**/*.test.ts'],
          setupFiles: ['./tests/setup/db.ts'],
          env: { DATABASE_URL: TEST_DATABASE_URL },
          fileParallelism: false,
          testTimeout: 20_000,
          hookTimeout: 30_000,
        },
      },
    ],
  },
});
