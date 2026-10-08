import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function showAreas() {
  const areas = await prisma.school.groupBy({
    by: ['area'],
    where: { visited_by_current_user: false },
    _count: { id: true },
    orderBy: { _count: { id: 'desc' } },
  });

  console.log('Unvisited schools by area (top 30):');
  areas.slice(0, 30).forEach(a => console.log(`  ${a.area}: ${a._count.id}`));

  await prisma.$disconnect();
}

showAreas().catch(console.error);
