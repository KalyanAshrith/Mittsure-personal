import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const byDist = await prisma.school.groupBy({
    by: ['district'],
    _count: { id: true }
  });
  console.log('Districts Summary:');
  for (const d of byDist) {
    const visited = await prisma.school.count({
      where: { district: d.district, visited_by_current_user: true }
    });
    console.log(`  ${d.district.padEnd(16)}: Total=${d._count.id}, Visited=${visited}, Unvisited=${d._count.id - visited}`);
  }
}

run().finally(() => prisma.$disconnect());
