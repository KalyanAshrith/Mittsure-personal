const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const codes = ['S-156336', 'S-21202', 'S-18092', 'S-18103', 'S-74992', 'S-134650'];
  for (const c of codes) {
    const s = await prisma.school.findFirst({
      where: { school_id: c },
      include: { visits: true }
    });
    if (s) {
      console.log(s.s_no, '|', s.school_name, '|', s.school_id, '|', s.board, '|', s.category, '|', s.area, '| visits:', s.visits.length, '| status:', s.status);
    } else {
      console.log('MISSING:', c);
    }
  }

  console.log('\n--- ALL VISITS LOGGED IN SYSTEM ---');
  const allVisits = await prisma.visit.findMany({
    orderBy: { visit_date: 'desc' },
    include: { school: true }
  });
  console.log('Total visits in DB:', allVisits.length);
  const byDate = {};
  allVisits.forEach(v => {
    byDate[v.visit_date] = (byDate[v.visit_date] || 0) + 1;
  });
  console.log('Visits by date:', byDate);

  const completedSchools = await prisma.school.count({
    where: { status: 'VISITED' }
  });
  console.log('Schools with status VISITED:', completedSchools);
}

check().catch(console.error).finally(() => prisma.$disconnect());
