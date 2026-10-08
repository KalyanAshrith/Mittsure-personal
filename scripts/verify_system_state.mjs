import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkState() {
  const totalSchools = await prisma.school.count();
  const visitedSchools = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  const unvisitedSchools = await prisma.school.count({
    where: { visited_by_current_user: false }
  });
  const totalVisits = await prisma.schoolVisit.count();
  const revisits = await prisma.schoolVisit.count({
    where: { visit_type: 'REVISIT' }
  });
  const firstVisits = await prisma.schoolVisit.count({
    where: { visit_type: 'FIRST_VISIT' }
  });

  console.log(`=== SYSTEM METRICS STATE ===`);
  console.log(`Total Master Schools: ${totalSchools}`);
  console.log(`Unique Visited Schools: ${visitedSchools}`);
  console.log(`Remaining Unvisited: ${unvisitedSchools}`);
  console.log(`Total Visits Logged: ${totalVisits} (${firstVisits} first visits + ${revisits} revisits)`);
  console.log(`Completion %: ${((visitedSchools / totalSchools) * 100).toFixed(2)}%`);
  console.log(`Progress to 300: ${((visitedSchools / 300) * 100).toFixed(2)}% (${300 - visitedSchools} to go)`);

  console.log(`\n=== CHECKING ACTIVE ROUTES ===`);
  const routes = await prisma.routePlan.findMany({
    orderBy: { date: 'asc' },
    include: { stops: { include: { school: true } } }
  });
  for (const r of routes) {
    const visitedStops = r.stops.filter(s => s.school && s.school.visited_by_current_user);
    console.log(`Date: ${r.date} | Title: "${r.name || 'Route'}" | Stops: ${r.stops.length} | Status: ${r.status} | Visited Stops: ${visitedStops.length}`);
  }
}

checkState().catch(console.error).finally(() => prisma.$disconnect());
