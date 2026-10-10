import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const TODAY_STR = '2026-10-10';
const TODAY_DATE = new Date('2026-10-10T10:30:00.000Z');

const completedStops = [
  {
    seq: 1,
    partyId: 'S-17803',
    name: 'M.C.S Public School-Chamarajanagara',
    opportunity: 'B+',
    board: 'CBSE',
    type: 'PRIMARY',
    lat: 11.92554,
    lng: 76.94018,
  },
  {
    seq: 2,
    partyId: 'S-141383',
    name: 'Seva Bharathi Nursery School Chamarjanagara',
    opportunity: 'A',
    board: 'STATE BOARD',
    type: 'PRE-SCHOOL',
    lat: 11.9238,
    lng: 76.9395,
  },
  {
    seq: 3,
    partyId: 'S-140157',
    name: 'St Joseph School Chamarajanagara',
    opportunity: 'B',
    board: 'STATE BOARD',
    type: 'PRIMARY',
    lat: 11.9261,
    lng: 76.9425,
  },
  {
    seq: 4,
    partyId: 'S-18484',
    name: 'St. Francis Icse School-Chamarajanagara',
    opportunity: 'C',
    board: 'ICSE',
    type: 'PRIMARY',
    lat: 11.9282,
    lng: 76.9384,
  },
  {
    seq: 5,
    partyId: 'S-174787',
    name: 'Universe English school Chamarajanagara',
    opportunity: 'B+',
    board: 'STATE BOARD',
    type: 'PRIMARY',
    lat: 11.9268,
    lng: 76.9412,
  },
];

