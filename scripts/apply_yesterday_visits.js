const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const BASE_LAT = 12.3021;
const BASE_LNG = 76.6178;

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

async function main() {
  console.log('=== STEP 1: RESOLVE 6 YESTERDAY VISITED SCHOOLS ===');
  const targetCodes = [
    { code: 'S-18103', name: 'Hari Vidyalaya-Mysuru', s_no: 67 },
    { code: 'S-134650', name: 'Vijaya Vittala Vidya Shale', s_no: 388 },
    { code: 'S-21202', name: 'Capitol Public School-830890', s_no: 157 },
    { code: 'S-74992', name: 'Mahaveer School Srirampura', s_no: 214 },
    { code: 'S-156336', name: 'Aaryan Kids Srirampura', s_no: 467 },
    { code: 'S-18092', name: 'Chaitra Public School-Mysuru', s_no: 56 },
  ];

  const resolvedSchools = [];
  for (const item of targetCodes) {
    const s = await prisma.school.findFirst({
      where: { school_id: item.code },
      include: { visits: true }
    });
    if (!s) {
      throw new Error(`School not found: ${item.code} - ${item.name}`);
    }
    resolvedSchools.push(s);
    console.log(`Resolved #${s.s_no} - ${s.school_name} (${s.board}, ${s.area})`);
  }

  const visitDate = new Date('2026-09-09T16:30:00+05:30');

  console.log('\n=== STEP 2: CREATE VISITS & UPDATE SCHOOL STATUS ===');
  for (const school of resolvedSchools) {
    // Check if visit already exists for 2026-09-09
    const existingVisit = await prisma.schoolVisit.findFirst({
      where: {
        school_id: school.id,
        visit_date: {
          gte: new Date('2026-09-09T00:00:00.000Z'),
          lte: new Date('2026-09-09T23:59:59.999Z'),
        }
      }
    });

    if (!existingVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: 'Both',
          contact_person: school.contact_person || 'Principal / Head',
          contact_number: school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested',
          notes: 'Visited on 2026-09-09 field outreach. Shared curriculum overview.',
        }
      });
      console.log(`Created visit record for #${school.s_no} ${school.school_name}`);
    } else {
      console.log(`Visit already exists for #${school.s_no} ${school.school_name}`);
    }

    // Update School status to VISITED and visit_status to INTERESTED
    await prisma.school.update({
      where: { id: school.id },
      data: {
        status: 'VISITED',
        visit_status: 'INTERESTED',
        visited_by_current_user: true,
        last_visit_date: visitDate,
      }
    });
  }

  console.log('\n=== STEP 3: UPDATE YESTERDAY (2026-09-09) ROUTE PLAN ===');
  let plan09 = await prisma.routePlan.findFirst({
    where: { date: '2026-09-09' },
    include: { stops: true }
  });

  if (plan09) {
    // Delete old stops
    await prisma.routeStop.deleteMany({
      where: { route_plan_id: plan09.id }
    });
  } else {
    plan09 = await prisma.routePlan.create({
      data: {
        date: '2026-09-09',
        name: 'Wednesday 9 Sep: Kuvempunagar, Saraswathipuram & Srirampura (Completed Plan)',
        origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        origin_lat: BASE_LAT,
        origin_lng: BASE_LNG,
        destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        destination_lat: BASE_LAT,
        destination_lng: BASE_LNG,
        travel_mode: 'TWO_WHEELER',
        day_type: 'FULL_DAY',
        status: 'COMPLETED',
        optimized_order: '[]',
      }
    });
  }

  // Add 6 visited stops in sequence
  let prevLat = BASE_LAT;
  let prevLng = BASE_LNG;
  let totalDistKm = 0;
  let totalSec = 0;
  const orderedSNos = [];

  for (let i = 0; i < resolvedSchools.length; i++) {
    const s = resolvedSchools[i];
    const legDist = haversineKm(prevLat, prevLng, s.latitude, s.longitude);
    const legSec = Math.round(legDist * 144);
    totalDistKm += legDist;
    totalSec += legSec;
    orderedSNos.push(s.s_no);

    await prisma.routeStop.create({
      data: {
        route_plan_id: plan09.id,
        school_id: s.id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        status: 'VISITED',
        leg_distance_km: Math.round(legDist * 10) / 10,
        leg_distance_meters: Math.round(legDist * 1000),
        leg_duration_seconds: legSec,
        leg_duration_formatted: `${Math.max(1, Math.ceil(legSec / 60))} min`,
        notes: 'Visited. Outcome: Interested',
      }
    });

    prevLat = s.latitude;
    prevLng = s.longitude;
  }

  // Return to base
  const returnDist = haversineKm(prevLat, prevLng, BASE_LAT, BASE_LNG);
  const returnSec = Math.round(returnDist * 144);
  totalDistKm += returnDist;
  totalSec += returnSec;

  const totalMin = Math.round(totalSec / 60);

  await prisma.routePlan.update({
    where: { id: plan09.id },
    data: {
      name: 'Wednesday 9 Sep: Kuvempunagar, Saraswathipuram & Srirampura (Completed Plan)',
      status: 'COMPLETED',
      is_locked: true,
      total_distance_km: Math.round(totalDistKm * 10) / 10,
      total_distance_meters: Math.round(totalDistKm * 1000),
      total_duration_seconds: totalSec,
      total_duration_formatted: `${totalMin} mins`,
      optimized_order: JSON.stringify(orderedSNos),
    }
  });

  console.log(`Updated 2026-09-09 route plan: ${totalDistKm.toFixed(1)} km, ${totalMin} mins, 6 stops marked VISITED`);

  // Update DailySummary for 2026-09-09
  await prisma.dailySummary.upsert({
    where: { date: '2026-09-09' },
    update: {
      schools_visited: 6,
      interested: 6,
      remarks: 'Completed 6 schools across Saraswathipuram & Srirampura. All met with positive interest.',
    },
    create: {
      date: '2026-09-09',
      schools_visited: 6,
      interested: 6,
      remarks: 'Completed 6 schools across Saraswathipuram & Srirampura. All met with positive interest.',
    }
  });

  console.log('\n=== STEP 4: INSPECT & CLEAN UP TODAY (2026-09-10) PLAN ===');
  const plan10 = await prisma.routePlan.findFirst({
    where: { date: '2026-09-10' },
    include: { stops: { include: { school: true } } }
  });

  if (plan10) {
    const visitedSchoolIds = new Set(resolvedSchools.map(s => s.id));
    const conflicts = plan10.stops.filter(st => visitedSchoolIds.has(st.school_id));
    console.log(`Today's plan has ${conflicts.length} schools that were visited yesterday:`);
    conflicts.forEach(c => console.log(`  - Stop #${c.optimized_sequence}: #${c.school.s_no} ${c.school.school_name}`));

    if (conflicts.length > 0) {
      // Find candidate replacement schools in Srirampura / Ramakrishna Nagar / Kuvempunagar
      const candidateSchools = await prisma.school.findMany({
        where: {
          id: { notIn: Array.from(visitedSchoolIds).concat(plan10.stops.map(st => st.school_id)) },
          status: { not: 'VISITED' },
          visited_by_current_user: false,
          area: { in: ['Srirampura', 'Ramakrishna Nagar', 'Kuvempunagar', 'Bogadi'] }
        },
        take: 10
      });

      console.log(`Available replacement candidates in nearby areas: ${candidateSchools.length}`);
      candidateSchools.slice(0, 5).forEach(c => console.log(`  Candidate: #${c.s_no} ${c.school_name} (${c.board}, ${c.area})`));
    }
  }

  console.log('\n=== STEP 5: TOTAL STATS CHECK ===');
  const totalVisited = await prisma.school.count({ where: { status: 'VISITED' } });
  const totalPersonalVisits = await prisma.schoolVisit.count({ where: { is_current_representative: true } });
  console.log(`Total schools with status VISITED: ${totalVisited}`);
  console.log(`Total visits by Kalyan: ${totalPersonalVisits}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
