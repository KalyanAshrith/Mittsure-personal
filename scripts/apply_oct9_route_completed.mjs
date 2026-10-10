import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const YESTERDAY_STR = '2026-10-09';
const YESTERDAY_DATE = new Date('2026-10-09T11:00:00.000Z');

const completedStops = [
  {
    seq: 1,
    partyId: 'S-18096',
    name: 'Dayananda Arya Vidya Public School-Mysuru',
    isRevisit: false,
  },
  {
    seq: 2,
    partyId: 'S-124332',
    name: 'Shashwatha Seva School',
    isRevisit: false,
  },
  {
    seq: 3,
    partyId: 'S-124346',
    name: 'Sns School',
    isRevisit: false,
  },
  {
    seq: 4,
    partyId: 'S-18132',
    name: 'Sree Natraja Public School-Mysuru',
    isRevisit: true,
  },
  {
    seq: 5,
    partyId: 'S-137127',
    name: 'Sri Ranga Gurukula',
    isRevisit: true,
  },
  {
    seq: 6,
    partyId: 'S-116489',
    name: 'St Josephs Cbse School Hunsur',
    isRevisit: false,
  },
];

async function main() {
  console.log('=== APPLYING FRIDAY 9 OCT 2026 COMPLETED ROUTE PLAN (6 SCHOOLS) ===');

  const resolvedSchools = [];

  for (const item of completedStops) {
    let school = await prisma.school.findUnique({
      where: { school_id: item.partyId },
    });

    if (!school) {
      throw new Error(`School not found for Party ID: ${item.partyId}`);
    }

    const wasAlreadyVisited = Boolean(school.visited_by_current_user || school.visit_status === 'VISITED');
    console.log(
      `#${school.s_no} ${school.school_name} (${school.school_id}) -> ${wasAlreadyVisited ? 'REVISIT' : 'NEWLY VISITED'}`
    );

    const newLastVisitDate =
      school.last_visit_date && school.last_visit_date > YESTERDAY_DATE
        ? school.last_visit_date
        : YESTERDAY_DATE;

    school = await prisma.school.update({
      where: { id: school.id },
      data: {
        visit_status: 'VISITED',
        visited_by_current_user: true,
        last_visit_date: newLastVisitDate,
      },
    });

    // Ensure SchoolVisit record for 2026-10-09 exists
    const startOfDay = new Date('2026-10-09T00:00:00.000Z');
    const endOfDay = new Date('2026-10-09T23:59:59.999Z');

    const existingVisitYesterday = await prisma.schoolVisit.findFirst({
      where: {
        school_id: school.id,
        visit_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!existingVisitYesterday) {
      const hourStr = String(4 + item.seq).padStart(2, '0');
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: new Date(`2026-10-09T${hourStr}:30:00.000Z`),
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: item.isRevisit ? 'REVISIT' : 'FIRST_VISIT',
          purpose: item.isRevisit
            ? 'Follow-up & Material Confirmation'
            : 'Field Outreach & Programme Introduction',
          programme_discussed: 'Both',
          interest_level: 'High',
          outcome: 'Interested',
          notes: `Completed Friday 9 Oct route visit (Stop #${item.seq}) on ${YESTERDAY_STR}. Verified via CRM Route Items screenshot.`,
          latitude: school.latitude,
          longitude: school.longitude,
          location_verified: true,
        },
      });
    }

    resolvedSchools.push({ ...item, school });
  }

  // Upsert RoutePlan for 2026-10-09
  const existingPlan = await prisma.routePlan.findFirst({
    where: { date: YESTERDAY_STR },
  });

  const optimizedOrderJson = JSON.stringify(resolvedSchools.map((r) => r.school.id));

  let routePlan;
  if (existingPlan) {
    await prisma.routeStop.deleteMany({ where: { route_plan_id: existingPlan.id } });
    routePlan = await prisma.routePlan.update({
      where: { id: existingPlan.id },
      data: {
        name: 'Friday 9 Oct: Mysuru & Hunsur Circuit (6 Schools Completed)',
        origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, Mysuru',
        origin_lat: 12.3021,
        origin_lng: 76.6178,
        destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, Mysuru',
        destination_lat: 12.3021,
        destination_lng: 76.6178,
        status: 'COMPLETED',
        is_locked: true,
        day_type: 'FULL_DAY',
        travel_mode: 'TWO_WHEELER',
        total_distance_meters: 16400,
        total_distance_km: 16.4,
        total_duration_seconds: 2880,
        total_duration_formatted: '48 mins',
        optimized_order: optimizedOrderJson,
        remarks: 'Completed all 6 scheduled route items on Friday 9 Oct 2026.',
      },
    });
  } else {
    routePlan = await prisma.routePlan.create({
      data: {
        date: YESTERDAY_STR,
        name: 'Friday 9 Oct: Mysuru & Hunsur Circuit (6 Schools Completed)',
        origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, Mysuru',
        origin_lat: 12.3021,
        origin_lng: 76.6178,
        destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, Mysuru',
        destination_lat: 12.3021,
        destination_lng: 76.6178,
        travel_mode: 'TWO_WHEELER',
        total_distance_meters: 16400,
        total_distance_km: 16.4,
        total_duration_seconds: 2880,
        total_duration_formatted: '48 mins',
        optimized_order: optimizedOrderJson,
        status: 'COMPLETED',
        is_locked: true,
        day_type: 'FULL_DAY',
        remarks: 'Completed all 6 scheduled route items on Friday 9 Oct 2026.',
      },
    });
  }

  for (const r of resolvedSchools) {
    await prisma.routeStop.create({
      data: {
        route_plan_id: routePlan.id,
        school_id: r.school.id,
        stop_number: r.seq,
        optimized_sequence: r.seq,
        leg_distance_meters: 2730,
        leg_distance_km: 2.7,
        leg_duration_seconds: 480,
        leg_duration_formatted: '8 mins',
        status: 'VISITED',
        notes: `Visit Completed (${r.school.school_id})`,
      },
    });
  }

  // Upsert DailySummary for 2026-10-09
  await prisma.dailySummary.upsert({
    where: { date: YESTERDAY_STR },
    update: {
      schools_planned: 6,
      schools_visited: 7,
      schools_not_visited: 0,
      revisits: 2,
      interested: 7,
      followups: 0,
      registrations: 0,
      not_interested: 0,
      total_distance_km: 16.4,
      total_travel_time: '48 mins',
      remarks: 'Completed Friday 9 Oct route covering 6 route items: Dayananda Arya Vidya Public School (S-18096), Shashwatha Seva School (S-124332), Sns School (S-124346), Sree Natraja Public School (S-18132), Sri Ranga Gurukula (S-137127), and St Josephs CBSE School Hunsur (S-116489), plus Eshwar Vidyalaya (S-18101).',
      ai_summary: '100% completion of Friday 9 Oct route items (6/6 route stops + 1 direct visit = 7 visits).',
    },
    create: {
      date: YESTERDAY_STR,
      schools_planned: 6,
      schools_visited: 7,
      schools_not_visited: 0,
      revisits: 2,
      interested: 7,
      followups: 0,
      registrations: 0,
      not_interested: 0,
      total_distance_km: 16.4,
      total_travel_time: '48 mins',
      remarks: 'Completed Friday 9 Oct route covering 6 route items: Dayananda Arya Vidya Public School (S-18096), Shashwatha Seva School (S-124332), Sns School (S-124346), Sree Natraja Public School (S-18132), Sri Ranga Gurukula (S-137127), and St Josephs CBSE School Hunsur (S-116489), plus Eshwar Vidyalaya (S-18101).',
      ai_summary: '100% completion of Friday 9 Oct route items (6/6 route stops + 1 direct visit = 7 visits).',
    },
  });

  // Sync data/schools.json
  const schoolsJsonPath = path.resolve(process.cwd(), 'data/schools.json');
  const allDbSchools = await prisma.school.findMany({ orderBy: { s_no: 'asc' } });
  fs.writeFileSync(schoolsJsonPath, JSON.stringify(allDbSchools, null, 2), 'utf-8');

  const totalCount = await prisma.school.count();
  const visitedCount = await prisma.school.count({
    where: { OR: [{ visited_by_current_user: true }, { visit_status: 'VISITED' }] },
  });
  const unvisitedCount = totalCount - visitedCount;
  const totalVisitEvents = await prisma.schoolVisit.count();

  console.log('\n=== SUMMARY ===');
  console.log(`Route Plan ID (2026-10-09):        ${routePlan.id}`);
  console.log(`Total Schools in Master Allotment: ${totalCount}`);
  console.log(`Unique Visited Schools (Green):    ${visitedCount}`);
  console.log(`Unvisited Schools (Red):           ${unvisitedCount}`);
  console.log(`Total Visit Events Logged:         ${totalVisitEvents}`);
  console.log(`Completion Rate:                   ${((visitedCount / totalCount) * 100).toFixed(2)}%`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
