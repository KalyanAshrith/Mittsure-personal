const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkGokula() {
  const gokulas = await prisma.school.findMany({
    where: { school_name: { contains: 'Gokul' } },
    select: { s_no: true, school_id: true, school_name: true, area: true, visited_by_current_user: true }
  });
  console.log('Gokula schools:', gokulas);
}

checkGokula().catch(console.error).finally(() => prisma['$disconnect']());
