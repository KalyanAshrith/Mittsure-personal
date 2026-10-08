const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkLisa() {
  const lisa = await prisma.school.findFirst({
    where: { school_id: 'S-156401' },
    include: { visits: true }
  });
  console.log('Lisa school:', lisa.school_name, 'visited_by_current_user:', lisa.visited_by_current_user, 'visit_status:', lisa.visit_status);
  console.log('Lisa visits count:', lisa.visits.length);
  lisa.visits.forEach(v => {
    console.log('Visit:', v.id, v.visit_date, v.outcome, v.representative, v.notes);
  });
}

checkLisa().catch(console.error).finally(() => prisma.$disconnect());
