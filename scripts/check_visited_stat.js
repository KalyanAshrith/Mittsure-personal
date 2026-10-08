const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const c1 = await prisma.school.count({ where: { visited_by_current_user: true } });
  const c2 = await prisma.school.count({ where: { visit_status: 'VISITED' } });
  const c3 = await prisma.school.count({ where: { OR: [{ visited_by_current_user: true }, { visit_status: 'VISITED' }] } });
  const activeVisited = await prisma.school.count({ where: { status: 'ACTIVE', OR: [{ visited_by_current_user: true }, { visit_status: 'VISITED' }] } });
  console.log(`visited_by_current_user: ${c1}, visit_status VISITED: ${c2}, OR: ${c3}, activeVisited: ${activeVisited}`);

  // What about schools with visit_status !== 'NOT VISITED'?
  const nonNotVisited = await prisma.school.count({ where: { visit_status: { not: 'NOT VISITED' } } });
  console.log(`visit_status != NOT VISITED: ${nonNotVisited}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
