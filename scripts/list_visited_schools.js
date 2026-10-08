const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const visited = await prisma.school.findMany({
    where: { visited_by_current_user: true },
    orderBy: { s_no: 'asc' },
    select: { s_no: true, school_id: true, school_name: true, board: true, area: true }
  });

  console.log(`Total Visited by Current User: ${visited.length}`);
  visited.forEach(s => {
    console.log(`  S.No ${s.s_no} | ${s.school_id} | ${s.school_name} | ${s.board} | ${s.area}`);
  });
}

main().catch(console.error).finally(() => prisma.$disconnect());
