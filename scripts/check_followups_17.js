const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const newSnos = [280, 329, 58, 1, 432, 244, 211, 404, 402, 107, 120, 84, 444, 254, 304, 102, 197];

async function checkFollowUps() {
  const fus = await prisma.followUp.findMany({
    where: { school: { s_no: { in: newSnos } } },
    include: { school: true }
  });

  console.log(`Found ${fus.length} follow-ups for the 17 schools:`);
  for (const f of fus) {
    console.log(`  S.No ${f.school.s_no} | ${f.school.school_name} | Due: ${f.due_date.toISOString().split('T')[0]} | Status: ${f.status} | Notes: ${f.notes}`);
  }
}

checkFollowUps().catch(console.error).finally(() => prisma['$disconnect']());
