import { PrismaClient } from '@prisma/client';

// e2e users are created straight through better-auth's own API against the
// running server, so the cookie path under test is the real one.
export const STUDENT = {
  email: 'e2e-student@mathly.local',
  password: 'e2e-password-123',
  name: 'E2E Student',
};

export default async function globalSetup() {
  const prisma = new PrismaClient();
  await prisma.user.deleteMany({ where: { email: { startsWith: 'e2e-' } } });
  await prisma.$disconnect();
}
