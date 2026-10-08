import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function checkPlans() {
  const plans = await prisma.routePlan.findMany({
    where: { date: { gte: '2026-09-20' } },
    include: {
      stops: {
        include: { school: true }
      }
    },
    orderBy: { date: 'asc' }
  });

  console.log(`Plans from 2026-09-20 onwards: ${plans.length}`);
  plans.forEach(p => {
    console.log(`Plan ID: ${p.id} | Date: ${p.date} | Name: ${p.name} | Status: ${p.status} | Stops: ${p.stops.length}`);
    p.stops.forEach(s => {
      console.log(`   Stop #${s.optimized_sequence}: #${s.school?.s_no} ${s.school?.school_name} (${s.school?.school_id}) - ${s.status}`);
    });
  });
}

checkPlans().finally(() => prisma.$disconnect());
