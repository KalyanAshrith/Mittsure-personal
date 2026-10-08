const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const schedules = {
  '2026-09-17': [223, 258, 205, 198, 471, 472, 72],
  '2026-09-18': [208, 101, 326, 209, 484, 201, 221],
  '2026-09-19': [372, 65, 332, 247, 241],
  '2026-09-21': [305, 255, 481, 104, 230, 320, 278],
  '2026-09-22': [74, 85, 395, 364, 428, 412, 331],
};

async function main() {
  const allSNos = Object.values(schedules).flat();
  console.log(`Total stop allocations: ${allSNos.length}`);
  const uniqueSNos = new Set(allSNos);
  console.log(`Unique stop allocations: ${uniqueSNos.size}`);
  if (allSNos.length !== uniqueSNos.size) {
    console.error('ERROR: Duplicate schools across days!');
  } else {
    console.log('SUCCESS: Zero duplicate schools across all days.');
  }

  const schools = await prisma.school.findMany({
    where: { s_no: { in: allSNos } }
  });

  const visitedAllocated = schools.filter(s => s.visited_by_current_user || s.visit_status === 'VISITED');
  if (visitedAllocated.length > 0) {
    console.error(`ERROR: ${visitedAllocated.length} visited schools found in allocations:`);
    visitedAllocated.forEach(s => console.log(`  S.No ${s.s_no} - ${s.school_name} (visited_by_current_user: ${s.visited_by_current_user}, visit_status: ${s.visit_status})`));
  } else {
    console.log('SUCCESS: All 33 allocated schools are 100% strictly unvisited!');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
