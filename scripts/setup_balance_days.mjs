import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const baseAddress = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009';
const baseLat = 12.3021;
const baseLng = 76.6178;

async function setupBalanceDays() {
  console.log('--- Step 1: Locking Monday 7 Sep and Tuesday 8 Sep plans ---');
  await prisma.routePlan.updateMany({
    where: { date: '2026-09-07' },
    data: { is_locked: true, status: 'PLANNED' }
  });

  await prisma.routePlan.updateMany({
    where: { date: '2026-09-08' },
    data: { is_locked: true, status: 'PLANNED' }
  });
  console.log('Monday and Tuesday plans locked and preserved.');

  console.log('--- Step 2: Creating Balance Days (Wed 9 Sep to Sat 12 Sep) ---');

  const daysData = [
    {
      date: '2026-09-09',
      day_type: 'FULL_DAY',
      name: 'Kuvempunagar & Saraswathipuram Circuit (6 Schools)',
      remarks: 'Key institutional visits in Kuvempunagar and Saraswathipuram. Morning principal meetings for Junior Power Quest & MOM.',
      distanceKm: 18.6,
      durationFormatted: '54 mins',
      sNos: [157, 176, 205, 254, 284, 329],
    },
    {
      date: '2026-09-10',
      day_type: 'FULL_DAY',
      name: 'Ramakrishna Nagar & Srirampura South Circuit (6 Schools)',
      remarks: 'South Mysuru corridor outreach. Good mix of pre-schools and primary schools along Srirampura main road.',
      distanceKm: 19.2,
      durationFormatted: '56 mins',
      sNos: [244, 464, 211, 467, 198, 471],
    },
    {
      date: '2026-09-11',
      day_type: 'FULL_DAY',
      name: 'Gokulam & Vijayanagar North Circuit (6 Schools)',
      remarks: 'North-West corridor covering Gokulam pre-schools and Vijayanagar secondary schools before weekend.',
      distanceKm: 22.4,
      durationFormatted: '1 hr 4 mins',
      sNos: [484, 91, 215, 482, 173, 325],
    },
    {
      date: '2026-09-12',
      day_type: 'HALF_DAY',
      name: 'Bogadi Base & Nearby Circuit (Saturday Half-Day • 5 Schools)',
      remarks: 'Saturday Half-Day circuit! Strictly 5 nearby schools in Bogadi and Saraswathipuram. Finishes by 1:30 PM school closing.',
      distanceKm: 14.8,
      durationFormatted: '42 mins',
      sNos: [388, 475, 476, 1, 76],
    },
  ];

  for (const day of daysData) {
    // Delete existing plan if any
    const existing = await prisma.routePlan.findFirst({ where: { date: day.date } });
    if (existing) {
      await prisma.routeStop.deleteMany({ where: { route_plan_id: existing.id } });
      await prisma.routePlan.delete({ where: { id: existing.id } });
    }

    const schools = await prisma.school.findMany({
      where: { s_no: { in: day.sNos } },
    });

    // Sort schools in the specific order of sNos
    const orderedSchools = day.sNos
      .map(sNo => schools.find(s => s.s_no === sNo))
      .filter(Boolean);

    const plan = await prisma.routePlan.create({
      data: {
        date: day.date,
        name: day.name,
        origin: baseAddress,
        origin_lat: baseLat,
        origin_lng: baseLng,
        destination: baseAddress,
        destination_lat: baseLat,
        destination_lng: baseLng,
        travel_mode: 'TWO_WHEELER',
        total_distance_km: day.distanceKm,
        total_distance_meters: Math.round(day.distanceKm * 1000),
        total_duration_formatted: day.durationFormatted,
        total_duration_seconds: Math.round(day.distanceKm * 180),
        optimized_order: JSON.stringify(orderedSchools.map(s => s.id)),
        status: 'PLANNED',
        remarks: day.remarks,
        is_locked: false,
        day_type: day.day_type,
      }
    });

    for (let i = 0; i < orderedSchools.length; i++) {
      const sc = orderedSchools[i];
      await prisma.routeStop.create({
        data: {
          route_plan_id: plan.id,
          school_id: sc.id,
          stop_number: i + 1,
          optimized_sequence: i + 1,
          leg_distance_km: 2.5,
          leg_distance_meters: 2500,
          leg_duration_formatted: '7 mins',
          leg_duration_seconds: 420,
          status: 'PENDING',
        }
      });
    }

    console.log(`Created plan for ${day.date} (${day.day_type}): ${day.name} with ${orderedSchools.length} stops.`);
  }

  console.log('\n--- Final Verification of Plans in Database ---');
  const allPlans = await prisma.routePlan.findMany({
    include: { stops: { include: { school: true } } },
    orderBy: { date: 'asc' }
  });

  for (const p of allPlans) {
    console.log(`Date: ${p.date} | ${p.day_type} | Locked: ${p.is_locked} | Stops: ${p.stops.length} | Name: ${p.name}`);
  }

  await prisma.$disconnect();
}

setupBalanceDays().catch(console.error);
