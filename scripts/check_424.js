const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check424() {
  const sc = await prisma.school.findFirst({
    where: { s_no: 424 },
    include: { visits: true }
  });
  console.log(sc.school_name, sc.visited_by_current_user);
  sc.visits.forEach(v => console.log(v.id, v.visit_date, v.outcome, v.notes));
}

check424().catch(console.error).finally(() => prisma.$disconnect());
