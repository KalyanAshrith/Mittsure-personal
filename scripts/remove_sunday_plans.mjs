import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function removeSundayPlans() {
  const plans = await prisma.routePlan.findMany({
    include: { stops: true },
  });

  console.log(`Auditing ${plans.length} total route plans for Sunday dates...`);
  const sundayPlanIds = [];

  for (const p of plans) {
    const [year, month, day] = p.date.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day);
    const dayOfWeek = dateObj.getDay();

    if (dayOfWeek === 0) {
      console.log(`Detected Sunday plan: ID=${p.id}, Date=${p.date}, Name="${p.name}", Stops=${p.stops.length}`);
      sundayPlanIds.push(p.id);
    }
  }

  if (sundayPlanIds.length > 0) {
    const deletedStops = await prisma.routeStop.deleteMany({
      where: { route_plan_id: { in: sundayPlanIds } },
    });
    const deletedPlans = await prisma.routePlan.deleteMany({
      where: { id: { in: sundayPlanIds } },
    });
    console.log(`Successfully purged ${deletedStops.count} route stops and ${deletedPlans.count} Sunday route plans.`);
  } else {
    console.log('No Sunday route plans found in database.');
  }

  const remaining = await prisma.routePlan.findMany({
    select: { id: true, date: true, name: true },
    orderBy: { date: 'asc' },
  });
  console.log('Current remaining route plans:');
  for (const r of remaining) {
    const [y, m, d] = r.date.split('-').map(Number);
    const dObj = new Date(y, m - 1, d);
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    console.log(` - ${r.date} (${dayNames[dObj.getDay()]}): ${r.name}`);
  }

  await prisma.$disconnect();
}

removeSundayPlans().catch(async (e) => {
  console.error('Error removing Sunday plans:', e);
  await prisma.$disconnect();
  process.exit(1);
});
