import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const providedList = [
  { s_no: 457, name: 'Taralabalu School', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 349, name: 'Pragathi Vidya Kendra Bogadhi', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 258, name: 'Gangotri Public School', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 191, name: 'Amrita Vidyalayam-Mysuru', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 229, name: 'Christ Public School-Mysuru', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 347, name: 'Pragathi Elite Public School-Mysuru', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 355, name: 'Rainbow Public School-Mysuru', type: 'Visit', planned_for: 'Day 1' },
  { s_no: 211, name: 'Bharatiya Vidya Bhavan School Vijayanagar', type: 'Visit', planned_for: 'Day 1/Follow-up plan' },
  { s_no: 367, name: 'S.V.E.I. School-Mysuru', type: 'Visit', planned_for: 'Day 1/Follow-up plan' },
  { s_no: 342, name: 'NPS International School-Mysuru', type: 'Visit', planned_for: 'Day 1/Follow-up plan' },
  { s_no: 201, name: 'Basil Buds International School', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 223, name: 'Cauvery School', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 260, name: 'Gnana Ganga School', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 263, name: 'Gokula School', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 350, name: 'Pramati Hill View Academy-Mysuru', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 396, name: 'Shri Sharada Public School', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 445, name: 'Subhodaya School Kuvempunagar', type: 'Visit', planned_for: 'Day 2' },
  { s_no: 181, name: 'Ace Priyadarshini School', type: 'Revisit', planned_for: 'Saturday / Today' },
  { s_no: 187, name: 'Akshara Pathshala', type: 'Revisit', planned_for: 'Saturday / Today' },
  { s_no: 366, name: 'Royale Concord International School-Mysuru', type: 'Revisit', planned_for: 'Saturday' },
  { s_no: 331, name: 'Mysore West Lions Sevaniketan School', type: 'Visit', planned_for: 'Today – 7 Sep' },
  { s_no: 360, name: 'Rotary Mysore School', type: 'Visit', planned_for: 'Today – 7 Sep' },
  { s_no: 365, name: 'Rotary West School Saraswathi Puram', type: 'Visit', planned_for: 'Today – 7 Sep' },
  { s_no: 368, name: 'Sadvidya School', type: 'Visit', planned_for: 'Today – 7 Sep' },
  { s_no: 382, name: 'Sharada Vilas School', type: 'Visit', planned_for: 'Today – 7 Sep' },
];

async function main() {
  const currentVisited = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    select: { s_no: true, school_name: true, visit_status: true }
  });
  console.log('Current visited count in DB:', currentVisited.length);
  const currentSNos = new Set(currentVisited.map(s => s.s_no));
  
  const providedSNos = new Set(providedList.map(s => s.s_no));
  console.log('Provided list count:', providedList.length);

  // Check which in providedList are not in currentVisited
  const newlyVisited = providedList.filter(s => !currentSNos.has(s.s_no));
  console.log('\nNewly visited from user list (not currently marked in DB):', newlyVisited.length);
  newlyVisited.forEach(s => console.log(`  S.No ${s.s_no}: ${s.name} (${s.type}, ${s.planned_for})`));

  // Check which in currentVisited are not in providedList
  const inDButNotProvided = currentVisited.filter(s => !providedSNos.has(s.s_no));
  console.log('\nIn DB as visited, but not in provided list:', inDButNotProvided.length);
  inDButNotProvided.forEach(s => console.log(`  S.No ${s.s_no}: ${s.school_name}`));

  // Check matching schools in DB for each provided S.No
  const dbSchools = await prisma.school.findMany({
    where: { s_no: { in: Array.from(providedSNos) } },
    select: { id: true, s_no: true, school_name: true, visited_by_current_user: true, area: true }
  });
  console.log('\nDB schools matched for provided S.Nos:', dbSchools.length, 'out of', providedList.length);
  
  // Check future routes
  const routes = await prisma.routePlan.findMany({
    include: {
      stops: {
        include: {
          school: {
            select: { s_no: true, school_name: true }
          }
        },
        orderBy: { stop_number: 'asc' }
      }
    },
    orderBy: { date: 'asc' }
  });
  
  console.log('\nChecking all active route plans for conflicts with provided visited schools:');
  for (const r of routes) {
    const overlappingStops = r.stops.filter(st => st.school && providedSNos.has(st.school.s_no));
    const dateStr = typeof r.date === 'string' ? r.date.split('T')[0] : r.date.toISOString().split('T')[0];
    console.log(`Route [${dateStr}] "${r.title}" (locked: ${r.is_locked}): total stops: ${r.stops.length}`);
    if (overlappingStops.length > 0) {
      console.log(`  WARNING Overlapping stops found that are in the visited list:`);
      overlappingStops.forEach(st => console.log(`    Stop #${st.stop_number}: S.No ${st.school.s_no} - ${st.school.school_name}`));
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
