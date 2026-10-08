const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const schools = await prisma.school.findMany({
    where: { area: 'Mysuru' },
    take: 15,
    select: { s_no: true, school_name: true, address: true }
  });
  schools.forEach(s => console.log(`S.No ${s.s_no} | ${s.school_name} | Address: ${s.address}`));
}

main().catch(console.error).finally(() => prisma.$disconnect());
