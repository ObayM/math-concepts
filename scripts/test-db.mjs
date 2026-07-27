import { spawnSync } from 'node:child_process';

const BASE = process.env.DATABASE_URL ?? 'postgresql://mathly:mathly@localhost:5432/mathly';
const SCHEMA = process.env.TEST_DB_SCHEMA ?? 'mathly_test';

if (/[?&]schema=/.test(BASE)) {
  console.error(`DATABASE_URL already pins a schema (${BASE}); set TEST_DATABASE_URL instead.`);
  process.exit(1);
}

const testUrl = `${BASE}${BASE.includes('?') ? '&' : '?'}schema=${SCHEMA}`;

const create = spawnSync('npx', ['prisma', 'db', 'execute', '--url', BASE, '--stdin'], {
  input: `CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`,
  stdio: ['pipe', 'inherit', 'inherit'],
});
if (create.status !== 0) process.exit(create.status ?? 1);

const migrate = spawnSync('npx', ['prisma', 'migrate', 'deploy'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: testUrl },
});
if (migrate.status !== 0) process.exit(migrate.status ?? 1);

console.log(`\ntest schema ready: ${testUrl}`);