async function main() {
  console.log('=== APPLYING SATURDAY 10 OCT 2026 COMPLETED ROUTE PLAN (5 SCHOOLS) ===');

  const maxSnoAgg = await prisma.school.aggregate({ _max: { s_no: true } });
  let nextSno = (maxSnoAgg._max.s_no || 494) + 1;

  const resolvedSchools = [];

  for (const item of completedStops) {
    let school = await prisma.school.findUnique({
      where: { school_id: item.partyId },
    });

    if (!school) {
      console.log(`Creating newly added CRM school: #${nextSno} ${item.name} (${item.partyId})`);
      school = await prisma.school.create({
        data: {
          s_no: nextSno++,
          school_id: item.partyId,
          school_name: item.name,
          opportunity_type: item.opportunity,
          board: item.board,
          school_type: item.type,
          address: 'Chamarajanagara, Karnataka 571313',
          pincode: '571313',
          area: 'Chamarajanagara',
          taluk: 'Chamarajanagara',
          district: 'Chamarajanagar',
          state: 'Karnataka',
          latitude: item.lat,
          longitude: item.lng,
          google_maps_url: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.name + ' Chamarajanagara')}`,
          priority: 'HIGH',
          recommended_programme: 'Both',
          visit_status: 'VISITED',
          visited_by_current_user: true,
          last_visit_date: TODAY_DATE,
          primary_available: true,
          nursery_available: true,
          lkg_available: true,
          ukg_available: true,
        },
      });
    } else {
      console.log(`Updating existing school: #${school.s_no} ${school.school_name} (${school.school_id}) -> VISITED`);
      school = await prisma.school.update({
        where: { id: school.id },
        data: {
          visit_status: 'VISITED',
          visited_by_current_user: true,
          last_visit_date: TODAY_DATE,
          area: 'Chamarajanagara',
        },
      });
    }

    // Ensure SchoolVisit record for today exists
    const startOfDay = new Date('2026-10-10T00:00:00.000Z');
    const endOfDay = new Date('2026-10-10T23:59:59.999Z');

    const existingVisitToday = await prisma.schoolVisit.findFirst({
      where: {
        school_id: school.id,
        visit_date: {
          gte: startOfDay,
          lte: endOfDay,
        },
      },
    });

    if (!existingVisitToday) {
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: new Date(`2026-10-10T0${4 + item.seq}:15:00.000Z`),
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Introduction',
          programme_discussed: 'Both',
          interest_level: 'High',
          outcome: 'Interested',
          notes: `Completed Chamarajanagara circuit visit (Stop #${item.seq}) on ${TODAY_STR}. Verified via CRM Visit Completed report.`,
          latitude: item.lat,
          longitude: item.lng,
          location_verified: true,
        },
      });
    }

    resolvedSchools.push({ ...item, school });
  }

  // Upsert RoutePlan for 2026-10-10
  const existingPlan = await prisma.routePlan.findFirst({
    where: { date: TODAY_STR },
  });

  const optimizedOrderJson = JSON.stringify(resolvedSchools.map((r) => r.school.id));

  let routePlan;
  if (existingPlan) {
    await prisma.routeStop.deleteMany({ where: { route_plan_id: existingPlan.id } });
    routePlan = await prisma.routePlan.update({
      where: { id: existingPlan.id },
      data: {
        name: 'Saturday 10 Oct: Chamarajanagara Half-Day Circuit (5 Schools Completed)',
        origin: 'Chamarajanagara Local Cluster',
        origin_lat: 11.92554,
        origin_lng: 76.94018,
        destination: 'Chamarajanagara Local Cluster',
        destination_lat: 11.92554,
        destination_lng: 76.94018,
        status: 'COMPLETED',
        is_locked: true,
        day_type: 'HALF_DAY',
        travel_mode: 'TWO_WHEELER',
        total_distance_meters: 11200,
        total_distance_km: 11.2,
        total_duration_seconds: 2100,
        total_duration_formatted: '35 mins',
        optimized_order: optimizedOrderJson,
        remarks: 'Completed all 5 scheduled stops in Chamarajanagara area on Saturday half-day.',
      },
    });
  } else {
    routePlan = await prisma.routePlan.create({
      data: {
        date: TODAY_STR,
        name: 'Saturday 10 Oct: Chamarajanagara Half-Day Circuit (5 Schools Completed)',
        origin: 'Chamarajanagara Local Cluster',
        origin_lat: 11.92554,
        origin_lng: 76.94018,
        destination: 'Chamarajanagara Local Cluster',
        destination_lat: 11.92554,
        destination_lng: 76.94018,
        travel_mode: 'TWO_WHEELER',
        total_distance_meters: 11200,
        total_distance_km: 11.2,
        total_duration_seconds: 2100,
        total_duration_formatted: '35 mins',
        optimized_order: optimizedOrderJson,
        status: 'COMPLETED',
        is_locked: true,
        day_type: 'HALF_DAY',
        remarks: 'Completed all 5 scheduled stops in Chamarajanagara area on Saturday half-day.',
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
        leg_distance_meters: 2240,
        leg_distance_km: 2.2,
        leg_duration_seconds: 420,
        leg_duration_formatted: '7 mins',
        status: 'VISITED',
        notes: `Visit Completed (${r.school.school_id})`,
      },
    });
  }

  // Upsert DailySummary for 2026-10-10
  await prisma.dailySummary.upsert({
    where: { date: TODAY_STR },
    update: {
      schools_planned: 5,
      schools_visited: 5,
      schools_not_visited: 0,
      revisits: 0,
      interested: 5,
      followups: 0,
      registrations: 0,
      not_interested: 0,
      total_distance_km: 11.2,
      total_travel_time: '35 mins',
      remarks: 'Completed Saturday half-day route in Chamarajanagara covering 5 schools: M.C.S Public School (S-17803), Seva Bharathi Nursery School (S-141383), St Joseph School (S-140157), St. Francis ICSE School (S-18484), and Universe English School (S-174787).',
      ai_summary: '100% completion of Saturday half-day target (5/5 schools visited in Chamarajanagara cluster).',
    },
    create: {
      date: TODAY_STR,
      schools_planned: 5,
      schools_visited: 5,
      schools_not_visited: 0,
      revisits: 0,
      interested: 5,
      followups: 0,
      registrations: 0,
      not_interested: 0,
      total_distance_km: 11.2,
      total_travel_time: '35 mins',
      remarks: 'Completed Saturday half-day route in Chamarajanagara covering 5 schools: M.C.S Public School (S-17803), Seva Bharathi Nursery School (S-141383), St Joseph School (S-140157), St. Francis ICSE School (S-18484), and Universe English School (S-174787).',
      ai_summary: '100% completion of Saturday half-day target (5/5 schools visited in Chamarajanagara cluster).',
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
  console.log(`Route Plan ID:                     ${routePlan.id}`);
  console.log(`Total Schools in Master Allotment: ${totalCount}`);
  console.log(`Unique Visited Schools (Green):    ${visitedCount}`);
  console.log(`Unvisited Schools (Red):           ${unvisitedCount}`);
  console.log(`Total Visit Events Logged:         ${totalVisitEvents}`);
  console.log(`Completion Rate:                   ${((visitedCount / totalCount) * 100).toFixed(2)}%`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
