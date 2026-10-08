import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function check() {
  const regVisits = await prisma.schoolVisit.count({
    where: {
      OR: [
        { outcome: { contains: 'Registration' } },
        { registration_status: { not: null } }
      ]
    }
  });
  const regSchools = await prisma.school.count({
    where: { visit_status: 'REGISTRATION' }
  });
  console.log('Registered visits count:', regVisits);
  console.log('Registered schools count:', regSchools);
}

check().catch(console.error).finally(() => prisma.$disconnect());
