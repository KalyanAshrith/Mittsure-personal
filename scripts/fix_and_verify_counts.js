const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function fixAndVerify() {
  console.log('=== FIXING LISA 1ST STEP PRE SCHOOL STATUS ===');
  
  // Remove any visit for Lisa created today
  const del = await prisma.schoolVisit.deleteMany({
    where: {
      school: { school_id: 'S-156401' }
    }
  });
  console.log('Deleted visits for Lisa 1st Step:', del.count);

  // Set Lisa to NOT VISITED
  await prisma.school.update({
    where: { school_id: 'S-156401' },
    data: {
      visit_status: 'NOT VISITED',
      visited_by_current_user: false,
      last_visit_date: null
    }
  });

  // Ensure RouteStops for Lisa are PENDING
  const lisaStops = await prisma.routeStop.findMany({
    where: { school: { school_id: 'S-156401' } }
  });
  for (const st of lisaStops) {
    await prisma.routeStop.update({
      where: { id: st.id },
      data: { status: 'PENDING' }
    });
  }

  // Verify overall counts
  const totalMaster = await prisma.school.count();
  const visitedCount = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  const unvisitedCount = totalMaster - visitedCount;
  const completionRate = ((visitedCount / totalMaster) * 100).toFixed(1);

  console.log('\n=== CURRENT VERIFIED STATS ===');
  console.log('Total Master Schools:', totalMaster);
  console.log('Visited (Green):', visitedCount);
  console.log('Unvisited (Red):', unvisitedCount);
  console.log('Overall Completion Rate: ' + completionRate + '%');

  // Verify the 7 schools from user screenshot
  console.log('\n--- VERIFYING THE 7 SCHOOLS FROM SCREENSHOT ---');
  const targetCrmIds = [
    { id: 'S-74703', expected: 'VISITED (Green)' },
    { id: 'S-34598', expected: 'VISITED (Green)' },
    { id: 'S-156402', expected: 'VISITED (Green)' },
    { id: 'S-18108', expected: 'VISITED (Green)' },
    { id: 'S-156401', expected: 'NOT VISITED (Red)' },
    { id: 'S-80189', expected: 'VISITED (Green)' },
    { id: 'S-75329', expected: 'VISITED (Green)' },
  ];

  for (const item of targetCrmIds) {
    const sc = await prisma.school.findFirst({
      where: { school_id: item.id },
      include: {
        visits: {
          where: { is_current_representative: true }
        }
      }
    });
    const statusStr = sc.visited_by_current_user ? 'VISITED (Green)' : 'NOT VISITED (Red)';
    console.log(`S.No ${sc.s_no} | ${sc.school_id} | ${sc.school_name} -> Actual: ${statusStr} | Expected: ${item.expected} | Visits: ${sc.visits.length}`);
  }
}

fixAndVerify().catch(console.error).finally(() => prisma.$disconnect());
