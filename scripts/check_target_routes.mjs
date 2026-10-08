import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const targetPartyIds = [
  'S-18139',  // St. Francis
  'S-131628', // Acme School
  'S-18132',  // Sree Natraja
  'S-148140', // Sai Gurukula
  'S-156403', // Smart School Junior
  'S-156334', // Buds House Of Montessori
  'S-145498', // Alpha Benaka Kids
  'S-18142'   // St. Josephs Central School
];

async function checkRoutes() {
  const schools = await prisma.school.findMany({
    where: { school_id: { in: targetPartyIds } },
    include: {
      route_stops: {
        include: { route_plan: true }
      }
    }
  });

  console.log(`Found ${schools.length} schools:`);
  for (const s of schools) {
    console.log(`#${s.s_no} ${s.school_name} (${s.school_id}) - Stops: ${s.route_stops.length}`);
    s.route_stops.forEach(rs => {
      console.log(`  Stop in plan ${rs.route_plan?.date} (${rs.route_plan?.name}) - Status: ${rs.status}`);
    });
  }
}

checkRoutes().finally(() => prisma.$disconnect());
