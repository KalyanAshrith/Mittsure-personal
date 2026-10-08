import { PrismaClient } from '@prisma/client';
import fs from 'fs';
import path from 'path';

const prisma = new PrismaClient();

const todayPlanSchools = [
  { s_no: 283, code: 'S-117035', name: 'Future Foundation School' },
  { s_no: 372, code: 'S-131589', name: 'Lalitha High School' },
  { s_no: 225, code: 'S-75441',  name: 'Pragathi Vidya Kendra Bogadhi' },
  { s_no: 168, code: 'S-21329',  name: 'Sri Sharada Public School-830342' },
  { s_no: 107, code: 'S-18149',  name: 'Supreme Public School-Mysuru' },
  { s_no: 412, code: 'S-141129', name: 'Vasavi Vidyanikethana' },
  { s_no: 113, code: 'S-18155',  name: 'Vidyavardhaka Sangha B M Sri Educational Instituti' }
];

async function applyTodayPlan() {
  console.log('=== APPLYING TODAY ROUTE PLAN & VISITS (2026-10-08) ===');

  const visitDate = new Date('2026-10-08T14:30:00.000Z');
  const dateStr = '2026-10-08';

  const resolvedSchools = [];
  for (const item of todayPlanSchools) {
    const s = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: item.code },
          { school_code: item.code },
          { school_id: 'School-' + item.code },
          { s_no: item.s_no }
        ]
      }
    });

    if (!s) {
      throw new Error(`School not found: ${item.name} (${item.code})`);
    }
    resolvedSchools.push(s);
  }

  // 1. Mark all 7 schools as VISITED
  let newlyMarkedCount = 0;
  for (const s of resolvedSchools) {
    const wasVisited = s.visited_by_current_user && s.visit_status === 'VISITED';
    await prisma.school.update({
      where: { id: s.id },
      data: {
        visit_status: 'VISITED',
        visited_by_current_user: true,
        last_visit_date: visitDate
      }
    });

    if (!wasVisited) {
      console.log(`✓ Marked #${s.s_no} ${s.school_name} as VISITED (New Unique)`);
      newlyMarkedCount++;
    } else {
      console.log(`✓ Updated #${s.s_no} ${s.school_name} (Revisit today)`);
    }

    // Ensure SchoolVisit record for today exists
    const existingTodayVisit = await prisma.schoolVisit.findFirst({
      where: {
        school_id: s.id,
        is_current_representative: true,
        visit_date: {
          gte: new Date('2026-10-08T00:00:00.000Z'),
          lte: new Date('2026-10-08T23:59:59.999Z')
        }
      }
    });

    if (!existingTodayVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: s.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: wasVisited ? 'REVISIT' : 'FIRST_VISIT',
          purpose: 'Field Outreach & Programme Follow-up',
          programme_discussed: s.recommended_programme || 'Both',
          contact_person: s.contact_person || s.principal_name || 'Principal',
          contact_number: s.phone || s.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested', // Strictly Interested
          notes: 'Completed field visit from today mobile app route circuit.',
          location_verified: true
        }
      });
    }
  }

  // 2. Create or Update RoutePlan for 2026-10-08
  let plan = await prisma.routePlan.findFirst({
    where: { date: dateStr }
  });

  const stopIds = resolvedSchools.map(s => s.s_no);

  if (!plan) {
    plan = await prisma.routePlan.create({
      data: {
        date: dateStr,
        name: 'Thursday 8 Oct: Mysuru Circuit (7 Schools Completed)',
        origin: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        origin_lat: 12.3021,
        origin_lng: 76.6178,
        destination: '661, Sahukar Chennaiah Road, Janatha Nagar, Bogadi 2nd Stage, TK Layout, Mysuru 570009',
        destination_lat: 12.3021,
        destination_lng: 76.6178,
        travel_mode: 'TWO_WHEELER',
        total_distance_meters: 14200,
        total_distance_km: 14.2,
        total_duration_seconds: 2400,
        total_duration_formatted: '40 mins',
        optimized_order: JSON.stringify(stopIds),
        status: 'COMPLETED',
        remarks: 'Today field circuit: 7 schools visited (Future Foundation, Lalitha High, Pragathi Vidya Kendra, Sri Sharada, Supreme Public, Vasavi, Vidyavardhaka Sangha). 100% completed.',
        day_type: 'FULL_DAY',
        is_locked: true
      }
    });
    console.log(`Created RoutePlan: ${plan.id}`);
  } else {
    plan = await prisma.routePlan.update({
      where: { id: plan.id },
      data: {
        status: 'COMPLETED',
        name: 'Thursday 8 Oct: Mysuru Circuit (7 Schools Completed)',
        remarks: 'Today field circuit: 7 schools visited (Future Foundation, Lalitha High, Pragathi Vidya Kendra, Sri Sharada, Supreme Public, Vasavi, Vidyavardhaka Sangha). 100% completed.',
        is_locked: true
      }
    });
  }

  // 3. Upsert RouteStops for this plan in exact sequence
  // Delete old stops for this plan if any
  await prisma.routeStop.deleteMany({
    where: { route_plan_id: plan.id }
  });

  for (let i = 0; i < resolvedSchools.length; i++) {
    const s = resolvedSchools[i];
    await prisma.routeStop.create({
      data: {
        route_plan_id: plan.id,
        school_id: s.id,
        stop_number: i + 1,
        optimized_sequence: i + 1,
        leg_distance_meters: 1800,
        leg_distance_km: 1.8,
        leg_duration_seconds: 300,
        leg_duration_formatted: '5 min',
        status: 'VISITED',
        notes: `Stop ${i + 1} of 7: ${s.school_name} (${s.school_type}, ${s.area}) - Visited`
      }
    });
  }
  console.log(`Created 7 VISITED RouteStops for plan ${plan.id}`);

  // 4. Update DailySummary for 2026-10-08
  await prisma.dailySummary.upsert({
    where: { date: dateStr },
    update: {
      schools_planned: 7,
      schools_visited: 7,
      remarks: 'Thursday 8 Oct: Completed 7 field visits (Future Foundation, Lalitha High, Pragathi Vidya Kendra, Sri Sharada, Supreme Public, Vasavi, Vidyavardhaka Sangha).'
    },
    create: {
      date: dateStr,
      schools_planned: 7,
      schools_visited: 7,
      revisits: 3,
      total_distance_km: 14.2,
      total_travel_time: '40 mins',
      remarks: 'Thursday 8 Oct: Completed 7 field visits (Future Foundation, Lalitha High, Pragathi Vidya Kendra, Sri Sharada, Supreme Public, Vasavi, Vidyavardhaka Sangha).'
    }
  });

  // 5. Update data/schools.json
  const schoolsJsonPath = path.resolve(process.cwd(), 'data/schools.json');
  if (fs.existsSync(schoolsJsonPath)) {
    try {
      const content = fs.readFileSync(schoolsJsonPath, 'utf-8');
      const schoolsData = JSON.parse(content);
      const visitedIds = new Set(resolvedSchools.map(s => s.school_id));
      for (const item of schoolsData) {
        if (visitedIds.has(item.school_id)) {
          item.visit_status = 'VISITED';
          item.visited_by_current_user = true;
          item.last_visit_date = visitDate.toISOString();
        }
      }
      fs.writeFileSync(schoolsJsonPath, JSON.stringify(schoolsData, null, 2), 'utf-8');
      console.log('Updated data/schools.json for today visits.');
    } catch (err) {
      console.warn('Could not update schools.json:', err.message);
    }
  }

  // 6. Metrics summary
  const total = await prisma.school.count();
  const visited = await prisma.school.count({ where: { visited_by_current_user: true } });
  const unvisited = total - visited;

  console.log('\n=== UPDATED METRICS AFTER TODAY PLAN ===');
  console.log(`Total Master Allotment: ${total}`);
  console.log(`Unique Visited Schools: ${visited} (Emerald Green)`);
  console.log(`Unvisited Schools: ${unvisited} (Rose Red)`);
  console.log(`Completion Rate: ${((visited / total) * 100).toFixed(2)}%`);
}

applyTodayPlan().catch(console.error).finally(() => prisma.$disconnect());
