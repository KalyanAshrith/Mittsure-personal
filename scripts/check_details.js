const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkDetails() {
  // Check s_no 52
  const s52 = await prisma.school.findUnique({ where: { s_no: 52 } });
  console.log('S.No 52:', s52);

  // Search Sharada
  const sharadas = await prisma.school.findMany({
    where: { school_name: { contains: 'Sharada' } },
    select: { s_no: true, school_id: true, school_name: true, area: true }
  });
  console.log('\nSharada schools in DB:', sharadas);

  // Search Samsthe or Vidya Samsthe
  const samsthes = await prisma.school.findMany({
    where: { school_name: { contains: 'Samsthe' } },
    select: { s_no: true, school_id: true, school_name: true, area: true }
  });
  console.log('\nSamsthe schools in DB:', samsthes);

  // Search Metagalli or Metagere
  const meta = await prisma.school.findMany({
    where: {
      OR: [
        { school_name: { contains: 'Meta' } },
        { address: { contains: 'Meta' } },
        { area: { contains: 'Meta' } }
      ]
    },
    select: { s_no: true, school_id: true, school_name: true, area: true }
  });
  console.log('\nMeta schools in DB:', meta);
}

checkDetails().catch(console.error).finally(() => prisma['$disconnect']());
