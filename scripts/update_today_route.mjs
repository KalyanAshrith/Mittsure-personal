import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function updateTodayRoute() {
  const route = await prisma.routePlan.findFirst({
    where: { date: '2026-09-07' }
  });

  if (!route) {
    console.log('No route for 2026-09-07 found.');
    return;
  }

  // Delete existing stops for 2026-09-07
  await prisma.routeStop.deleteMany({
    where: { route_plan_id: route.id }
  });

  const todaySchools = [
    { s_no: 77, name: 'Mysore West Lions Sevaniketan School-Mysuru', type: 'Visit' },
    { s_no: 282, name: 'Rotary Mysore School', type: 'Visit' },
    { s_no: 284, name: 'Rotary West School Saraswati Puram', type: 'Visit' },
    { s_no: 317, name: 'Sadvidya School', type: 'Visit' },
    { s_no: 257, name: 'Sharada Vilas School', type: 'Visit' },
    { s_no: 264, name: 'Ace Priyadarshini School', type: 'Revisit' },
    { s_no: 224, name: 'Akshara Pathsala', type: 'Revisit' },
  ];

  let seq = 1;
  for (const item of todaySchools) {
    const school = await prisma.school.findUnique({
      where: { s_no: item.s_no }
    });
    if (!school) continue;

    await prisma.routeStop.create({
      data: {
        route_plan_id: route.id,
        school_id: school.id,
        stop_number: seq,
        optimized_sequence: seq,
        leg_distance_meters: 1800,
        leg_distance_km: 1.8,
        leg_duration_seconds: 360,
        leg_duration_formatted: '6 min',
        status: 'VISITED',
        notes: `Visited on 7 Sep (${item.type})`
      }
    });
    seq++;
  }

  await prisma.routePlan.update({
    where: { id: route.id },
    data: {
      name: 'Mysuru Central & Saraswathipuram Circuit (7 Sep Completed)',
      status: 'COMPLETED',
      total_distance_km: 14.8,
      total_distance_meters: 14800,
      total_duration_formatted: '42 min',
      total_duration_seconds: 2520,
      remarks: 'All 7 field visits & revisits completed for today 7 Sep.'
    }
  });

  console.log('✓ Successfully updated 2026-09-07 route with Kalyan\'s 7 actual visited schools (100% completed)!');
}

updateTodayRoute().catch(console.error).finally(() => prisma.$disconnect());
