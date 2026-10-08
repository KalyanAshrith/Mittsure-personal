import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findCandidates() {
  const currentStops = [205, 157, 67, 329, 254];
  console.log("Current 5 schools from screenshot:", currentStops);

  const candidates = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      s_no: { notIn: currentStops },
      area: { in: ['Kuvempunagar', 'Saraswathipuram', 'Ramakrishna Nagar', 'Mysuru'] }
    },
    select: {
      s_no: true,
      school_id: true,
      school_name: true,
      board: true,
      school_type: true,
      area: true,
      latitude: true,
      longitude: true
    }
  });

  console.log(`Found ${candidates.length} unvisited candidate schools in cluster:`);
  candidates.slice(0, 15).forEach(c => {
    console.log(`  S.No ${c.s_no} | ${c.school_id} | ${c.school_name} | ${c.board} | ${c.school_type} | ${c.area}`);
  });
}

findCandidates().catch(console.error).finally(() => prisma.$disconnect());
