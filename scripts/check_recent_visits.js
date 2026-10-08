const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkRecentVisits() {
  const visits = await prisma.schoolVisit.findMany({
    where: {
      visit_date: {
        gte: new Date('2026-09-18T00:00:00.000Z')
      }
    },
    include: { school: true },
    orderBy: { created_at: 'asc' }
  });

  console.log('Today (2026-09-18) visits count:', visits.length);
  visits.forEach(v => {
    console.log(v.id + ' | S.No ' + v.school.s_no + ' | ' + v.school.school_id + ' | ' + v.school.school_name + ' | Outcome: ' + v.outcome + ' | CreatedAt: ' + v.created_at);
  });
}

checkRecentVisits().catch(console.error).finally(() => prisma.$disconnect());
