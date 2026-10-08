const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkAllVisited() {
  const visited = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    select: { s_no: true, school_id: true, school_name: true, area: true, last_visit_date: true },
    orderBy: { s_no: 'asc' }
  });
  console.log('Total visited schools:', visited.length);
  visited.forEach((s, idx) => {
    console.log(`${idx + 1}. S.No ${s.s_no} [${s.school_id}] - ${s.school_name} (${s.area}) - LastVisit: ${s.last_visit_date ? s.last_visit_date.toISOString().slice(0, 10) : 'none'}`);
  });
}

checkAllVisited().catch(console.error).finally(() => prisma.$disconnect());
