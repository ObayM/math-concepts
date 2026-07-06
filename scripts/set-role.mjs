import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const VALID_ROLES = ['student', 'admin', 'super_admin'];

async function main() {
  const email = process.env.EMAIL;
  const role = process.env.ROLE;

  if (!email || !role) {
    console.error('usage: make promote EMAIL=someone@example.com ROLE=super_admin');
    process.exit(1);
  }
  if (!VALID_ROLES.includes(role)) {
    console.error(`role must be one of: ${VALID_ROLES.join(', ')}`);
    process.exit(1);
  }

  const user = await prisma.user.update({ where: { email }, data: { role } });
  console.log(`${user.email} is now ${user.role}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
