import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function lockToday() {
  const updated = await prisma.routePlan.updateMany({
    where: { date: '2026-09-09' },
    data: {
      is_locked: true,
      status: 'PLANNED',
    },
  });
  console.log(`Locked today's plan (2026-09-09): ${updated.count} record(s) locked.`);
}

lockToday().catch(console.error).finally(() => prisma.$disconnect());
