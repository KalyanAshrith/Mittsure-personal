import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function inspect() {
  const plans = await prisma.routePlan.findMany({
    where: { date: { in: ['2026-09-07', '2026-09-08'] } },
    include: {
      stops: {
        include: { school: true },
        orderBy: { optimized_sequence: 'asc' },
      },
    },
    orderBy: { date: 'asc' },
  });

  for (const p of plans) {
    console.log(`\n========================================`);
    console.log(`Plan Date: ${p.date} | Name: ${p.name} | Locked: ${p.is_locked}`);
    console.log(`Total Distance: ${p.total_distance_km} km | Travel Time: ${p.total_duration_formatted}`);
    console.log(`Stops (${p.stops.length}):`);
    p.stops.forEach((st) => {
      console.log(`  Stop #${st.optimized_sequence} • S.No. ${st.school.s_no} • ${st.school.school_name} (${st.school.area}) - ${st.school.recommended_programme}`);
    });
  }

  await prisma.$disconnect();
}

inspect().catch(console.error);
