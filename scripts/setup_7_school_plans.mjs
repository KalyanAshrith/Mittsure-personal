import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const baseAddress = '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009';
const baseLat = 12.3021;
const baseLng = 76.6178;

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function setupSevenSchoolPlans() {
  console.log('=== Step 1: Preserving Monday 7 Sep and Tuesday 8 Sep Locked Plans ===');
  await prisma.routePlan.updateMany({
    where: { date: '2026-09-07' },
    data: { is_locked: true, status: 'PLANNED' },
  });
  await prisma.routePlan.updateMany({
    where: { date: '2026-09-08' },
    data: { is_locked: true, status: 'PLANNED' },
  });
  console.log('Monday and Tuesday locked plans preserved.');

  console.log('\n=== Step 2: Creating 7 Schools Daily Route Plans for Wed, Thu, Fri & Sat ===');

  const daysData = [
    {
      date: '2026-09-09',
      day_type: 'FULL_DAY',
      name: 'Kuvempunagar & Saraswathipuram Circuit (7 Schools Daily Target)',
      remarks: 'Wednesday 7-school outreach circuit across Kuvempunagar and Saraswathipuram. Covers top CBSE and State Board prospects starting and returning to Bogadi PG base.',
      sNos: [157, 329, 176, 254, 475, 113, 205],
    },
    {
      date: '2026-09-10',
      day_type: 'FULL_DAY',
      name: 'Ramakrishna Nagar & Srirampura South Circuit (7 Schools Daily Target)',
      remarks: 'Thursday 7-school corridor circuit across Ramakrishna Nagar and Srirampura. Optimized mix of pre-schools and primary schools with verified decision-maker contacts.',
      sNos: [244, 211, 467, 198, 471, 472, 473],
    },
    {
      date: '2026-09-11',
      day_type: 'FULL_DAY',
      name: 'Gokulam & Vijayanagar North Circuit (7 Schools Daily Target)',
      remarks: 'Friday 7-school north Mysuru circuit covering Gokulam early-learning centers and Vijayanagar secondary schools before the weekend.',
      sNos: [326, 209, 484, 221, 75, 118, 91],
    },
    {
      date: '2026-09-12',
      day_type: 'HALF_DAY',
      name: 'Bogadi Base & Immediate Perimeter Circuit (Saturday Half-Day • 6 Schools)',
      remarks: 'Saturday Half-Day circuit! Maximum recommended 6 schools right around Bogadi and Saraswathipuram. Compact loop finishing before 1:30 PM school closing.',
      sNos: [1, 65, 76, 72, 388, 332],
    },
  ];

  for (const day of daysData) {
    console.log(`\nProcessing ${day.date}: ${day.name}...`);

    // Remove old plan for this date
    const existing = await prisma.routePlan.findFirst({ where: { date: day.date } });
    if (existing) {
      await prisma.routeStop.deleteMany({ where: { route_plan_id: existing.id } });
      await prisma.routePlan.delete({ where: { id: existing.id } });
    }

    const schools = await prisma.school.findMany({
      where: { s_no: { in: day.sNos } },
    });

    // Order schools strictly according to sNos
    const orderedSchools = day.sNos
      .map((sNo) => schools.find((s) => s.s_no === sNo))
      .filter(Boolean);

    if (orderedSchools.length !== day.sNos.length) {
      throw new Error(`Missing schools for ${day.date}. Expected ${day.sNos.length}, found ${orderedSchools.length}`);
    }

    // Calculate legs and total distance
    let totalDistKm = 0;
    let totalDurMins = 0;
    const legs = [];

    let prevLat = baseLat;
    let prevLng = baseLng;
    let prevName = 'PG Base (Bogadi 2nd Stage)';

    for (let i = 0; i < orderedSchools.length; i++) {
      const sc = orderedSchools[i];
      // Haversine with 1.35x urban road factor for two-wheeler Mysuru streets
      const legDist = Math.max(0.4, Number((haversineKm(prevLat, prevLng, sc.latitude, sc.longitude) * 1.35).toFixed(2)));
      // Two-wheeler average speed ~22 km/h in city plus junction buffer
      const legDur = Math.max(3, Math.round((legDist / 22) * 60));

      legs.push({
        stop_number: i + 1,
        optimized_sequence: i,
        school_id: sc.id,
        leg_distance_km: legDist,
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_minutes: legDur,
        leg_duration_seconds: legDur * 60,
        leg_duration_formatted: `${legDur} mins`,
        status: 'PENDING',
      });

      totalDistKm += legDist;
      totalDurMins += legDur;
      prevLat = sc.latitude;
      prevLng = sc.longitude;
      prevName = sc.school_name;
    }

    // Final leg back to base
    const returnDist = Math.max(0.5, Number((haversineKm(prevLat, prevLng, baseLat, baseLng) * 1.35).toFixed(2)));
    const returnDur = Math.max(3, Math.round((returnDist / 22) * 60));
    totalDistKm = Number((totalDistKm + returnDist).toFixed(1));
    totalDurMins += returnDur;

    const durHours = Math.floor(totalDurMins / 60);
    const durRemMins = totalDurMins % 60;
    const durFormatted = durHours > 0 ? `${durHours} hr ${durRemMins} mins` : `${durRemMins} mins`;

    // Create plan
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
        total_distance_km: totalDistKm,
        total_distance_meters: Math.round(totalDistKm * 1000),
        total_duration_formatted: durFormatted,
        total_duration_seconds: totalDurMins * 60,
        optimized_order: JSON.stringify(orderedSchools.map((s) => s.id)),
        status: 'PLANNED',
        remarks: day.remarks,
        is_locked: false,
        day_type: day.day_type,
      },
    });

    // Create stops
    for (const leg of legs) {
      await prisma.routeStop.create({
        data: {
          route_plan_id: plan.id,
          school_id: leg.school_id,
          stop_number: leg.stop_number,
          optimized_sequence: leg.optimized_sequence,
          leg_distance_km: leg.leg_distance_km,
          leg_distance_meters: leg.leg_distance_meters,
          leg_duration_seconds: leg.leg_duration_seconds,
          leg_duration_formatted: leg.leg_duration_formatted,
          status: 'PENDING',
        },
      });
    }

    // Upsert DailySummary
    await prisma.dailySummary.upsert({
      where: { date: day.date },
      update: {
        schools_planned: orderedSchools.length,
        total_distance_km: totalDistKm,
        total_travel_time: durFormatted,
        remarks: day.remarks,
      },
      create: {
        date: day.date,
        schools_planned: orderedSchools.length,
        schools_visited: 0,
        revisits: 0,
        total_distance_km: totalDistKm,
        total_travel_time: durFormatted,
        remarks: day.remarks,
      },
    });

    console.log(`✓ ${day.date} created: ${orderedSchools.length} schools, ${totalDistKm} km total, ${durFormatted} riding time.`);
  }

  console.log('\n=== All 7-school daily plans successfully created and committed to database! ===');
  process.exit(0);
}

setupSevenSchoolPlans().catch((err) => {
  console.error('Setup failed:', err);
  process.exit(1);
});
