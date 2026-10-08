import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function listAllVisited() {
  const visited = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    orderBy: { s_no: 'asc' },
    select: {
      s_no: true,
      school_id: true,
      school_code: true,
      school_name: true,
      area: true,
      visit_status: true,
      last_visit_date: true,
      visits: {
        select: {
          visit_date: true,
          outcome: true,
          notes: true
        }
      }
    }
  });

  console.log(`Currently Visited Schools Count: ${visited.length}`);
  return visited;
}

listAllVisited().then(() => prisma.$disconnect());
