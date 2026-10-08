import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const summaries = await prisma.dailySummary.findMany({
    orderBy: { date: 'desc' },
    take: 10
  });
  console.log('Daily summaries:');
  summaries.forEach(s => {
    console.log(`${s.date}: visited=${s.schools_visited}, planned=${s.schools_planned}, remarks=${s.remarks}`);
  });
}

run().catch(console.error).finally(() => prisma.$disconnect());
