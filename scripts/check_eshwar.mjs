import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const eshwar = await prisma.school.findUnique({
    where: { school_id: 'S-18101' },
    include: { visits: true }
  });
  console.log('Eshwar (#65):', eshwar);
}

main().catch(console.error).finally(() => prisma.$disconnect());
