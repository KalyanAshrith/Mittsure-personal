import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkDetails() {
  const snos = [388, 244, 277, 113, 211, 372];
  const schools = await prisma.school.findMany({
    where: { s_no: { in: snos } }
  });
  schools.forEach(s => {
    console.log(`S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | ${s.board} | ${s.school_type} | ${s.address} | Lat: ${s.latitude}, Lng: ${s.longitude}`);
  });
}

checkDetails().catch(console.error).finally(() => prisma.$disconnect());
