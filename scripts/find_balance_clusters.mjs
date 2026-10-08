import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function findClusters() {
  const excludedSNos = [
    // Completed 22
    52, 57, 67, 86, 87, 97, 107, 114, 117, 124, 137, 144, 160, 164, 172, 177, 185, 192, 197, 204, 214, 234,
    // Monday 7
    75, 81, 88, 100, 118, 201, 221,
    // Tuesday 7
    55, 77, 101, 143, 207, 208, 209
  ];

  const availableSchools = await prisma.school.findMany({
    where: {
      s_no: { notIn: excludedSNos },
      visited_by_current_user: false,
    },
    orderBy: { s_no: 'asc' },
  });

  console.log(`Available unvisited schools for balance days: ${availableSchools.length}`);

  // Count by area
  const areaCounts = {};
  for (const s of availableSchools) {
    areaCounts[s.area] = (areaCounts[s.area] || 0) + 1;
  }

  const sortedAreas = Object.entries(areaCounts).sort((a, b) => b[1] - a[1]);
  console.log('\nTop clusters in remaining schools:');
  sortedAreas.slice(0, 15).forEach(([area, count]) => {
    console.log(`  - ${area}: ${count} schools`);
  });

  await prisma.$disconnect();
}

findClusters().catch(console.error);
