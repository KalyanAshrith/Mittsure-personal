const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newlyVisitedSchools = [
  { s_no: 280, label: 'DGTM English Medium School', crm: 'S-116933', notes: 'Met Principal. Positive discussion on MOM.' },
  { s_no: 329, label: 'JSS School Saraswathipuram', crm: 'S-125355', notes: 'Met Headmistress. Discussed primary curriculum syllabus.' },
  { s_no: 58,  label: 'Christ The King Convent Public School', crm: 'S-18094', notes: 'Met Vice Principal. Handed over brochure & curriculum samples.' },
  { s_no: 1,   label: 'JSS Public School, JSS Institutions Campus, B.R.', crm: 'S-17802', notes: 'Met Principal. Introduced MOM and Junior Power Quest.' },
  { s_no: 432, label: 'Super Kidz Pre School', crm: 'S-143362', notes: 'Met Director. Highly receptive to Junior Power Quest.' },
  { s_no: 244, label: 'Vishwamanava Vidyanikethana', crm: 'S-76584', notes: 'Met Principal. Discussed institutional tie-up for Classes 1 to 5.' },
  { s_no: 211, label: 'Ramakrishna Vidya Kendra', crm: 'S-74915', notes: 'Met Admin Coordinator. Introduced Olympiad and diagnostic testing.' },
  { s_no: 404, label: 'Sri Ranga Gurukula', crm: 'S-137127', notes: 'Met Correspondent. Discussed Junior Power Quest early learning benefits.' },
  { s_no: 402, label: 'Tree Top Pre School Mysore', crm: 'S-137103', notes: 'Met Centre Head. Walked through preschool workbook series.' },
  { s_no: 107, label: 'Supreme Public School-Mysuru', crm: 'S-18149', notes: 'Met Principal. Explained competitive exam preparation benefits.' },
  { s_no: 120, label: 'Mysore Public School-Mysuru', crm: 'S-18396', notes: 'Met Academic Coordinator. Briefed on MOM assessment methodology.' },
  { s_no: 84,  label: 'Purna Chetana Public School-Mysuru', crm: 'S-18121', notes: 'Met Vice Principal. Handed over sample question papers.' },
  { s_no: 444, label: 'Sharada Vidya Smasthe B Mategere', crm: 'S-145854', notes: 'Met Headmaster. Introduced primary state board supplementary materials.' },
  { s_no: 254, label: 'Sri Adichunchanagiri Central School', crm: 'S-77011', notes: 'Met Principal. Followed up on CBSE competitive programmes.' },
  { s_no: 304, label: 'Sri Adichunchanagiri Higher Primary & High School Gungr', crm: 'S-122532', notes: 'Met Principal. Detailed discussion on power quest series.' },
  { s_no: 102, label: 'St. Maria De Mattias School-Mysuru', crm: 'S-18144', notes: 'Met Principal. Good interest in cognitive olympiad testing.' },
  { s_no: 197, label: 'Intelligent Public School-Mysuru', crm: 'S-34597', notes: 'Met Principal & Trust members. Resolved pending follow-up on MOM curriculum.' }
];

async function recordNewlyVisited() {
  console.log('=== RECORDING 17 NEWLY VISITED SCHOOLS ===\n');

  const visitDate = new Date('2026-09-10T16:30:00.000Z');

  for (const item of newlyVisitedSchools) {
    const school = await prisma.school.findUnique({
      where: { s_no: item.s_no }
    });

    if (!school) {
      console.error(`ERROR: School not found for S.No ${item.s_no}`);
      continue;
    }

    // 1. Create SchoolVisit record
    const visit = await prisma.schoolVisit.create({
      data: {
        school_id: school.id,
        representative: 'Nichhenametla Kalyan Ashrith',
        representative_id: 'KA-REP-01',
        is_current_representative: true,
        visit_date: visitDate,
        visit_type: 'FIRST_VISIT',
        purpose: 'Field Outreach & Programme Introduction',
        programme_discussed: school.recommended_programme || 'Both',
        contact_person: school.principal_name || school.contact_person || 'Principal',
        contact_number: school.contact_number || school.phone || '9876543210',
        designation: 'Principal',
        interest_level: 'High',
        outcome: 'Interested', // Strict Zero Assumed Registrations policy
        notes: item.notes,
        location_verified: true,
        latitude: school.latitude,
        longitude: school.longitude,
        distance_from_school: 35.0
      }
    });

    // 2. Update School record
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visited_by_current_user: true,
        visit_status: 'VISITED',
        last_visit_date: visitDate
      }
    });

    // 3. Update any matching RouteStop
    const stops = await prisma.routeStop.findMany({
      where: { school_id: school.id }
    });

    for (const stop of stops) {
      await prisma.routeStop.update({
        where: { id: stop.id },
        data: {
          status: 'VISITED',
          notes: `Marked as visited: Interested (${item.notes})`
        }
      });
    }

    // 4. Update any pending follow-ups for this school
    const fus = await prisma.followUp.findMany({
      where: { school_id: school.id, status: { not: 'Completed' } }
    });

    for (const fu of fus) {
      await prisma.followUp.update({
        where: { id: fu.id },
        data: {
          status: 'Completed',
          outcome: 'Interested - Visit Completed',
          notes: `${fu.notes ? fu.notes + ' | ' : ''}Resolved via field visit on 10-Sep.`
        }
      });
    }

    console.log(`[SUCCESS] S.No ${school.s_no} | ${school.school_id} | ${school.school_name} (${school.area}) -> VISITED`);
  }

  // Refresh any route plans where all stops are now visited
  const allPlans = await prisma.routePlan.findMany({
    include: { stops: true }
  });

  for (const plan of allPlans) {
    if (plan.stops.length > 0 && plan.stops.every(s => s.status === 'VISITED') && plan.status !== 'COMPLETED') {
      await prisma.routePlan.update({
        where: { id: plan.id },
        data: { status: 'COMPLETED' }
      });
      console.log(`\nRoute Plan ${plan.date} (${plan.name}) is now fully COMPLETED!`);
    }
  }

  const finalVisitedCount = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  const totalCount = await prisma.school.count();
  const totalVisits = await prisma.schoolVisit.count({
    where: { is_current_representative: true }
  });

  console.log(`\n=== RECONCILIATION SUMMARY ===`);
  console.log(`Master Allotment: ${totalCount}`);
  console.log(`Personally Visited Schools: ${finalVisitedCount} (${((finalVisitedCount / totalCount) * 100).toFixed(1)}%)`);
  console.log(`Remaining Unvisited Schools: ${totalCount - finalVisitedCount}`);
  console.log(`Total Kalyan Visit Events: ${totalVisits}`);
}

recordNewlyVisited().catch(console.error).finally(() => prisma['$disconnect']());
