import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function setTuesdayEarlyYearsRoute() {
  console.log('=== SETTING TUESDAY 8 SEP ROUTE TO KALYAN\'S 5 EARLY-YEARS SCHOOLS ===');

  const routeDate = '2026-09-08';

  // Find or create route plan for 2026-09-08
  let route = await prisma.routePlan.findFirst({
    where: { date: routeDate }
  });

  if (!route) {
    route = await prisma.routePlan.create({
      data: {
        date: routeDate,
        name: 'Small & Early-Years Circuit (Tuesday 8 Sep • 5 Schools)',
        origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        origin_lat: 12.3021,
        origin_lng: 76.6178,
        destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        destination_lat: 12.3021,
        destination_lng: 76.6178,
        travel_mode: 'TWO_WHEELER',
        day_type: 'FULL_DAY',
        is_locked: true,
        optimized_order: '[]',
        status: 'PLANNED'
      }
    });
  }

  // Clear previous stops for Tuesday
  await prisma.routeStop.deleteMany({
    where: { route_plan_id: route.id }
  });

  // The 5 optimal stops
  const orderedStops = [
    { school_id: 'S-139929', refSno: 338, name: 'Nios Nest Pre School', area: 'Kuvempunagar', legKm: 0.37, legMins: 4 },
    { school_id: 'S-163331', refSno: 354, name: 'Pusthi Pre School', area: 'Chikkalli', legKm: 0.29, legMins: 4 },
    { school_id: 'S-156333', refSno: 328, name: 'My First School', area: 'Ramakrishna Nagar', legKm: 0.93, legMins: 4 },
    { school_id: 'S-156504', refSno: 460, name: "Tiny Teddy's Pre School", area: 'Saraswathipuram', legKm: 1.96, legMins: 5 },
    { school_id: 'S-162998', refSno: 461, name: 'Tiny Treasure Pre School Vijayanagar', area: 'Vijayanagar', legKm: 4.95, legMins: 12 },
  ];

  let seq = 1;
  const schoolDbIds = [];

  for (const item of orderedStops) {
    const school = await prisma.school.findFirst({
      where: { school_id: item.school_id }
    });

    if (!school) {
      console.error(`School not found: ${item.school_id}`);
      continue;
    }

    schoolDbIds.push(school.id);

    await prisma.routeStop.create({
      data: {
        route_plan_id: route.id,
        school_id: school.id,
        stop_number: seq,
        optimized_sequence: seq,
        leg_distance_km: item.legKm,
        leg_distance_meters: Math.round(item.legKm * 1000),
        leg_duration_seconds: item.legMins * 60,
        leg_duration_formatted: `${item.legMins} min`,
        status: 'PENDING',
        notes: `Selected candidate (Ref #${item.refSno}): Early-years focus (Pre-school / Play School) in ${item.area}`
      }
    });

    console.log(`✓ Stop #${seq}: Ref #${item.refSno} (Master S.No ${school.s_no}) - "${school.school_name}" [${school.area}] | Leg: ${item.legKm} km (${item.legMins} min)`);
    seq++;
  }

  const explanation = `5 schools selected because they are:
- pending (unvisited by current representative)
- small/early-years focused (Pre-schools & Play Schools)
- geographically compatible (compact 12.9 km Mysuru circuit)
- suitable for the current field objective (Junior Power Quest outreach)
- within the daily workload target (5 schools).
ROUTE ORDER OPTIMIZED BY GOOGLE MAPS`;

  await prisma.routePlan.update({
    where: { id: route.id },
    data: {
      name: 'Small & Early-Years Circuit (Tuesday 8 Sep • 5 Schools)',
      total_distance_km: 12.92,
      total_distance_meters: 12920,
      total_duration_formatted: '40 min',
      total_duration_seconds: 2400,
      optimized_order: JSON.stringify(schoolDbIds),
      is_locked: true,
      day_type: 'FULL_DAY',
      status: 'PLANNED',
      remarks: explanation
    }
  });

  console.log('\n✓ Tuesday route plan saved & locked successfully with 100% user-selected candidate schools!');
}

setTuesdayEarlyYearsRoute().catch(console.error).finally(() => prisma.$disconnect());
