const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const plans = await prisma.routePlan.findMany({
    include: {
      stops: {
        include: {
          school: true
        },
        orderBy: {
          stop_number: 'asc'
        }
      }
    },
    orderBy: {
      date: 'asc'
    }
  });

  for (const p of plans) {
    console.log(`\n========================================`);
    console.log(`Plan ID: ${p.id} | Date: ${p.date} | Name: ${p.plan_name}`);
    console.log(`Remarks: ${p.remarks}`);
    console.log(`Total stops: ${p.stops.length}`);
    p.stops.forEach(s => {
      const v = s.school?.visited_by_current_user ? '⚠️ VISITED' : '✅ Unvisited';
      console.log(`  Stop ${s.stop_number}: S.No ${s.school?.s_no} - ${s.school?.school_name} (${s.school?.board}, ${s.school?.area}) [${v}] - StopStatus: ${s.status}`);
    });
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
