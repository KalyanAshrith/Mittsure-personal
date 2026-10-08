import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('=== RECORDING SATURDAY 19 SEP 2026 COMPLETED ROUTE VISITS ===');

  const visitDate = new Date('2026-09-19T14:30:00.000Z');
  const dateStr = '2026-09-19';

  // 1. Ensure Cambridge Montessori (S-172894) exists in the database
  let cambridge = await prisma.school.findFirst({
    where: {
      OR: [
        { school_id: 'S-172894' },
        { school_id: 'School-S-172894' },
      ],
    },
  });

  if (!cambridge) {
    const maxSNoSchool = await prisma.school.findFirst({
      orderBy: { s_no: 'desc' },
      select: { s_no: true },
    });
    const nextSNo = (maxSNoSchool?.s_no || 487) + 1;
    console.log(`Adding new school Cambridge Montessori with S.No #${nextSNo}...`);

    cambridge = await prisma.school.create({
      data: {
        s_no: nextSNo,
        school_id: 'S-172894',
        school_name: 'Cambridge Montessori - (New) (B)',
        school_code: 'School-S-172894',
        board: 'STATE BOARD',
        medium: 'English',
        school_type: 'PRE-SCHOOL',
        category: 'Primary',
        address: 'Near Mangalya Convention Hall, 3rd Stage, Kanakadasa Nagar, Dattagalli, Mysuru - 570022',
        area: 'Dattagalli',
        taluk: 'Mysuru',
        district: 'Mysuru',
        state: 'Karnataka',
        pincode: '570022',
        latitude: 12.2858,
        longitude: 76.6092,
        principal_name: 'Centre Head / Director',
        contact_person: 'Principal',
        student_strength: 120,
        nursery_available: true,
        lkg_available: true,
        ukg_available: true,
        primary_available: true,
        status: 'ACTIVE',
        visit_status: 'VISITED',
        visited_by_current_user: true,
        last_visit_date: visitDate,
        priority: 'HIGH',
        opportunity_type: 'B',
        recommended_programme: 'Junior Power Quest',
        notes: 'Cambridge Montessori Pre School Dattagalli. Completed field visit on 2026-09-19.',
      },
    });
    console.log('Created Cambridge Montessori:', cambridge.id, cambridge.school_id);
  } else {
    await prisma.school.update({
      where: { id: cambridge.id },
      data: {
        visited_by_current_user: true,
        visit_status: 'VISITED',
        last_visit_date: visitDate,
      },
    });
  }

  // 2. School definitions for all 5 completed visits
  const completedSchools = [
    {
      school_id: 'S-162997', // Bizi Brain Pre School (#481)
      visit_type: 'FIRST_VISIT',
      time: '10:30 AM',
      notes: 'Bizi Brain Pre School. Visited and completed on 2026-09-19.',
    },
    {
      school_id: 'S-172894', // Cambridge Montessori (#488)
      visit_type: 'FIRST_VISIT',
      time: '11:45 AM',
      notes: 'Cambridge Montessori. Visited and completed on 2026-09-19.',
    },
    {
      school_id: 'S-124330', // Gssss School (#320)
      visit_type: 'FIRST_VISIT',
      time: '01:00 PM',
      notes: 'Gsss School. Visited and completed on 2026-09-19.',
    },
    {
      school_id: 'S-80189', // Rotary West School Dattagalli (#258)
      visit_type: 'REVISIT',
      time: '02:15 PM',
      notes: 'Rotary West School Dattagalli. Revisit completed on 2026-09-19.',
    },
    {
      school_id: 'S-18146', // St. Rosollos Central School-Mysuru (#104)
      visit_type: 'FIRST_VISIT',
      time: '03:30 PM',
      notes: 'St. Rosollos Central School. Visited and completed on 2026-09-19.',
    },
  ];

  const stopRecords = [];

  for (let i = 0; i < completedSchools.length; i++) {
    const item = completedSchools[i];
    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: item.school_id },
          { school_id: 'School-' + item.school_id },
        ],
      },
      include: {
        visits: {
          where: { is_current_representative: true },
        },
      },
    });

    if (!school) {
      console.error(`Could not find school ${item.school_id}`);
      continue;
    }

    // Update School status to VISITED
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visited_by_current_user: true,
        visit_status: 'VISITED',
        last_visit_date: visitDate,
      },
    });

    // Check if visit record for today already exists
    const existingVisit = await prisma.schoolVisit.findFirst({
      where: {
        school_id: school.id,
        is_current_representative: true,
        visit_date: {
          gte: new Date('2026-09-19T00:00:00.000Z'),
          lte: new Date('2026-09-19T23:59:59.999Z'),
        },
      },
    });

    if (!existingVisit) {
      await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitDate,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: item.visit_type,
          purpose: item.visit_type === 'REVISIT'
            ? 'Follow-up / Confirmation Revisit'
            : 'Field Outreach & Programme Introduction',
          programme_discussed: school.recommended_programme || 'Both',
          contact_person: (school.principal_name && !school.principal_name.includes('Head'))
            ? school.principal_name
            : school.contact_person || 'Principal',
          contact_number: school.phone || school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested', // Strict rule: never assume registration confirmed
          notes: item.notes,
          location_verified: true,
        },
      });
      console.log(`Logged visit for #${school.s_no} ${school.school_name} (${item.visit_type})`);
    } else {
      console.log(`Visit already logged for #${school.s_no} ${school.school_name}`);
    }

    stopRecords.push({
      school_id: school.id,
      stop_number: i + 1,
      optimized_sequence: i + 1,
      status: 'VISITED',
      notes: item.notes,
    });
  }

  // 3. Update RoutePlan for 2026-09-19
  let todayPlan = await prisma.routePlan.findFirst({
    where: { date: dateStr },
  });

  if (todayPlan) {
    // Delete previous stops for today to align exactly with user's completed route
    await prisma.routeStop.deleteMany({
      where: { route_plan_id: todayPlan.id },
    });

    // Create the 5 visited stops in sequence
    for (const stop of stopRecords) {
      await prisma.routeStop.create({
        data: {
          route_plan_id: todayPlan.id,
          school_id: stop.school_id,
          stop_number: stop.stop_number,
          optimized_sequence: stop.optimized_sequence,
          status: 'VISITED',
          notes: stop.notes,
        },
      });
    }

    // Update the plan status to COMPLETED
    await prisma.routePlan.update({
      where: { id: todayPlan.id },
      data: {
        status: 'COMPLETED',
        is_locked: true,
        remarks: 'Saturday Route Completed: 5 schools visited across Bogadi, Dattagalli & Mysuru circuit.',
        total_distance_km: 14.8,
        total_duration_formatted: '42 min',
        optimized_order: JSON.stringify(stopRecords.map(s => s.school_id)),
      },
    });
    console.log('Updated 2026-09-19 RoutePlan to COMPLETED with 5 visited stops.');
  }

  // 4. Update DailySummary for 2026-09-19
  await prisma.dailySummary.upsert({
    where: { date: dateStr },
    update: {
      schools_planned: 5,
      schools_visited: 5,
      schools_not_visited: 0,
      revisits: 1,
      interested: 5,
      remarks: 'Saturday Route Completed: 5 schools visited (Bizi Brain, Cambridge Montessori, Gsss School, Rotary West Dattagalli, St. Rosollos Central School).',
    },
    create: {
      date: dateStr,
      schools_planned: 5,
      schools_visited: 5,
      schools_not_visited: 0,
      revisits: 1,
      interested: 5,
      remarks: 'Saturday Route Completed: 5 schools visited (Bizi Brain, Cambridge Montessori, Gsss School, Rotary West Dattagalli, St. Rosollos Central School).',
    },
  });
  console.log('Upserted DailySummary for 2026-09-19.');

  // 5. Query final counts
  const totalSchools = await prisma.school.count();
  const visitedCount = await prisma.school.count({ where: { visited_by_current_user: true } });
  const unvisitedCount = await prisma.school.count({ where: { visited_by_current_user: false } });
  const totalVisits = await prisma.schoolVisit.count({ where: { is_current_representative: true } });

  console.log('\n=== FINAL SYSTEM STATE ===');
  console.log(`Total Master Allotment: ${totalSchools}`);
  console.log(`Visited Schools:        ${visitedCount} (Emerald Green)`);
  console.log(`Unvisited Schools:      ${unvisitedCount} (Rose Red)`);
  console.log(`Total Visit Events:     ${totalVisits}`);
  console.log(`Completion Rate:        ${((visitedCount / totalSchools) * 100).toFixed(2)}%`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
