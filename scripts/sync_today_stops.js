const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function syncAll() {
  console.log('=== SYNCING 2026-09-17 ROUTE PLAN STOPS ===');
  
  const visitedSchoolIds = ['S-74703', 'S-34598', 'S-156402', 'S-18108', 'S-80189', 'S-75329'];
  const fullIds = visitedSchoolIds.concat(visitedSchoolIds.map(id => 'School-' + id));

  // Find 2026-09-17 plan
  const plan17 = await prisma.routePlan.findFirst({
    where: { date: '2026-09-17' },
    include: { stops: { include: { school: true } } }
  });

  if (plan17) {
    for (const stop of plan17.stops) {
      if (fullIds.includes(stop.school.school_id)) {
        await prisma.routeStop.update({
          where: { id: stop.id },
          data: { status: 'VISITED' }
        });
        console.log('2026-09-17 Stop #' + stop.optimized_sequence + ' S.No ' + stop.school.s_no + ' (' + stop.school.school_name + ') -> VISITED');
      } else {
        console.log('2026-09-17 Stop #' + stop.optimized_sequence + ' S.No ' + stop.school.s_no + ' (' + stop.school.school_name + ') -> ' + stop.status);
      }
    }
    await prisma.routePlan.update({
      where: { id: plan17.id },
      data: { status: 'COMPLETED' }
    });
  }

  // Check visited schools count
  const visitedCount = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  console.log('\nCurrent Kalyan Visited Count:', visitedCount);

  // List the 7 schools from user screenshot
  console.log('\n--- STATUS OF THE 7 SCHOOLS FROM USER SCREENSHOT ---');
  const targetIds = ['S-74703', 'S-34598', 'S-156402', 'S-18108', 'S-156401', 'S-80189', 'S-75329'];
  for (const cid of targetIds) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [{ school_id: cid }, { school_id: 'School-' + cid }]
      },
      include: {
        visits: {
          where: { is_current_representative: true },
          orderBy: { visit_date: 'desc' },
          take: 1
        }
      }
    });
    if (s) {
      const v = s.visits[0];
      const color = s.visited_by_current_user ? 'GREEN' : 'RED';
      console.log('S.No ' + s.s_no + ' | ' + s.school_id + ' | ' + s.school_name + ' | ' + color + ' (' + s.visit_status + ') | VisitedByUser: ' + s.visited_by_current_user + (v ? ' | VisitDate: ' + v.visit_date.toISOString().slice(0, 10) + ' Outcome: ' + v.outcome : ' | No visit'));
    }
  }
}

syncAll().catch(console.error).finally(() => prisma.$disconnect());
