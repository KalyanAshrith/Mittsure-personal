import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

const targetSchools = [
  { partyId: 'S-18096', name: 'Dayananda Arya Vidya Public School-Mysuru', opp: 'B+' },
  { partyId: 'S-124332', name: 'Shashwatha Seva School', opp: 'B' },
  { partyId: 'S-124346', name: 'Sns School', opp: 'B' },
  { partyId: 'S-18132', name: 'Sree Natraja Public School-Mysuru', opp: 'B+' },
  { partyId: 'S-137127', name: 'Sri Ranga Gurukula', opp: 'B' },
  { partyId: 'S-116489', name: 'St Josephs Cbse School Hunsur', opp: 'A+' },
];

async function main() {
  for (const t of targetSchools) {
    const exactId = await prisma.school.findUnique({ where: { school_id: t.partyId } });
    console.log(t.partyId, t.name, '->', exactId ? `Found #${exactId.s_no} (${exactId.school_id}): ${exactId.school_name} | Area: ${exactId.area} | Visited: ${exactId.visit_status} | byCurrent: ${exactId.visited_by_current_user}` : 'NOT FOUND');
  }

  const plan = await prisma.routePlan.findFirst({
    where: { date: '2026-10-09' },
    include: { stops: { include: { school: true }, orderBy: { stop_number: 'asc' } } }
  });
  console.log('\nExisting Plan for 2026-10-09:', plan ? `${plan.name} (${plan.status}) with ${plan.stops.length} stops` : 'NONE');
  if (plan) {
    for (const st of plan.stops) {
      console.log(`  Stop #${st.stop_number}: #${st.school.s_no} ${st.school.school_name} (${st.school.school_id}) - ${st.status}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
