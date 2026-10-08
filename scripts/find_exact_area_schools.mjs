import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function findInExactAreas() {
  const currentStops = [205, 157, 67, 329, 254];
  const schools = await prisma.school.findMany({
    where: {
      visited_by_current_user: false,
      s_no: { notIn: currentStops },
      area: { in: ['Kuvempunagar', 'Saraswathipuram', 'Ramakrishna Nagar'] }
    },
    select: {
      s_no: true,
      school_id: true,
      school_name: true,
      board: true,
      school_type: true,
      area: true,
      category: true,
      priority: true
    }
  });

  console.log(`Found ${schools.length} schools in exact areas:`);
  schools.forEach(s => {
    console.log(`  S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | Board: ${s.board} | Type: ${s.school_type} | Area: ${s.area}`);
  });
}

findInExactAreas().catch(console.error).finally(() => prisma.$disconnect());
