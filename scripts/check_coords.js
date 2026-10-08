const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const snos = [305, 364, 395, 372, 65, 332, 247, 241, 74, 85, 428, 412, 331, 72, 223, 258, 471, 472, 198, 205];
  const schools = await prisma.school.findMany({
    where: { s_no: { in: snos } },
    select: { s_no: true, school_name: true, area: true, address: true, latitude: true, longitude: true }
  });

  schools.forEach(s => {
    console.log(`S.No ${s.s_no} | ${s.school_name} | Area: ${s.area} | Lat: ${s.latitude} | Lng: ${s.longitude} | Address: ${s.address}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
