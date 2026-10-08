const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const visits15 = await prisma.schoolVisit.findMany({
    where: {
      visit_date: {
        gte: new Date('2026-09-15T00:00:00.000Z'),
        lte: new Date('2026-09-15T23:59:59.999Z')
      }
    }
  });
  console.log(`Visits on 2026-09-15: ${visits15.length}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
