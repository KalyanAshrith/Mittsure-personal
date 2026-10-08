import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function show() {
  const routes = await prisma.routePlan.findMany({
    orderBy: { date: 'asc' },
    include: {
      stops: {
        include: { school: true },
        orderBy: { optimized_sequence: 'asc' },
      },
    },
  });

  for (const r of routes) {
    console.log('\n======================================================');
    console.log(`DATE: ${r.date} | TITLE: ${r.name} | LOCKED: ${r.is_locked} | STOPS: ${r.stops.length}`);
    console.log(`Distance: ${r.total_distance_km} km | Time: ${r.total_duration_formatted}`);
    r.stops.forEach((st, idx) => {
      console.log(`  Stop #${idx + 1} (Seq ${st.optimized_sequence}): S.No ${st.school.s_no} - ${st.school.school_name} [${st.school.board}] (${st.school.area}) - Prog: ${st.school.recommended_programme}`);
    });
  }
}

show().catch(console.error).finally(() => prisma.$disconnect());
