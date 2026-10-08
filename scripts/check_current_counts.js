const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkCurrentCounts() {
  const visitedCount = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  const totalCount = await prisma.school.count();
  const visitsCount = await prisma.schoolVisit.count({
    where: { is_current_representative: true }
  });

  console.log(`Current DB State:`);
  console.log(`  Total Schools: ${totalCount}`);
  console.log(`  Personally Visited Schools: ${visitedCount}`);
  console.log(`  Remaining Schools: ${totalCount - visitedCount}`);
  console.log(`  Total SchoolVisit events by Kalyan: ${visitsCount}`);
}

checkCurrentCounts().catch(console.error).finally(() => prisma['$disconnect']());
