const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newSnos = [280, 329, 58, 1, 432, 244, 211, 404, 402, 107, 120, 84, 444, 254, 304, 102, 197];

async function checkRouteStops() {
  const stops = await prisma.routeStop.findMany({
    where: { school: { s_no: { in: newSnos } } },
    include: { route_plan: true, school: true }
  });

  console.log(`Found ${stops.length} route stops for the 17 schools:`);
  for (const st of stops) {
    console.log(`  Plan Date: ${st.route_plan.date} (${st.route_plan.name}) | Stop #${st.stop_number} | S.No ${st.school.s_no} - ${st.school.school_name} | Status: ${st.status}`);
  }
}

checkRouteStops().catch(console.error).finally(() => prisma['$disconnect']());
