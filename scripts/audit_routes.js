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

  console.log(`Found ${plans.length} route plans.`);
  for (const plan of plans) {
    const visitedStops = plan.stops.filter(s => s.school && s.school.visited_by_current_user);
    console.log(`\nDate: ${plan.date} | Total Stops: ${plan.stops.length} | Visited Stops: ${visitedStops.length}`);
    for (const stop of plan.stops) {
      const v = stop.school && stop.school.visited_by_current_user ? '⚠️ VISITED' : '✅ Unvisited';
      console.log(`  Stop ${stop.stop_number}: S.No ${stop.school?.s_no} - ${stop.school?.name} [${stop.school?.board}] (${v}) - Status: ${stop.status}`);
    }
  }

  // Also check total visited schools count
  const visitedCount = await prisma.school.count({ where: { visited_by_current_user: true } });
  const unvisitedCount = await prisma.school.count({ where: { visited_by_current_user: false } });
  console.log(`\nOverall School Stats: Total Visited=${visitedCount}, Total Unvisited=${unvisitedCount}`);
}

main()
  .catch(e => console.error(e))
  .finally(() => prisma.$disconnect());
