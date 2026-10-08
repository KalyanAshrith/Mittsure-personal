const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function inspect() {
  console.log('--- ROUTE PLANS ---');
  const plans = await prisma.routePlan.findMany({
    orderBy: { date: 'asc' },
    include: { stops: { include: { school: true } } }
  });

  plans.forEach(p => {
    console.log(p.date + ' | ID: ' + p.id + ' | Status: ' + p.status + ' | Name: ' + p.name + ' | Stops: ' + p.stops.length);
    p.stops.forEach(s => {
      console.log('   #' + s.optimized_sequence + ' S.No ' + s.school.s_no + ' (' + s.school.school_id + ') ' + s.school.school_name + ' [' + s.status + ']');
    });
  });

  console.log('\n--- DAILY SUMMARIES ---');
  const summaries = await prisma.dailySummary.findMany({
    orderBy: { date: 'asc' }
  });
  summaries.forEach(s => {
    console.log(s.date + ' | Visited: ' + s.schools_visited + ' | Remarks: ' + s.remarks);
  });
}

inspect().catch(console.error).finally(() => prisma.$disconnect());
