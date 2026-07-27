import { afterAll, beforeEach } from 'vitest';
import { prisma } from '@/lib/prisma';

// this file TRUNCATEs everything it can see, so it must never be pointed at the
// developer's public schema.
const url = process.env.DATABASE_URL ?? '';
if (!/[?&]schema=mathly_test/.test(url)) {
  throw new Error(
    `refusing to run db tests against "${url || '<unset>'}". ` +
      'They must target ?schema=mathly_test — run `npm run test:db:setup` first.'
  );
}

let tables: string[] = [];

beforeEach(async () => {
  if (tables.length === 0) {
    const rows: { tablename: string }[] = await prisma.$queryRaw`
      SELECT tablename FROM pg_tables
      WHERE schemaname = current_schema() AND tablename <> '_prisma_migrations'
    `;
    tables = rows.map((r) => `"${r.tablename}"`);
    if (tables.length === 0) {
      throw new Error('test schema has no tables — run `npm run test:db:setup`');
    }
  }
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE ${tables.join(', ')} RESTART IDENTITY CASCADE`);
});

afterAll(async () => {
  await prisma.$disconnect();
});
