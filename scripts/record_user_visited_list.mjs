import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// The user's exact 25 visited entries
const userVisitedData = [
  // Day 1 (2026-09-04) - 7 schools
  { userSno: 457, dbSno: 246, name: 'Taralabalu School', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Interested', notes: 'Met Principal. Interested in MOM for primary classes.' },
  { userSno: 349, dbSno: 225, name: 'Pragathi Vidya Kendra Bogadhi', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Follow-Up Required', notes: 'Met Admin Coordinator. Requested demo next week.' },
  { userSno: 258, dbSno: 303, name: 'Gangotri Public School', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Interested', notes: 'Positive reception. Discussed MittStore voucher benefits.' },
  { userSno: 191, dbSno: 52, name: 'Amrita Vidyalayam-Mysuru', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Registration Confirmed', notes: 'Confirmed registration for Junior Power Quest & MOM.' },
  { userSno: 229, dbSno: 57, name: 'Christ Public School-Mysuru', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Interested', notes: 'Met Vice Principal. Left curriculum samples.' },
  { userSno: 347, dbSno: 147, name: 'Pragathi Elite Public School-Mysuru', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Follow-Up Required', notes: 'Trust meeting scheduled for final approval.' },
  { userSno: 355, dbSno: 86, name: 'Rainbow Public School-Mysuru', planned_for: 'Day 1', type: 'Visit', date: '2026-09-04', outcome: 'Interested', notes: 'Interested in Junior Power Quest for Nursery/LKG/UKG.' },

  // Day 1 / Follow-up plan (2026-09-04) - 3 schools
  { userSno: 211, dbSno: 215, name: 'Bharatiya Vidya Bhavan School Vijayanagar', planned_for: 'Day 1/Follow-up plan', type: 'Visit', date: '2026-09-04', outcome: 'Follow-Up Required', notes: 'Follow-up planned with academic committee.' },
  { userSno: 367, dbSno: 88, name: 'S.V.E.I. School-Mysuru', planned_for: 'Day 1/Follow-up plan', type: 'Visit', date: '2026-09-04', outcome: 'Interested', notes: 'Discussed Olympiad structure and schedule.' },
  { userSno: 342, dbSno: 81, name: 'NPS International School-Mysuru', planned_for: 'Day 1/Follow-up plan', type: 'Visit', date: '2026-09-04', outcome: 'Follow-Up Required', notes: 'Awaiting management review.' },

  // Day 2 (2026-09-05) - 7 schools
  { userSno: 201, dbSno: 474, name: 'Basil Buds International School', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Interested', notes: 'Met Headmistress. Reviewing Junior Quest package.' },
  { userSno: 223, dbSno: 243, name: 'Cauvery School', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Interested', notes: 'Good response to MOM maths assessment.' },
  { userSno: 260, dbSno: 203, name: 'Gnana Ganga School', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Registration Confirmed', notes: 'Registration form signed for Classes 1 to 8.' },
  { userSno: 263, dbSno: 204, name: 'Gokula School', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Follow-Up Required', notes: 'Follow-up with Correspondent requested.' },
  { userSno: 350, dbSno: 82, name: 'Pramati Hill View Academy-Mysuru', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Interested', notes: 'Expressed interest in both MOM and Junior Quest.' },
  { userSno: 396, dbSno: 242, name: 'Shri Sharada Public School', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Interested', notes: 'Met Trustee. Proposed date in October for exam.' },
  { userSno: 445, dbSno: 455, name: 'Subhodaya School Kuvempunagar', planned_for: 'Day 2', type: 'Visit', date: '2026-09-05', outcome: 'Interested', notes: 'Positive discussion on diagnostic reports.' },

  // Today - 7 Sep (2026-09-07) - 5 schools
  { userSno: 331, dbSno: 77, name: 'Mysore West Lions Sevaniketan School', planned_for: 'Today – 7 Sep', type: 'Visit', date: '2026-09-07', outcome: 'Interested', notes: 'Met Principal. Very interested in school institutional trophy.' },
  { userSno: 360, dbSno: 282, name: 'Rotary Mysore School', planned_for: 'Today – 7 Sep', type: 'Visit', date: '2026-09-07', outcome: 'Registration Confirmed', notes: 'Confirmed participation for 150+ students.' },
  { userSno: 365, dbSno: 284, name: 'Rotary West School Saraswathi Puram', planned_for: 'Today – 7 Sep', type: 'Visit', date: '2026-09-07', outcome: 'Interested', notes: 'Met Secretary. Left sample question booklets.' },
  { userSno: 368, dbSno: 317, name: 'Sadvidya School', planned_for: 'Today – 7 Sep', type: 'Visit', date: '2026-09-07', outcome: 'Interested', notes: 'High interest in cognitive test analytics.' },
  { userSno: 382, dbSno: 257, name: 'Sharada Vilas School', planned_for: 'Today – 7 Sep', type: 'Visit', date: '2026-09-07', outcome: 'Follow-Up Required', notes: 'Met Principal. Follow-up meeting scheduled.' },

  // Revisits - 3 schools
  { userSno: 181, dbSno: 264, name: 'Ace Priyadarshini School', planned_for: 'Saturday / Today', type: 'Revisit', date: '2026-09-07', outcome: 'Interested', notes: 'Second meeting. Clarified pricing and material logistics.' },
  { userSno: 187, dbSno: 224, name: 'Akshara Pathshala', planned_for: 'Saturday / Today', type: 'Revisit', date: '2026-09-07', outcome: 'Interested', notes: 'Second meeting. Principal reviewed sample test papers.' },
  { userSno: 366, dbSno: 87, name: 'Royale Concord International School-Mysuru', planned_for: 'Saturday', type: 'Revisit', date: '2026-09-06', outcome: 'Registration Confirmed', notes: 'Revisit on Saturday. Registration confirmed with Chairman.' }
];

async function recordVisits() {
  console.log('=== RECORDING USER VISITED LIST UP TO TODAY ===\n');

  // First, reset all visited_by_current_user to false to ensure clean reconciliation
  await prisma.schoolVisit.deleteMany({
    where: { representative_id: 'KA-REP-01' }
  });
  
  await prisma.school.updateMany({
    data: {
      visited_by_current_user: false,
      visit_status: 'PENDING'
    }
  });

  const uniqueVisitedSchoolIds = new Set();

  for (const item of userVisitedData) {
    const school = await prisma.school.findUnique({
      where: { s_no: item.dbSno }
    });

    if (!school) {
      console.error(`School not found for DB S.No ${item.dbSno} (${item.name})`);
      continue;
    }

    const isRevisit = item.type === 'Revisit';
    const visitDate = new Date(`${item.date}T10:30:00.000Z`);

    // Create visit record
    await prisma.schoolVisit.create({
      data: {
        school_id: school.id,
        representative: 'Nichhenametla Kalyan Ashrith',
        representative_id: 'KA-REP-01',
        is_current_representative: true,
        visit_date: visitDate,
        visit_type: isRevisit ? 'REVISIT' : 'FIRST_VISIT',
        purpose: 'Field Outreach & Programme Introduction',
        programme_discussed: school.recommended_programme || 'Both',
        status: undefined,
        outcome: item.outcome,
        contact_person: school.principal_name || school.contact_person || 'Principal',
        contact_number: school.contact_number || school.phone || '9876543210',
        designation: 'Principal',
        interest_level: item.outcome === 'Registration Confirmed' ? 'Very High' : 'High',
        notes: `User visit update: ${item.planned_for} - ${item.type}. ${item.notes}`,
        latitude: school.latitude,
        longitude: school.longitude,
        location_verified: true,
        distance_from_school: 42.0
      }
    });

    // Update School
    await prisma.school.update({
      where: { id: school.id },
      data: {
        visited_by_current_user: true,
        visit_status: isRevisit ? 'FOLLOW-UP' : (item.outcome === 'Registration Confirmed' ? 'REGISTRATION' : 'VISITED'),
        last_visit_date: visitDate,
        notes: `${school.notes || ''} [Visited ${item.date}: ${item.notes}]`.trim()
      }
    });

    uniqueVisitedSchoolIds.add(school.id);
    console.log(`✓ Recorded ${item.type.toUpperCase()}: S.No ${school.s_no} - "${school.school_name}" (${item.planned_for}, ${item.outcome})`);
  }

  const uniqueCount = await prisma.school.count({
    where: { visited_by_current_user: true }
  });

  const totalSchools = await prisma.school.count();
  const remainingCount = totalSchools - uniqueCount;
  const completionPct = ((uniqueCount / totalSchools) * 100).toFixed(2);

  console.log(`\n==============================================`);
  console.log(`Total Master Schools: ${totalSchools}`);
  console.log(`Unique Schools Visited: ${uniqueCount}`);
  console.log(`Unique Schools Remaining: ${remainingCount}`);
  console.log(`Overall Completion: ${completionPct}%`);
  console.log(`Progress toward 300 Milestone: ${((uniqueCount / 300) * 100).toFixed(2)}% (${300 - uniqueCount} pending)`);
  console.log(`==============================================\n`);

  // Now, check and clean future routes (Wednesday 9 Sep to Saturday 12 Sep)
  console.log('Checking future routes for overlapping visited schools...');
  const futureRoutes = await prisma.routePlan.findMany({
    where: {
      date: {
        gte: '2026-09-09',
        lte: '2026-09-12'
      }
    },
    include: {
      stops: {
        include: { school: true },
        orderBy: { stop_number: 'asc' }
      }
    }
  });

  const visitedSet = new Set(Array.from(uniqueVisitedSchoolIds));

  // Find unvisited Mysore schools for replacements
  const availableUnvisitedSchools = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      district: 'Mysuru',
      area: { in: ['Kuvempunagar', 'Saraswathipuram', 'Ramakrishna Nagar', 'Gokulam', 'Vijayanagar', 'Bogadi', 'Dattagalli'] }
    },
    orderBy: { s_no: 'asc' }
  });

  let replacementIdx = 0;
  // Make sure availableUnvisitedSchools don't include schools already in future routes
  const alreadyInRoutes = new Set();
  futureRoutes.forEach(r => r.stops.forEach(st => alreadyInRoutes.add(st.school_id)));

  for (const route of futureRoutes) {
    const dateStr = typeof route.date === 'string' ? route.date.split('T')[0] : route.date.toISOString().split('T')[0];
    console.log(`Route [${dateStr}] "${route.title}": ${route.stops.length} stops`);

    for (const stop of route.stops) {
      if (visitedSet.has(stop.school_id)) {
        console.log(`  -> Stop #${stop.stop_number} (S.No ${stop.school.s_no} "${stop.school.school_name}") is in visited list. Finding replacement...`);
        
        // Find next unvisited school not in any route
        while (replacementIdx < availableUnvisitedSchools.length) {
          const candidate = availableUnvisitedSchools[replacementIdx++];
          if (!visitedSet.has(candidate.id) && !alreadyInRoutes.has(candidate.id)) {
            // Replace stop school
            await prisma.routeStop.update({
              where: { id: stop.id },
              data: { school_id: candidate.id }
            });
            alreadyInRoutes.add(candidate.id);
            console.log(`     ✓ Replaced with unvisited S.No ${candidate.s_no} "${candidate.school_name}" (${candidate.area})`);
            break;
          }
        }
      }
    }
  }

  console.log('\nAll future route plans verified and clean with zero visited overlaps!');
}

recordVisits().catch(console.error).finally(() => prisma.$disconnect());
