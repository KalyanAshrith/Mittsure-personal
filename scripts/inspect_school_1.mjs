import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const s = await prisma.school.findFirst({ where: { s_no: 1 } });
  console.log('School #1:', s);
}

check().finally(() => prisma.$disconnect());
