const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function reset424() {
  await prisma.schoolVisit.deleteMany({
    where: { id: 'cmu6zso6a000114bk4jjowlli' }
  });
  await prisma.school.update({
    where: { s_no: 424 },
    data: {
      visit_status: 'NOT VISITED',
      visited_by_current_user: false,
      last_visit_date: null
    }
  });
  const visited = await prisma.school.count({ where: { visited_by_current_user: true } });
  console.log('Total Kalyan visited after resetting test visit on S.No 424:', visited);
}

reset424().catch(console.error).finally(() => prisma.$disconnect());
