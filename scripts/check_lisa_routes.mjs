import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function run() {
  const school = await prisma.school.findFirst({
    where: { school_id: 'S-156401' }
  });
  console.log('School:', school?.id, school?.school_name, school?.visit_status);
  const routeStops = await prisma.routeStop.findMany({
    where: { school_id: school?.id },
    include: { route_plan: true }
  });
  console.log('Route stops count:', routeStops.length);
  routeStops.forEach(rs => {
    console.log('Route Stop:', rs.id, 'Plan Date:', rs.route_plan?.date, 'Status:', rs.status);
  });

  const totalVisited = await prisma.school.count({
    where: { visited_by_current_user: true }
  });
  const totalSchools = await prisma.school.count();
  console.log(`Current Visited: ${totalVisited}/${totalSchools}`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
