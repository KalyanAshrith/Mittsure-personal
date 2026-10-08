import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    select: { id: true, s_no: true, school_name: true, area: true, district: true, address: true }
  });
  console.log('Total schools in DB:', schools.length);
  const areas = {};
  for (const s of schools) {
    const a = s.area || 'Unknown';
    areas[a] = (areas[a] || 0) + 1;
  }
  const sorted = Object.entries(areas).sort((a, b) => b[1] - a[1]);
  console.log('Unique areas:', sorted.length);
  console.log(sorted);
}

main().catch(console.error).finally(() => prisma.$disconnect());
