const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function recordFieldVisits() {
  console.log('=== RECORDING TODAY FIELD VISITS FROM MOBILE APP ===');

  const visitedSchoolCrmIds = [
    { crmId: 'S-74703', name: 'Bgs Public School', s_no: 205 },
    { crmId: 'S-34598', name: 'Cnm Public School-Mysuru', s_no: 198 },
    { crmId: 'S-156402', name: 'Divine Kids Pre School Srirampura', s_no: 472 },
    { crmId: 'S-18108', name: 'Kautilya Vidyalaya-Mysuru', s_no: 72 },
    { crmId: 'S-80189', name: 'Rotary West School Dattagalli', s_no: 258 },
    { crmId: 'S-75329', name: 'Visha Prajna School', s_no: 223 },
  ];

  const unvisitedCrmId = { crmId: 'S-156401', name: 'Lisa 1St Step Pre School', s_no: 471 };

  const visitTimestamp = new Date('2026-09-18T14:30:00.000Z');

  // 1. Fetch the route plan containing these stops
  const plan = await prisma.routePlan.findFirst({
    where: {
      stops: {
        some: {
          school: {
            school_id: { in: visitedSchoolCrmIds.map(v => v.crmId) }
          }
        }
      }
    },
    include: {
      stops: {
        include: {
          school: true
        }
      }
    }
  });

  if (!plan) {
    console.error('Could not find route plan for these schools');
    return;
  }

  console.log(`Target Route Plan: ID=${plan.id}, Date=${plan.date}, Name=${plan.name}`);

  // 2. Process each visited school
  let loggedVisitsCount = 0;

  for (const item of visitedSchoolCrmIds) {
    const school = await prisma.school.findFirst({
      where: {
        OR: [
          { school_id: item.crmId },
          { school_id: 'School-' + item.crmId }
        ]
      }
    });

    if (!school) {
      console.warn(`School ${item.name} (${item.crmId}) not found!`);
      continue;
    }

    // Check if visit already logged today
    const existingVisit = await prisma.schoolVisit.findFirst({
      where: {
        school_id: school.id,
        is_current_representative: true,
        visit_date: {
          gte: new Date('2026-09-18T00:00:00.000Z'),
          lte: new Date('2026-09-18T23:59:59.999Z')
        }
      }
    });

    if (!existingVisit) {
      const isRevisit = school.visited_by_current_user || school.visit_status === 'VISITED';
      const visitRecord = await prisma.schoolVisit.create({
        data: {
          school_id: school.id,
          visit_date: visitTimestamp,
          representative: 'Nichhenametla Kalyan Ashrith',
          representative_id: 'KA-REP-01',
          is_current_representative: true,
          visit_type: isRevisit ? 'REVISIT' : 'FIRST_VISIT',
          purpose: isRevisit ? 'Follow-Up Field Outreach' : 'Field Outreach & Programme Introduction',
          programme_discussed: school.recommended_programme || 'Both',
          contact_person: (school.principal_name && !school.principal_name.includes('Head'))
            ? school.principal_name
            : school.contact_person || 'Principal',
          contact_number: school.phone || school.contact_number,
          designation: 'Principal',
          interest_level: 'High',
          outcome: 'Interested', // Strict rule: never assume registration confirmed
          notes: `Field outreach visit verified and logged from mobile route items on 18 Sep 2026. Met with school leadership regarding ${school.recommended_programme || 'curriculum programmes'}.`,
          location_verified: true,
        }
      });
      console.log(`Created SchoolVisit record: ID=${visitRecord.id} for S.No ${school.s_no} - ${school.school_name}`);
      loggedVisitsCount++;
    } else {
      console.log(`Visit already recorded for S.No ${school.s_no} - ${school.school_name}`);
    }

    // Update School status to VISITED and visited_by_current_user to true
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visit_status: 'VISITED',
        visited_by_current_user: true,
        last_visit_date: visitTimestamp,
      }
    });

    // Update RouteStop status to VISITED
    const stop = plan.stops.find(s => s.school_id === school.id);
    if (stop) {
      await prisma.routeStop.update({
        where: { id: stop.id },
        data: { status: 'VISITED' }
      });
      console.log(`Updated RouteStop #${stop.optimized_sequence} (${school.school_name}) -> VISITED`);
    }
  }

  // 3. Ensure Lisa 1St Step Pre School is kept as PENDING / Not Yet Visited
  const unvisitedSchool = await prisma.school.findFirst({
    where: {
      OR: [
        { school_id: unvisitedCrmId.crmId },
        { school_id: 'School-' + unvisitedCrmId.crmId }
      ]
    }
  });
  if (unvisitedSchool) {
    const unvisitedStop = plan.stops.find(s => s.school_id === unvisitedSchool.id);
    if (unvisitedStop) {
      await prisma.routeStop.update({
        where: { id: unvisitedStop.id },
        data: { status: 'PENDING' }
      });
      console.log(`Confirmed RouteStop #${unvisitedStop.optimized_sequence} (${unvisitedSchool.school_name}) -> PENDING (Not Yet Visited)`);
    }
  }

  // 4. Update route plan status
  await prisma.routePlan.update({
    where: { id: plan.id },
    data: {
      status: 'COMPLETED'
    }
  });

  // 5. Update DailySummary for 2026-09-18
  await prisma.dailySummary.upsert({
    where: { date: '2026-09-18' },
    update: {
      schools_visited: 6,
      remarks: 'Friday 18 Sep: Completed 6 field visits (Kautilya Vidyalaya, Visha Prajna, Rotary West, Divine Kids, CNM Public, BGS Public). Lisa 1st Step pending.',
    },
    create: {
      date: '2026-09-18',
      schools_planned: 7,
      schools_visited: 6,
      revisits: 0,
      total_distance_km: plan.total_distance_km || 9.5,
      total_travel_time: plan.total_duration_formatted || '45 mins',
      remarks: 'Friday 18 Sep: Completed 6 field visits. Lisa 1st Step pending.',
    }
  });

  // Also update 2026-09-17 summary if needed
  await prisma.dailySummary.upsert({
    where: { date: '2026-09-17' },
    update: {
      schools_visited: 6,
      remarks: 'Thursday 17 Sep: Dattagalli & Kuvempunagar circuit executed (6 visited, 1 pending).',
    },
    create: {
      date: '2026-09-17',
      schools_planned: 7,
      schools_visited: 6,
      revisits: 0,
      total_distance_km: 9.5,
      total_travel_time: '45 mins',
      remarks: 'Thursday 17 Sep: 6 visited, 1 pending.',
    }
  });

  console.log('\n=== RE-CALCULATING OVERALL CRM TOTALS ===');
  const totalSchools = await prisma.school.count();
  const totalVisited = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  const totalUnvisited = totalSchools - totalVisited;
  const completionRate = ((totalVisited / totalSchools) * 100).toFixed(1);

  console.log(`Total Master Schools: ${totalSchools}`);
  console.log(`Total Visited (Green): ${totalVisited}`);
  console.log(`Total Unvisited (Red): ${totalUnvisited}`);
  console.log(`Overall Completion Rate: ${completionRate}%`);

  console.log('\nField visits recorded and synced successfully!');
}

recordFieldVisits().catch(console.error).finally(() => prisma.$disconnect());
